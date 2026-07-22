import assert from "node:assert/strict";
import test from "node:test";
import { assertContestSubmission, assertContestVote, getContestWindow, selectContestPrompt, selectWinner } from "../lib/contest-rules.ts";

test("a Chicago contest accepts submissions only on its calendar date and voting for two more days", () => {
  const window = getContestWindow("2026-07-08");

  assert.equal(window.submissionsOpenAt.toISOString(), "2026-07-08T05:00:00.000Z");
  assert.equal(window.submissionsCloseAt.toISOString(), "2026-07-09T05:00:00.000Z");
  assert.equal(window.votingCloseAt.toISOString(), "2026-07-11T05:00:00.000Z");
});

test("contest submissions require 100 words and an open submission window", () => {
  assert.throws(
    () => assertContestSubmission({ now: new Date("2026-07-08T12:00:00Z"), wordCount: 99, window: getContestWindow("2026-07-08") }),
    /at least 100 words/
  );
  assert.throws(
    () => assertContestSubmission({ now: new Date("2026-07-09T05:00:00Z"), wordCount: 100, window: getContestWindow("2026-07-08") }),
    /closed/
  );
});

test("voting rejects self-votes and NSFW votes without the contest preference", () => {
  const base = {
    entryStatus: "ACTIVE" as const,
    now: new Date("2026-07-09T12:00:00Z"),
    votingCloseAt: new Date("2026-07-11T05:00:00Z"),
  };
  assert.throws(() => assertContestVote({ ...base, authorId: "user", userId: "user", isNsfw: false, showNsfwContestEntries: false }), /own/);
  assert.throws(() => assertContestVote({ ...base, authorId: "author", userId: "user", isNsfw: true, showNsfwContestEntries: false }), /NSFW/);
  assert.doesNotThrow(() => assertContestVote({ ...base, authorId: "author", userId: "user", isNsfw: true, showNsfwContestEntries: true }));
});

test("winner ordering uses votes, submission time, then stable id", () => {
  const entries = [
    { id: "b", voteCount: 3, submittedAt: new Date("2026-07-08T12:00:00Z") },
    { id: "c", voteCount: 4, submittedAt: new Date("2026-07-08T12:00:00Z") },
    { id: "a", voteCount: 4, submittedAt: new Date("2026-07-08T12:00:00Z") },
  ];

  assert.equal(selectWinner(entries)?.id, "a");
});

test("a scheduled queue item takes priority over unscheduled and fallback prompts", () => {
  const selected = selectContestPrompt({
    contestDate: "2026-07-08",
    queueItems: [
      { id: "unscheduled", scheduledDate: null, position: 1 },
      { id: "scheduled", scheduledDate: "2026-07-08", position: 99 },
    ],
    unusedPrompts: [{ id: "fallback" }],
    random: () => 0,
  });

  assert.deepEqual(selected, { kind: "queue", id: "scheduled" });
});

test("the earliest unscheduled queue item wins when no prompt is scheduled", () => {
  assert.deepEqual(selectContestPrompt({ contestDate: "2026-07-08", queueItems: [{ id: "later", scheduledDate: null, position: 8 }, { id: "earlier", scheduledDate: null, position: 2 }], unusedPrompts: [{ id: "fallback" }], random: () => 0 }), { kind: "queue", id: "earlier" });
});

test("random fallback selects only from unused prompts and refuses to repeat", () => {
  assert.deepEqual(selectContestPrompt({ contestDate: "2026-07-08", queueItems: [], unusedPrompts: [{ id: "unused-a" }, { id: "unused-b" }], random: () => 0.75 }), { kind: "fallback", id: "unused-b" });
  assert.equal(selectContestPrompt({ contestDate: "2026-07-08", queueItems: [], unusedPrompts: [], random: () => 0 }), null);
});
