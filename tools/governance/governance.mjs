import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const topLevelPolicyProperties = new Set([
  "$schema",
  "schemaVersion",
  "repository",
  "visibility",
  "defaultBranch",
  "ruleset",
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
  if (!Number.isInteger(policy.ruleset?.id) || policy.ruleset.id < 1) {
    errors.push("ruleset.id must be a positive integer");
  }
  if (typeof policy.ruleset?.name !== "string" || policy.ruleset.name.length === 0) {
    errors.push("ruleset.name must be a non-empty string");
  }
  if (policy.ruleset?.targetRef !== "refs/heads/main") {
    errors.push("ruleset.targetRef must be refs/heads/main");
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
    if (!Array.isArray(settings.requiredStatusChecks) || settings.requiredStatusChecks.length === 0) {
      errors.push(`branchProtection.${phase}.requiredStatusChecks must be a non-empty array`);
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
  if (!Array.isArray(findings)) return ["findings must be an array"];

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

export function validateLiveRepositorySettings({ policy, phase, repository, rules }) {
  const expected = policy.branchProtection[phase];
  const activeRules = Array.isArray(rules) ? rules : [];
  const ruleTypes = new Set(activeRules.map((rule) => rule.type));
  const pullRequest = activeRules.find((rule) => rule.type === "pull_request")?.parameters ?? {};
  const statusChecks = activeRules.find((rule) => rule.type === "required_status_checks")?.parameters ?? {};
  const requiredContexts = new Set(
    (statusChecks.required_status_checks ?? []).map((check) => check.context),
  );
  const checks = [
    [repository.allow_squash_merge, policy.mergePolicy.allowSquashMerge, "squash merge setting"],
    [repository.allow_merge_commit, policy.mergePolicy.allowMergeCommit, "merge commit setting"],
    [repository.allow_rebase_merge, policy.mergePolicy.allowRebaseMerge, "rebase merge setting"],
    [repository.delete_branch_on_merge, policy.mergePolicy.deleteBranchOnMerge, "branch deletion after merge setting"],
    [ruleTypes.has("required_linear_history"), policy.mergePolicy.linearHistory, "linear history rule"],
    [pullRequest.required_review_thread_resolution, expected.requireConversationResolution, `${phase} conversation resolution`],
    [!ruleTypes.has("non_fast_forward"), expected.allowForcePushes, `${phase} force-push policy`],
    [!ruleTypes.has("deletion"), expected.allowDeletions, `${phase} branch deletion policy`],
  ];
  const errors = checks.flatMap(([actual, wanted, label]) =>
    actual === wanted ? [] : [`${label} must be ${wanted}`],
  );

  if ((pullRequest.required_approving_review_count ?? 0) < expected.requiredApprovingReviews) {
    errors.push(`${phase} requires at least ${expected.requiredApprovingReviews} approving review${expected.requiredApprovingReviews === 1 ? "" : "s"}`);
  }
  if (expected.dismissStaleReviews && !pullRequest.dismiss_stale_reviews_on_push) {
    errors.push(`${phase} requires stale review dismissal`);
  }
  if (expected.requireCodeOwnerReviews && !pullRequest.require_code_owner_review) {
    errors.push(`${phase} requires code-owner review`);
  }
  if (expected.requireLastPushApproval && !pullRequest.require_last_push_approval) {
    errors.push(`${phase} requires latest-push approval`);
  }
  if (!pullRequest.allowed_merge_methods?.includes("squash")) {
    errors.push(`${phase} requires squash as an allowed pull-request merge method`);
  }
  for (const context of expected.requiredStatusChecks) {
    if (!requiredContexts.has(context)) {
      errors.push(`${phase} requires status check ${context}`);
    }
  }
  if (!statusChecks.strict_required_status_checks_policy) {
    errors.push(`${phase} requires strict status checks`);
  }
  return errors;
}

export function validateRulesetAdministration({ policy, phase, ruleset }) {
  const errors = [];
  if (ruleset?.id !== policy.ruleset.id) errors.push(`ruleset id must be ${policy.ruleset.id}`);
  if (ruleset?.name !== policy.ruleset.name) errors.push(`ruleset name must be ${policy.ruleset.name}`);
  if (ruleset?.enforcement !== "active") errors.push("ruleset enforcement must be active");
  if (!ruleset?.conditions?.ref_name?.include?.includes(policy.ruleset.targetRef)) {
    errors.push(`ruleset must include ${policy.ruleset.targetRef}`);
  }
  if (!Array.isArray(ruleset?.bypass_actors)) {
    errors.push("authenticated ruleset response must expose bypass actors");
  } else if (
    policy.branchProtection[phase].enforceForAdministrators &&
    ruleset.bypass_actors.length > 0
  ) {
    errors.push(`${phase} prohibits ruleset bypass actors`);
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
        rules: readJson(args[2]),
        phase: args[3],
      }),
    );
    return;
  }
  if (command === "ruleset") {
    failOnErrors(
      validateRulesetAdministration({
        policy: readJson(args[0]),
        ruleset: readJson(args[1]),
        phase: args[2],
      }),
    );
    return;
  }
  throw new Error("usage: governance.mjs policy|pr-event|commits|live|ruleset [...arguments]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
