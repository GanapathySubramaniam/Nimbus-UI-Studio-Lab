import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  validateCommitMessages,
  validateFindingStatus,
  validateLiveRepositorySettings,
  validatePullRequestBody,
  validateRepositoryPolicy,
} from "./governance.mjs";

const validPolicy = {
  schemaVersion: "1.0.0",
  repository: "GanapathySubramaniam/Nimbus-UI-Studio-Lab",
  visibility: "public",
  defaultBranch: "main",
  lifecycle: {
    activePhase: "bootstrap",
    stableReleaseRequiresPhase: "stableRelease",
  },
  mergePolicy: {
    allowSquashMerge: true,
    allowMergeCommit: false,
    allowRebaseMerge: false,
    deleteBranchOnMerge: true,
    linearHistory: true,
  },
  branchProtection: {
    bootstrap: {
      requiredApprovingReviews: 0,
      requiredStatusChecks: ["validate"],
      dismissStaleReviews: false,
      requireCodeOwnerReviews: false,
      requireLastPushApproval: false,
      requireConversationResolution: true,
      allowForcePushes: false,
      allowDeletions: false,
      enforceForAdministrators: false,
    },
    stableRelease: {
      requiredApprovingReviews: 1,
      requiredStatusChecks: ["validate"],
      dismissStaleReviews: true,
      requireCodeOwnerReviews: true,
      requireLastPushApproval: true,
      requireConversationResolution: true,
      allowForcePushes: false,
      allowDeletions: false,
      enforceForAdministrators: true,
    },
  },
  security: {
    secretScanning: "required",
    secretScanningPushProtection: "required",
    privateVulnerabilityReporting: "required-before-stable-release",
    dependencyReview: "required-when-package-manifests-exist",
    automatedDependencyUpdates: "required-when-package-manifests-exist",
  },
  changeControl: {
    issueRequired: true,
    dedicatedBranchRequired: true,
    pullRequestRequired: true,
    signedOffCommits: {
      status: "required-now",
      check: "governance / validate",
    },
    issueClosingReference: {
      status: "required-now",
      check: "governance / validate",
    },
    publicContractArtifacts: {
      status: "required-when-public-packages-exist",
      changesetTool: "@changesets/cli",
      apiReportTool: "@microsoft/api-extractor",
      paths: ["packages/*/src/index.ts", "packages/*/src/index.tsx"],
    },
  },
  aiReview: {
    implementationAgent: "codex",
    functionalValidationModel: "antigravity-claude",
    qualitySecurityModel: "antigravity-gemini-pro",
    reviewModelsMayWriteImplementation: false,
    findingGate: {
      status: "required-for-classified-changes",
      check: "ai-review / findings-resolved",
      exactCommitRequired: true,
      revalidationRequired: true,
    },
  },
};

test("accepts an explicitly phased repository policy", () => {
  assert.deepEqual(validateRepositoryPolicy(validPolicy), []);
});

test("rejects a stable policy that permits zero approving reviews", () => {
  const policy = structuredClone(validPolicy);
  policy.branchProtection.stableRelease.requiredApprovingReviews = 0;

  assert.deepEqual(validateRepositoryPolicy(policy), [
    "branchProtection.stableRelease.requiredApprovingReviews must be at least 1",
  ]);
});

test("rejects unknown top-level policy properties", () => {
  const policy = { ...validPolicy, ambiguousSetting: true };

  assert.deepEqual(validateRepositoryPolicy(policy), [
    "unknown top-level property: ambiguousSetting",
  ]);
});

test("rejects a pull request body without a closing issue reference", () => {
  assert.deepEqual(validatePullRequestBody("Related to #12"), [
    "pull request body must close a local issue with Closes, Fixes, or Resolves",
  ]);
});

test("accepts a pull request body with a local closing reference", () => {
  assert.deepEqual(validatePullRequestBody("Closes #12"), []);
});

test("rejects every commit that lacks a Signed-off-by trailer", () => {
  assert.deepEqual(
    validateCommitMessages([
      { sha: "abc", message: "feat: unsigned" },
      {
        sha: "def",
        message:
          "feat: signed\n\nSigned-off-by: Nimbus Contributor <contributor@example.test>",
      },
    ]),
    ["commit abc is missing a valid Signed-off-by trailer"],
  );
});

test("blocks an unresolved high-severity finding", () => {
  assert.deepEqual(
    validateFindingStatus({
      headSha: "fixing-sha",
      findings: [
        {
          severity: "high",
          state: "open",
          reviewedCommit: "source-sha",
          revalidatedCommit: null,
        },
      ],
    }),
    ["open high finding for source-sha blocks this change"],
  );
});

test("requires resolved findings to be revalidated against the head commit", () => {
  assert.deepEqual(
    validateFindingStatus({
      headSha: "fixing-sha",
      findings: [
        {
          severity: "high",
          state: "closed",
          reviewedCommit: "source-sha",
          revalidatedCommit: "older-fix",
        },
      ],
    }),
    ["high finding for source-sha was not revalidated against fixing-sha"],
  );
});

test("accepts a resolved finding revalidated against the head commit", () => {
  assert.deepEqual(
    validateFindingStatus({
      headSha: "fixing-sha",
      findings: [
        {
          severity: "high",
          state: "closed",
          reviewedCommit: "source-sha",
          revalidatedCommit: "fixing-sha",
        },
      ],
    }),
    [],
  );
});

test("reports malformed finding ledgers without throwing", () => {
  assert.deepEqual(
    validateFindingStatus({ headSha: "fixing-sha", findings: null }),
    ["findings must be an array"],
  );
  assert.deepEqual(
    validateFindingStatus({ headSha: "fixing-sha" }),
    ["findings must be an array"],
  );
});

test("manual bootstrap dispatch executes a live bootstrap audit", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/repository-governance.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /^  bootstrap:/m);
  assert.match(
    workflow,
    /github\.event_name == 'workflow_dispatch' && inputs\.phase == 'bootstrap'/,
  );
  assert.match(
    workflow,
    /governance\.mjs live .* bootstrap/,
  );
});

test("live audits use effective branch rules without repository secrets", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/repository-governance.yml", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /NIMBUS_GOVERNANCE_TOKEN/);
  assert.equal(workflow.match(/rules\/branches\/main/g)?.length, 2);
  assert.equal(
    workflow.match(/GH_TOKEN:\s*\$\{\{ github\.token \}\}/g)?.length,
    3,
  );
});

test("blocks stable release while effective rules still match bootstrap", () => {
  assert.deepEqual(
    validateLiveRepositorySettings({
      policy: validPolicy,
      phase: "stableRelease",
      repository: {
        allow_squash_merge: true,
        allow_merge_commit: false,
        allow_rebase_merge: false,
        delete_branch_on_merge: true,
      },
      rules: [
        {
          type: "pull_request",
          parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
          allowed_merge_methods: ["squash"],
          },
        },
        { type: "required_linear_history" },
        { type: "non_fast_forward" },
        { type: "deletion" },
        {
          type: "required_status_checks",
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: [{ context: "validate" }],
          },
        },
      ],
    }),
    [
      "stableRelease requires at least 1 approving review",
      "stableRelease requires code-owner review",
      "stableRelease requires latest-push approval",
    ],
  );
});

test("accepts effective rules that meet the stable release phase", () => {
  assert.deepEqual(
    validateLiveRepositorySettings({
      policy: validPolicy,
      phase: "stableRelease",
      repository: {
        allow_squash_merge: true,
        allow_merge_commit: false,
        allow_rebase_merge: false,
        delete_branch_on_merge: true,
      },
      rules: [
        {
          type: "pull_request",
          parameters: {
          required_approving_review_count: 1,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: true,
          require_last_push_approval: true,
          required_review_thread_resolution: true,
          allowed_merge_methods: ["squash"],
          },
        },
        { type: "required_linear_history" },
        { type: "non_fast_forward" },
        { type: "deletion" },
        {
          type: "required_status_checks",
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: [{ context: "validate" }],
          },
        },
      ],
    }),
    [],
  );
});

test("rejects effective rules that omit a required status check", () => {
  const errors = validateLiveRepositorySettings({
    policy: validPolicy,
    phase: "bootstrap",
    repository: {
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      delete_branch_on_merge: true,
    },
    rules: [
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
          allowed_merge_methods: ["squash"],
        },
      },
      { type: "required_linear_history" },
      { type: "non_fast_forward" },
      { type: "deletion" },
    ],
  });

  assert.ok(errors.includes("bootstrap requires status check validate"));
  assert.ok(errors.includes("bootstrap requires strict status checks"));
});
