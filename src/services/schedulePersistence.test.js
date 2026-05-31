import test from "node:test";
import assert from "node:assert/strict";
import { resolveScheduleSaveOutcome } from "./schedulePersistence.js";

test("returns success only when backend confirms save", () => {
  const outcome = resolveScheduleSaveOutcome({
    status: "success",
    saved: true,
    id: "SCHED-123",
    message: "Scheduled Successfully!",
    scheduled: { schedule_id: "SCHED-123" },
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.message, "Scheduled Successfully!");
  assert.equal(outcome.scheduledItem.schedule_id, "SCHED-123");
});

test("returns save failed when backend persistence is not confirmed", () => {
  const outcome = resolveScheduleSaveOutcome({
    status: "error",
    message: "Failed to save schedule",
  });

  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, "Failed to save schedule");
  assert.equal(outcome.scheduledItem, null);
});
