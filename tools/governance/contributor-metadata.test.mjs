import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("repository metadata declares every implementation milestone", () => {
  const metadata = JSON.parse(read(".github/repository-metadata.json"));

  assert.equal(metadata.schemaVersion, "1.0.0");
  assert.deepEqual(
    metadata.milestones.map(({ title }) => title),
    [
      "M0 — GitHub and governance",
      "M1 — Workspace and contracts",
      "M2 — Tokens and primitives",
      "M3 — Studio and workbench",
      "M4 — Forms, data, media, sandbox",
      "M5 — Auth and enterprise shell",
      "M6 — Agent conversation and runs",
      "M7 — Agent platform and admin",
      "M8 — Protocol adapters",
      "M9 — PWA, locales, docs",
      "M10 — Validation, 1.0, Sites",
    ],
  );
});

test("repository metadata declares required workflow labels", () => {
  const metadata = JSON.parse(read(".github/repository-metadata.json"));
  const names = new Set(metadata.labels.map(({ name }) => name));

  for (const name of [
    "epic", "feature", "bug", "ai-found", "architecture", "governance", "public-api",
    "accessibility", "security", "performance", "localization", "testing",
    "release", "sites", "protocol", "experimental", "antigravity-claude",
    "antigravity-gemini", "severity:blocker", "severity:high", "severity:medium",
    "severity:low",
  ]) {
    assert.ok(names.has(name), `missing required label ${name}`);
  }
});

test("issue forms capture complete delivery and AI finding evidence", () => {
  const task = JSON.parse(read(".github/ISSUE_TEMPLATE/task.yml"));
  const finding = JSON.parse(read(".github/ISSUE_TEMPLATE/ai-finding.yml"));
  const feature = JSON.parse(read(".github/ISSUE_TEMPLATE/feature.yml"));
  const bug = JSON.parse(read(".github/ISSUE_TEMPLATE/bug.yml"));

  const ids = (form) => new Set(form.body.map(({ id }) => id).filter(Boolean));

  for (const field of [
    "outcome", "ownership", "states", "responsive", "accessibility", "security",
    "api", "tests", "documentation", "acceptance",
  ]) assert.ok(ids(task).has(field), `task form is missing ${field}`);

  for (const field of [
    "source", "commit", "severity", "evidence", "impact", "resolution",
    "tests", "fingerprint",
  ]) assert.ok(ids(finding).has(field), `AI finding form is missing ${field}`);

  const findingLabels = []
    .concat(finding.labels ?? [])
    .flatMap((label) => String(label).split(","))
    .map((label) => String(label).trim().toLowerCase());
  assert.equal(findingLabels.includes("ai-found"), false);
  for (const field of ["outcome", "scope", "states", "responsive", "accessibility", "security", "api", "tests", "documentation"]) {
    assert.ok(ids(feature).has(field), `feature form is missing ${field}`);
  }
  for (const field of ["description", "reproduction", "expected", "environment", "evidence", "states", "quality", "regression"]) {
    assert.ok(ids(bug).has(field), `bug form is missing ${field}`);
  }
});

test("workflow names every required governance test explicitly", () => {
  const workflow = read(".github/workflows/repository-governance.yml");
  const command = "node --test tools/governance/governance.test.mjs tools/governance/contributor-metadata.test.mjs";

  assert.equal(workflow.split(command).length - 1, 3);
  assert.doesNotMatch(workflow, /tools\/governance\/\*\.test\.mjs/);
});

test("pull request template records every release-impact dimension", () => {
  const template = read(".github/pull_request_template.md");

  for (const phrase of [
    "Closes #", "Public API", "Accessibility", "Security", "Responsive",
    "Performance", "Localization", "Documentation", "Antigravity Claude",
    "Antigravity Gemini Pro", "exact verified commit",
  ]) assert.ok(template.includes(phrase), `missing PR prompt: ${phrase}`);
});
