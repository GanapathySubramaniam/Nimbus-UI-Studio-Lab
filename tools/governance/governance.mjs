import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const topLevelPolicyProperties = new Set([
  "$schema",
  "schemaVersion",
  "repository",
  "visibility",
  "defaultBranch",
  "lifecycle",
  "mergePolicy",
  "branchProtection",
  "security",
  "changeControl",
  "aiReview",
]);

const phases = new Set(["bootstrap", "stableRelease"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireBoolean(errors, value, path) {
  if (typeof value !== "boolean") errors.push(`${path} must be a boolean`);
}

export function validateRepositoryPolicy(policy) {
  if (!isObject(policy)) return ["repository policy must be an object"];

  const errors = [];
  for (const key of Object.keys(policy)) {
    if (!topLevelPolicyProperties.has(key)) {
      errors.push(`unknown top-level property: ${key}`);
    }
  }

  if (!/^\d+\.\d+\.\d+$/.test(policy.schemaVersion ?? "")) {
    errors.push("schemaVersion must be a semantic version");
  }
  if (typeof policy.repository !== "string" || !policy.repository.includes("/")) {
    errors.push("repository must be an owner/name string");
  }
  if (!phases.has(policy.lifecycle?.activePhase)) {
    errors.push("lifecycle.activePhase must be bootstrap or stableRelease");
  }
  if (policy.lifecycle?.stableReleaseRequiresPhase !== "stableRelease") {
    errors.push("lifecycle.stableReleaseRequiresPhase must be stableRelease");
  }

  for (const phase of phases) {
    const settings = policy.branchProtection?.[phase];
    if (!isObject(settings)) {
      errors.push(`branchProtection.${phase} must be an object`);
      continue;
    }
    if (!Number.isInteger(settings.requiredApprovingReviews) || settings.requiredApprovingReviews < 0) {
      errors.push(`branchProtection.${phase}.requiredApprovingReviews must be a non-negative integer`);
    }
    for (const key of [
      "dismissStaleReviews",
      "requireCodeOwnerReviews",
      "requireLastPushApproval",
      "requireConversationResolution",
      "allowForcePushes",
      "allowDeletions",
      "enforceForAdministrators",
    ]) {
      requireBoolean(errors, settings[key], `branchProtection.${phase}.${key}`);
    }
  }

  if ((policy.branchProtection?.stableRelease?.requiredApprovingReviews ?? 0) < 1) {
    errors.push("branchProtection.stableRelease.requiredApprovingReviews must be at least 1");
  }
  if (policy.aiReview?.reviewModelsMayWriteImplementation !== false) {
    errors.push("aiReview.reviewModelsMayWriteImplementation must be false");
  }

  return errors;
}

export function validatePullRequestBody(body) {
  const closingReference = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+\b/i;
  return closingReference.test(body ?? "")
    ? []
    : ["pull request body must close a local issue with Closes, Fixes, or Resolves"];
}

export function validateCommitMessages(commits) {
  const trailer = /^Signed-off-by:\s+.+\s+<[^<>\s]+@[^<>\s]+>\s*$/im;
  return commits.flatMap(({ sha, message }) =>
    trailer.test(message ?? "")
      ? []
      : [`commit ${sha} is missing a valid Signed-off-by trailer`],
  );
}

export function validateFindingStatus({ headSha, findings }) {
  return findings.flatMap((finding) => {
    const severity = String(finding.severity ?? "").toLowerCase();
    if (!new Set(["blocker", "high"]).has(severity)) return [];
    if (finding.state === "open") {
      return [`open ${severity} finding for ${finding.reviewedCommit} blocks this change`];
    }
    if (finding.revalidatedCommit !== headSha) {
      return [
        `${severity} finding for ${finding.reviewedCommit} was not revalidated against ${headSha}`,
      ];
    }
    return [];
  });
}

function booleanSetting(value) {
  return typeof value === "object" && value !== null ? value.enabled : value;
}

export function validateLiveRepositorySettings({ policy, phase, repository, protection }) {
  const expected = policy.branchProtection[phase];
  const actualReviews = protection.required_pull_request_reviews ?? {};
  const checks = [
    [repository.allow_squash_merge, policy.mergePolicy.allowSquashMerge, "squash merge setting"],
    [repository.allow_merge_commit, policy.mergePolicy.allowMergeCommit, "merge commit setting"],
    [repository.allow_rebase_merge, policy.mergePolicy.allowRebaseMerge, "rebase merge setting"],
    [repository.delete_branch_on_merge, policy.mergePolicy.deleteBranchOnMerge, "branch deletion after merge setting"],
    [booleanSetting(protection.required_linear_history), policy.mergePolicy.linearHistory, "linear history setting"],
    [booleanSetting(protection.required_conversation_resolution), expected.requireConversationResolution, `${phase} conversation resolution`],
    [booleanSetting(protection.allow_force_pushes), expected.allowForcePushes, `${phase} force-push policy`],
    [booleanSetting(protection.allow_deletions), expected.allowDeletions, `${phase} branch deletion policy`],
  ];
  const errors = checks.flatMap(([actual, wanted, label]) =>
    actual === wanted ? [] : [`${label} must be ${wanted}`],
  );

  if ((actualReviews.required_approving_review_count ?? 0) < expected.requiredApprovingReviews) {
    errors.push(`${phase} requires at least ${expected.requiredApprovingReviews} approving review${expected.requiredApprovingReviews === 1 ? "" : "s"}`);
  }
  if (expected.dismissStaleReviews && !actualReviews.dismiss_stale_reviews) {
    errors.push(`${phase} requires stale review dismissal`);
  }
  if (expected.requireCodeOwnerReviews && !actualReviews.require_code_owner_reviews) {
    errors.push(`${phase} requires code-owner review`);
  }
  if (expected.requireLastPushApproval && !actualReviews.require_last_push_approval) {
    errors.push(`${phase} requires latest-push approval`);
  }
  if (expected.enforceForAdministrators && !booleanSetting(protection.enforce_admins)) {
    errors.push(`${phase} requires administrator enforcement`);
  }
  return errors;
}

function failOnErrors(errors) {
  if (errors.length === 0) return;
  for (const error of errors) console.error(`governance: ${error}`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function runCli() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "policy") {
    failOnErrors(validateRepositoryPolicy(readJson(args[0])));
    return;
  }
  if (command === "pr-event") {
    failOnErrors(validatePullRequestBody(readJson(args[0]).pull_request?.body));
    return;
  }
  if (command === "commits") {
    const commits = readJson(args[0]).map((commit) => ({
      sha: commit.sha,
      message: commit.commit?.message ?? commit.message,
    }));
    failOnErrors(validateCommitMessages(commits));
    return;
  }
  if (command === "live") {
    failOnErrors(
      validateLiveRepositorySettings({
        policy: readJson(args[0]),
        repository: readJson(args[1]),
        protection: readJson(args[2]),
        phase: args[3],
      }),
    );
    return;
  }
  throw new Error("usage: governance.mjs policy|pr-event|commits|live [...arguments]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}

