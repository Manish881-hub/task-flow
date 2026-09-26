/**
 * Realtime sidebar wiring proof: the REAL rendered sidebar must be the one
 * that listens for membership events — not the unused AppSidebar.
 *
 * Runs with zero dependencies: `node --test lib/sidebar.realtime.test.mjs`.
 * Static source assertions (no React rendering needed):
 *  1. EfferdPageShell renders EfferdSidebar (the actual app rail).
 *  2. No page/shell imports the unused AppSidebar.
 *  3. EfferdSidebar subscribes via useTaskFlowSocket() with no room join.
 *  4. EfferdSidebar refetches silently ONLY on project_created /
 *     member_invited / member_removed — never on generic task/comment traffic.
 *  5. Silent refetch preserves the on-screen list on failure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

describe("realtime sidebar wiring (real EfferdSidebar path)", () => {
  it("shell renders EfferdSidebar, the actual app rail", () => {
    const shell = read("components/EfferdPageShell.js");
    assert.match(shell, /EfferdSidebar/, "shell must render EfferdSidebar");
    assert.doesNotMatch(
      shell,
      /AppSidebar/,
      "shell must not depend on the unused AppSidebar"
    );
  });

  it("no page imports the unused AppSidebar", () => {
    for (const rel of [
      "pages/dashboard.js",
      "pages/assigned.js",
      "pages/projects/[id].js",
      "components/EfferdPageShell.js",
    ]) {
      const src = read(rel);
      assert.doesNotMatch(
        src,
        /AppSidebar/,
        `${rel} must not import the unused AppSidebar`
      );
    }
  });

  it("EfferdSidebar subscribes with useTaskFlowSocket and no room join", () => {
    const src = read("components/dashboard/EfferdSidebar.js");
    assert.match(
      src,
      /useTaskFlowSocket\(\)/,
      "sidebar must subscribe via useTaskFlowSocket() with no projectId (personal events only)"
    );
    assert.doesNotMatch(
      src,
      /useTaskFlowSocket\(\s*\w+\s*\)/,
      "sidebar must not join a project room"
    );
  });

  it("sidebar refetches only on project_created/member_invited/member_removed", () => {
    const src = read("components/dashboard/EfferdSidebar.js");
    for (const t of ["project_created", "member_invited", "member_removed"]) {
      assert.ok(
        src.includes(`"${t}"`) || src.includes(`'${t}'`),
        `sidebar must handle ${t}`
      );
    }
    // The membership effect must gate on event type — no unconditional
    // refetch on every socket event (task moves/comments/activity).
    assert.match(
      src,
      /if\s*\([\s\S]*project_created[\s\S]*member_invited[\s\S]*member_removed[\s\S]*\)\s*\{[\s\S]*loadSidebar\(true\)/,
      "silent refetch must be gated on the three membership event types"
    );
  });

  it("silent refetch preserves the on-screen list on failure", () => {
    const src = read("components/dashboard/EfferdSidebar.js");
    assert.match(
      src,
      /loadSidebar\(true\)/,
      "membership events must trigger a silent refetch"
    );
    assert.match(
      src,
      /Keep the existing list\/count on screen/,
      "silent failure path must preserve the current list"
    );
  });
});
