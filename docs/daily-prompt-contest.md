# Daily Prompt Contest

This document captures the agreed behavior for the daily prompt contest feature. It is the source of truth for implementation decisions unless a later product decision supersedes it.

## Goal

Every day, all users see the same writing prompt. Users can write privately from that prompt, or submit one entry to the daily contest. Contest entries are public, immutable after submission, readable from a dedicated contest page, and voted on with a single contest vote per user.

## Contest Lifecycle

- The canonical contest timezone is `America/Chicago`.
- `/contest` shows the current Chicago-date contest.
- `/contest/[contestDate]` shows a specific dated contest archive page.
- A contest accepts submissions only on its contest date.
- Submission eligibility is based on the time the user confirms `Submit entry`, not when the draft was created.
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

Entries should support optional canonical story genre and optional custom genre label. The persistence model must also distinguish an active contest draft from an ordinary entry, retain the immutable contest prompt snapshot and dated provenance, and persist a one-way loss of eligibility when a contest draft is converted to normal writing.

## Submission Rules

- Each user may submit at most one public contest entry per daily contest.
- Each user may have at most one active contest draft for a daily contest. Entering contest-writing mode resumes that draft when one exists; otherwise it creates one.
- Converting a contest draft to normal writing ends its contest-draft association and permits the writer to create a new contest draft for that contest. The converted entry itself remains permanently ineligible for contest submission.
- Once a writer has an active submitted contest entry, contest surfaces replace `Write from this prompt` with `View your entry` and do not create another contest draft.
- Users may write private drafts from the contest prompt without submitting.
- Entering from today's contest opens a dedicated contest-writing mode. In this mode, the daily contest prompt is fixed and cannot be replaced.
- The contest prompt should appear once in a single static prompt panel rather than as both a selectable prompt and a separate active-prompt panel.
- In contest-writing mode, the single prompt panel spans the writing layout above the entry metadata and editor. It contains a `Today's contest prompt` label, prompt title, exact prompt text, prompt genre, contest status or submission deadline, and the secondary `Continue as normal writing` action.
- While submissions are open, the prompt panel shows the authoritative Chicago-time deadline, such as `Submissions close today at 11:59 PM CT`. A live countdown may appear only as secondary information.
- After submissions close, the panel shows `Contest closed — this draft can no longer be submitted`.
- Remove the sidebar `Active prompt` card in contest-writing mode and move writing progress upward. The traditional editor layout remains unchanged.
- The static contest prompt panel should offer `Continue as normal writing`.
- Because conversion is irreversible for that draft, the action must first confirm: `Continue as normal writing? This draft will no longer be eligible for today's contest. Your work will be saved and moved to the standard editor.`
- Cancelling the confirmation changes nothing. Confirming begins the guarded save-and-transition flow.
- `Continue as normal writing` preserves the same draft and all work already entered, then opens it in the traditional editor with the daily prompt loaded as its source prompt.
- Activating `Continue as normal writing` must first save the current title, content, notes, NSFW setting, and story genre to that same entry.
- The transition to the traditional editor occurs only after that save succeeds. If it fails, the writer remains in contest-writing mode and sees the save error.
- This conversion is one-way for that draft: after conversion, the entry uses normal publishing controls and can no longer be submitted to the daily contest.
- The converted entry retains the exact contest prompt snapshot—title, body, and prompt genre—that the writer originally saw. It must not resolve its displayed source prompt from mutable upstream prompt data.
- Converted entries may display dated provenance such as `Daily contest prompt · July 24, 2026` linked to the source contest. They do not receive a contest-entry badge and do not appear among contest submissions unless actually submitted.
- The contest-writing mode should show a prominent contest-submission action.
- When a contest draft is first created, its title should default to `[prompt title] — by [author display name]`.
- The author display name follows the product's existing fallback order: profile name, then username, then `Writer`.
- The generated title remains editable. Generate it only once and never overwrite the author's later changes, including after profile changes or subsequent saves.
- A contest draft may be saved privately with a blank title, but contest submission requires a nonblank title and must explain that requirement when validation fails.
- Contest drafts require one `Story genre`, describing the story the author intends to write rather than the genre assigned to the contest prompt.
- Story genre defaults to the contest prompt's genre, but the author may choose a different genre while drafting.
- Story genre becomes immutable with the rest of the entry when the contest entry is submitted.
- Contest-writing mode replaces the normal visibility selector with the story-genre selector. A saved contest draft remains private; contest submission still forces the entry to public and published.
- Story genre is optional metadata on all entries, but is required to submit an entry to a daily contest.
- Existing and ordinary entries do not require a story genre. Converting a contest draft to normal writing preserves its selected story genre.
- The traditional editor exposes story genre as optional metadata alongside its existing visibility control. Contest-writing mode requires story genre and omits visibility because contest submission determines publication state.
- Display story genre on contest entry cards, published story pages, Library entries, Explore story cards, and public-profile story cards.
- When `Other` has a custom label, displays use the custom label; otherwise they show `Other`. Story-genre filtering is outside this redesign.
- Story genre uses the product's standard genre taxonomy plus `Other`; it does not accept an arbitrary genre as the primary category.
- Selecting `Other` may include an optional custom genre label of up to 48 characters. The canonical category remains `Other` for filtering, while displays may use the custom label when present.
- When the contest prompt's genre is in the standard taxonomy, use it as the initial story genre. Otherwise initialize story genre to `Other` and continue showing the prompt's original genre as read-only prompt context.
- Normal draft behavior remains available as `Save draft`; contest drafts are always private before submission.
- The primary submission action is labeled `Submit to daily contest`.
- Near the submission action, show a compact readiness checklist for a nonblank title, a selected story genre, and at least 100 words. Unmet requirements must be visibly identified.
- Keep `Submit to daily contest` disabled until all readiness requirements pass.
- Before submission, show an in-page confirmation dialog containing the final entry title, selected story genre, current word count, and `Contest entries are public and cannot be edited after submission.`
- The confirmation dialog offers `Keep editing` and `Submit entry`. It does not require a separate review page.
- Final submission is atomic: save the latest draft state, validate contest eligibility, create the contest entry, and make the underlying entry public and published as one operation.
- If any part of final submission fails, no contest entry is created, nothing becomes public, and the writer remains in contest-writing mode with a private draft.
- Contest submission forces the entry to `PUBLIC` and `PUBLISHED`.
- After successful submission, redirect to the dated contest page, scroll to and temporarily highlight the writer's submitted entry, and show a brief `Entry submitted` success message.
- Submitted contest entries cannot change title, story content, public author note, story genre, NSFW status, or publication state. Normal save/edit routes must reject those changes for entries with an active contest submission.
- A private author note remains editable after submission because it is not visible to readers or voters. Expose that capability separately without restoring normal story-editing affordances.
- Contest submission requires at least 100 words.
- If submission has closed, the draft remains in contest-writing mode with a clear `Contest closed` state and can never enter the contest.
- An expired contest draft may still be edited and saved privately. It is not converted automatically; the writer may explicitly continue it as normal writing through the same one-way conversion flow.

## Withdrawal and Moderation

- Authors may withdraw a contest entry during the submission day.
- Withdrawn entries disappear from contest pages and cannot win.
- Withdrawing does not delete the underlying entry. While submissions remain open, it returns that same work to a private, editable contest draft that can be resumed from `Write from this prompt`.
- Withdrawal removes every contest-vote record for that submission and resets its vote count to zero. Those voters may use their one contest vote again elsewhere.
- A withdrawn draft may be revised and resubmitted before the deadline. Resubmission reactivates the same contest-submission record with zero votes, assigns a new submission timestamp for tie-breaking, and repeats the normal readiness checks and confirmation.
- Resubmission never restores a prior vote automatically. A former voter may deliberately cast a new vote for the revised, resubmitted entry.
- After submissions close, withdrawal is unavailable.
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
- Contest-writing mode retains the NSFW control alongside story genre. It is editable while drafting and becomes immutable on submission.
- When a draft is marked NSFW, the final confirmation explains that the submitted entry's visibility depends on each viewer's contest NSFW preference.
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
- In the author's Library, unsubmitted contest work shows `Contest draft` and its contest date while submissions are open; selecting it resumes contest-writing mode.
- After submissions close, the Library badge becomes `Contest closed`; selecting it opens the saved draft with submission disabled and `Continue as normal writing` available.
- Converted entries lose contest-draft and contest-closed badges and use normal entry treatment.
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
- one active contest draft per writer and contest, with resume behavior
- default title generation occurring once without overwriting edits
- required contest story genre, nonstandard prompt fallback to `Other`, and optional custom label
- one-way conversion preserving all draft work and the exact prompt snapshot
- conversion failure leaving the contest draft and eligibility unchanged
- atomic submission failure leaving the entry private and unsubmitted
- expired contest drafts remaining editable but ineligible
- withdrawal resetting vote count and vote records, followed by zero-vote resubmission with a new timestamp
- former voters being allowed to cast a fresh vote after resubmission
- competitive fields remaining immutable while the private author note stays editable

Editor and integration coverage should also verify:

- contest mode renders one static prompt panel with no picker or duplicate active-prompt card
- contest mode omits visibility, requires story genre, and retains NSFW
- the readiness checklist gates submission for title, story genre, and word count
- conversion confirmation, failed-save behavior, and successful navigation to the traditional editor
- submission review dialog and successful focus on the writer's contest entry
- Library badges and destinations for open, closed, converted, and submitted contest work
