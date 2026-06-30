# PRD: Explore Public And Friend Stories

Labels: ready-for-agent

## Problem Statement

Writers can currently use Explore to browse prompts, but they cannot discover stories written by other users from the same surface. Public stories and friend-visible stories exist conceptually in the product model, but discovery is fragmented: profiles show public work, Library manages a writer's own work, and Explore remains prompt-only.

Users need a way to browse other writers' stories, choose whether they are seeing stories from friends or the wider public, avoid content they do not want to see, and move from discovery into reading or author profiles without losing clear privacy boundaries.

## Solution

Extend Explore into a two-tab discovery surface with Stories as the default tab and Prompts preserved as the second tab.

The Stories tab shows batches of 8 eligible stories. Users can switch between Friends and Random sources, toggle NSFW inclusion for the current Explore session, re-roll the current batch from the server, hide stories they do not want to see again, undo a recent hide, read a story on a canonical story page, and click an author name to visit that writer's profile.

The implementation also completes the story visibility model by supporting friend-visible stories through the existing `FRIENDS` entry visibility value, adding explicit NSFW metadata to entries, and enforcing the same access rules on Explore, profile story lists, and story detail pages.

## User Stories

1. As a signed-in writer, I want Explore to open on stories by default, so that I can immediately discover writing from other people.
2. As a signed-in writer, I want prompts to remain available on Explore, so that I can still use the existing prompt discovery workflow.
3. As a signed-in writer, I want Stories and Prompts to be separate tabs, so that story-specific controls do not clutter prompt browsing.
4. As a signed-in writer, I want to browse public stories from random writers, so that I can discover work beyond my friend network.
5. As a signed-in writer, I want to browse stories from my friends, so that I can keep up with people I know.
6. As a signed-in writer, I want Friends mode to include my friends' public stories, so that I do not miss work they shared broadly.
7. As a signed-in writer, I want Friends mode to include my friends' friend-visible stories, so that friend-only sharing has a discovery surface.
8. As a signed-in writer, I want Random mode to exclude friend-only stories, so that friend-only privacy is respected.
9. As a signed-in writer, I want Explore to exclude my own stories, so that Explore remains focused on discovery.
10. As a signed-in writer, I want the NSFW filter to default from my profile preference, so that the page starts with my expected content setting.
11. As a signed-in writer, I want the Explore NSFW toggle to be session-only, so that a temporary browsing choice does not silently change my account preference.
12. As a signed-in writer who has NSFW disabled, I want NSFW stories to be fully excluded, so that titles and previews do not appear.
13. As a signed-in writer who has NSFW enabled for the session, I want NSFW stories to be eligible in results, so that I can choose to browse them.
14. As a story author, I want to mark a story as NSFW, so that readers' filtering preferences can be honored.
15. As a story author, I want to set a story to Private, Friends, or Public, so that I can control who can read it.
16. As a story author, I want the Library visibility controls to include Friends, so that I can make an existing story friend-visible.
17. As a story author, I want the editor save flow to preserve NSFW and visibility metadata, so that publishing settings are not lost while editing.
18. As a reader, I want to see 8 stories in each Explore batch, so that I get meaningful variety without an endless feed.
19. As a reader, I want Re-roll to fetch a new server-selected batch, so that I receive genuinely new options.
20. As a reader, I want Re-roll to avoid the stories currently displayed, so that the new batch does not immediately repeat the same cards.
21. As a reader, I want hidden stories to stay hidden across sessions, so that I do not repeatedly see stories I dismissed.
22. As a reader, I want hiding a story to remove it immediately from Explore, so that the action has clear feedback.
23. As a reader, I want to undo a recent hide, so that I can recover from accidental dismissal.
24. As a reader, I want hidden stories to be excluded from Re-roll results, so that hiding affects future discovery.
25. As a reader, I want story cards to show title, preview, author, word count, publication date, and relevant content markers, so that I can decide what to read.
26. As a reader, I want to click Read on a story card, so that I can open the full story.
27. As a reader, I want the full story to have a canonical URL, so that refreshes and direct links work.
28. As a reader, I want clicking an author name to open the author's profile, so that I can learn more about the writer.
29. As a writer with a private profile, I want my authorship on public or friend-visible stories to remain linked while profile details stay protected, so that story privacy and profile privacy are separate concerns.
30. As a non-friend reader, I want private and friend-visible stories to be inaccessible, so that authors' audience choices are enforced.
31. As an accepted friend, I want to see friend-visible stories on a friend's profile, so that profile browsing matches Explore permissions.
32. As a non-friend profile visitor, I want to see only public stories, so that friend-visible stories remain private to friends.
33. As a story author, I want to view my own story when directly opened, so that I can verify how it reads.
34. As a signed-out visitor, I should be redirected away from protected story discovery and reading surfaces, so that existing authentication expectations remain intact.
35. As a product maintainer, I want one consistent story permission rule used by Explore, profile pages, and story pages, so that privacy bugs are less likely.
36. As a product maintainer, I want discovery selection to start as pure random from eligible published stories, so that the first version avoids premature ranking complexity.
37. As a product maintainer, I want story genre filtering out of scope for this slice, so that the feature does not expand into story metadata design.
38. As a product maintainer, I want likes and comments out of scope for the story page, so that reading and discovery can ship before social interaction workflows expand.

## Implementation Decisions

- Explore becomes a two-tab page. Stories is always the default tab. Prompts remains available and preserves the existing prompt browsing experience.
- Use the existing `FRIENDS` entry visibility value for friend-visible stories. Do not add a duplicate `PUBLIC_FOR_FRIENDS` visibility.
- Add explicit NSFW metadata to stories with a boolean entry field defaulting to false.
- Support `PRIVATE`, `FRIENDS`, and `PUBLIC` visibility throughout the entry update API and Library visibility controls.
- Add NSFW controls in the story authoring/editing flow and Library detail controls.
- Add a canonical story detail route. The route is read-only in this slice.
- Story access rules are:
  - the author can view their own story;
  - signed-in users can view published `PUBLIC` stories;
  - accepted friends can view published `FRIENDS` stories;
  - private stories are not visible to other users;
  - friend-visible stories are not visible to non-friends.
- Update profile story lists so accepted friends see both `PUBLIC` and `FRIENDS` stories from the profile owner. Non-friends see only `PUBLIC`.
- Author names on story cards link to the existing user profile route, even if the author's profile is private. Profile privacy controls profile details, not authorship of visible work.
- Add a persistent per-user hidden-story record with a unique user/story pair. Hidden stories are excluded from future Explore results.
- Hide persists immediately. The Explore UI removes the card and offers a local undo action that deletes the hidden record.
- Add an Explore stories API that accepts source, NSFW inclusion, and currently displayed IDs to exclude.
- Story batch size is 8.
- Random source returns only eligible published public stories by other users.
- Friends source returns eligible published public and friend-visible stories by accepted friends.
- Explore excludes the viewer's own stories from both source modes.
- Explore excludes stories permanently hidden by the viewer.
- Explore excludes story IDs passed by the client as currently displayed.
- When NSFW is off, NSFW stories are fully excluded rather than shown as blocked or blurred cards.
- The Explore NSFW toggle is initialized from the viewer's profile preference but does not update that preference.
- Re-roll fetches a new server-selected batch rather than reshuffling the existing client-side stories.
- Story selection is pure random from the eligible set. Do not add engagement weighting in this slice.
- Story genre filtering is out of scope because entries do not currently collect story genre metadata.
- Likes and comments are out of scope for the story page. If counts are trivial to include without interaction work, they may be displayed.

## Testing Decisions

- Tests should assert externally visible behavior and privacy boundaries rather than implementation details.
- The highest-value seam is the story eligibility and permission behavior shared by Explore, profile story lists, and story detail pages. If the implementation extracts a shared permission/visibility helper, test it through the route/API behavior where practical.
- API behavior to cover:
  - unauthenticated requests are rejected or redirected according to existing app conventions;
  - Random source returns only published public stories from other users;
  - Friends source includes accepted friends' public and friend-visible stories;
  - Friends source excludes non-friends' friend-visible stories;
  - both sources exclude the viewer's own stories;
  - hidden stories are excluded;
  - excluded IDs are not returned;
  - NSFW stories are excluded when `includeNsfw=false`;
  - the API returns no more than 8 stories.
- Story detail behavior to cover:
  - public story can be read by a signed-in user;
  - friend-visible story can be read by an accepted friend;
  - friend-visible story cannot be read by a non-friend;
  - private story cannot be read by another user;
  - author can read their own story.
- Entry update behavior to cover:
  - `FRIENDS` visibility is accepted and persisted;
  - NSFW flag is accepted and persisted;
  - unsupported visibility values are rejected.
- Hide/unhide behavior to cover:
  - hiding creates a per-user hidden-story record;
  - hiding the same story twice is idempotent or safely handled;
  - unhide removes the hidden-story record;
  - one user's hidden record does not affect another user's results.
- UI behavior to cover manually or with browser-level tests if added later:
  - Explore opens to Stories;
  - Prompts tab still renders existing prompt content;
  - source switching fetches the correct mode;
  - NSFW toggle refetches or filters the current story set according to server behavior;
  - Re-roll replaces the batch;
  - Hide removes a card and Undo restores eligibility.
- Current repo prior art is limited to lint/build verification rather than an established test runner. At minimum, this feature should pass lint and build. If a test runner is introduced, keep tests focused at route/API boundaries and permission decisions.

## Out of Scope

- Engagement-weighted ranking for story discovery.
- Story genre metadata and filtering.
- Likes, comments, replies, moderation workflows, notifications, or optimistic social interactions on the story page.
- A management page for all hidden stories.
- Blurred or blocked NSFW placeholders.
- Public anonymous access to Explore or story detail pages.
- A full redesign of profiles, Library, or the editor beyond the controls required for visibility and NSFW metadata.
- Feed preference persistence from Explore controls.

## Further Notes

- The implementation should avoid duplicating permission logic across pages and API routes. The same story visibility rules should govern Explore results, profile story lists, and story detail access.
- Existing profile feed preferences should be treated only as defaults where relevant. The Stories tab remains the default tab regardless of those preferences.
- The feature depends on a schema migration and generated Prisma client update before route and UI work can compile.
- Because this is a Next.js version with known breaking changes relative to older versions, implementation work should consult the local Next.js docs before changing route or app conventions.
