# Daily Prompt Contest

This document captures the agreed behavior for the daily prompt contest feature. It is the source of truth for implementation decisions unless a later product decision supersedes it.

## Goal

Every day, all users see the same writing prompt. Users can write privately from that prompt, or submit one entry to the daily contest. Contest entries are public, immutable after submission, readable from a dedicated contest page, and voted on with a single contest vote per user.

## Contest Lifecycle

- The canonical contest timezone is `America/Chicago`.
- `/contest` shows the current Chicago-date contest.
- `/contest/[contestDate]` shows a specific dated contest archive page.
- A contest accepts submissions only on its contest date.
- Submission eligibility is based on the time the user clicks `Submit entry to contest`, not when the draft was created.
- Voting opens as soon as contest entries are submitted.
- Voting closes after the contest day plus the next two calendar days.
- Example: the July 8, 2026 contest accepts submissions until July 9, 2026 at 00:00 America/Chicago and voting closes on July 11, 2026 at 00:00 America/Chicago.
- Contests may be created lazily when the app needs today's contest. A unique `contestDate` constraint must prevent duplicate contests under concurrent requests.

## Prompt Selection

The selected prompt is snapshotted onto the contest record so historical contests keep the exact prompt text even if the source prompt changes later.

Prompt selection priority:

1. A queued admin prompt scheduled for the contest date.
2. The earliest queued unscheduled admin prompt by queue position.
3. A random unused prompt from built-in `Prompt` records or approved community `WritingPrompt` records.

Prompts must not repeat automatically. If the admin queue is empty and every prompt has already been used for a daily contest, the app should not create a repeated-prompt contest. It should surface an admin-visible "no unused prompts available" state.

The v1 build does not include an admin queue UI. The data model should support queue records, but queue management can happen through seed data, scripts, or manual database operations until a later admin UI is built.

## Data Model Direction

Recommended domain records:

- `DailyContest`: dated contest, prompt snapshot, source metadata, submission/voting windows, final winner, finalization timestamp.
- `ContestPromptQueueItem`: admin-priority prompt queue with optional scheduled date, position, status, source prompt reference, creator, and used timestamp.
- `ContestEntry`: wrapper around an existing `Entry`, with contest-specific status, submission time, vote count, and admin moderation fields.
- `ContestVote`: separate from normal `EntryLike`, with one vote per user per contest.

Contest submissions should reuse the existing `Entry` model for content, author, rich text, comments, visibility, story page rendering, and library/profile/explore integration. The contest-specific wrapper controls immutability, voting, withdrawal, disqualification, and winner calculation.

## Submission Rules

- Each user may submit at most one public contest entry per daily contest.
- Users may write private drafts from the contest prompt without submitting.
- The write editor should show a prominent `Submit entry to contest` action when the active prompt is today's contest prompt.
- Normal draft behavior should remain available as `Save privately`.
- Before submission, show an explicit confirmation: `Contest entries are public and cannot be edited after submission.`
- Contest submission forces the entry to `PUBLIC` and `PUBLISHED`.
- Submitted contest entries cannot be edited after submission. Normal save/edit routes must reject content changes for entries with an active contest submission.
- Contest submission requires at least 100 words.
- If submission has closed, the draft may continue as private writing but can no longer enter the contest.

## Withdrawal and Moderation

- Authors may withdraw a contest entry during the submission day.
- Withdrawn entries disappear from contest pages and cannot win.
- Withdrawing does not delete the underlying `Entry`; it remains in the author's library.
- Admins may disqualify a contest entry.
- Disqualified entries are hidden from public contest listings, are not votable, and cannot win.
- Admin disqualification should store admin notes.
- Disqualification does not by itself delete or otherwise moderate the underlying story.

## Voting Rules

- Contest votes are separate from normal story likes.
- The UI may call the action a "like", but the database should model it as a contest vote.
- Each user gets one vote total per contest.
- The contest page must make this clear with copy such as `You get one vote for this contest.`
- Users may move their vote to another entry until voting closes.
- Moving a vote updates the existing `ContestVote` for `contestId + userId`.
- Users cannot vote for their own entry.
- Voting requires login.
- Voting is rejected after the contest voting window closes.

## Winner Rules

Before voting closes, pages may show a live leaderboard.

After voting closes, the app should finalize and store the winner on `DailyContest`. Finalization can happen lazily when a closed contest is loaded if no scheduled job exists yet.

Winner ordering:

1. Highest vote count.
2. Earliest `submittedAt`.
3. Lowest `ContestEntry.id` as a stable final fallback.

This handles the no-vote case: if no one votes, the earliest submitted eligible entry wins.

## NSFW Rules

- NSFW contest entries are allowed.
- NSFW entries are eligible to win.
- The contest page has its own `show NSFW` toggle independent of the general `allowNsfwStories` profile setting.
- The contest-specific NSFW toggle should be persistent per user, for example `User.showNsfwContestEntries`.
- NSFW contest entries are hidden by default when the contest-specific toggle is off.
- A user must have the contest-specific NSFW toggle enabled to vote for an NSFW contest entry.
- Logged-out visitors cannot enable a persistent NSFW contest preference, so NSFW contest entries are hidden for logged-out visitors.
- The home page contest section should not show NSFW entry previews. If the winner is NSFW and hidden by the viewer's contest setting, show a hidden-winner message and link to the contest page.

## Public Surfaces

- Contest entries are public stories and should appear anywhere public stories already appear, such as Explore and public profiles.
- Contest entries should show a contest badge or link wherever they appear.
- In the author's library, a contest entry should be visibly locked and should not show normal editing affordances.
- Existing story comments may still apply through the normal story page and `EntryComment` behavior.
- The contest listing itself should stay focused on reading previews, vote state, and winner/leaderboard information rather than inline comments.

## Home Page

- The home page should include a daily contest section.
- Users can minimize the section.
- The minimized state should persist per user, for example `User.hideDailyContestCard`.
- The minimized state should still show a compact strip with today's prompt title, contest status, and a restore action.
- Because voting overlaps across days, the home section should also surface prior contests that are still open for voting.
- In minimized state, show a compact count such as `2 contests still open for voting`.

## Logged-Out Behavior

- Logged-out visitors may read non-NSFW public contest entries if current public story rules allow logged-out public reads.
- Logged-out visitors must log in to submit or vote.
- NSFW contest entries are hidden from logged-out visitors.

## Test Coverage

The first implementation should include rule tests for:

- prompt selection priority: scheduled queue, unscheduled queue, random fallback
- no prompt repeats
- one submission per user per contest
- submission closing at the Chicago calendar boundary
- content edits rejected after contest submission
- one vote per contest
- moving a vote during the voting window
- self-vote rejection
- NSFW voting requiring the contest-specific NSFW toggle
- winner ordering by votes, then earliest submission, then stable ID fallback

