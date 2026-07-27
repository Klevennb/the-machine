import assert from "node:assert/strict";
import test from "node:test";
import {
  getContestDraftDefaults,
  getContestSubmissionRequirements,
  normalizeStoryGenre,
  resolveInitialStoryGenre,
} from "../lib/entry-policy.ts";

test("a contest draft uses a canonical prompt genre or falls back to Other", () => {
  assert.deepEqual(resolveInitialStoryGenre("Horror"), {
    storyGenre: "Horror",
    customStoryGenre: null,
  });
  assert.deepEqual(resolveInitialStoryGenre("Magical realism"), {
    storyGenre: "Other",
    customStoryGenre: "Magical realism",
  });
});

test("story genre validation keeps custom labels only for Other", () => {
  assert.deepEqual(normalizeStoryGenre("Horror", "ignored"), {
    storyGenre: "Horror",
    customStoryGenre: null,
  });
  assert.deepEqual(normalizeStoryGenre("Other", "  Magical realism  "), {
    storyGenre: "Other",
    customStoryGenre: "Magical realism",
  });
  assert.equal(normalizeStoryGenre("Not a category", null), null);
});

test("a new contest draft derives its editable title and story genre once", () => {
  assert.deepEqual(
    getContestDraftDefaults({
      authorDisplayName: "Ada",
      promptGenre: "Horror",
      promptTitle: "No Reflection After Dawn",
    }),
    {
      title: "No Reflection After Dawn — by Ada",
      storyGenre: "Horror",
      customStoryGenre: null,
    }
  );
});

test("contest submission reports every unmet writing requirement", () => {
  assert.deepEqual(
    getContestSubmissionRequirements({
      title: " ",
      storyGenre: null,
      wordCount: 99,
    }),
    {
      hasTitle: false,
      hasStoryGenre: false,
      hasMinimumWords: false,
      isReady: false,
    }
  );
});
