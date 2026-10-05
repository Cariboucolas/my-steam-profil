# Only a page loads what it shows

The components follow the five levels of atomic design, and data is loaded at the last of them
only. A page, under `src/components/pages/`, asks the `ApiClient` for what it shows and hands it
to its template; templates, organisms, molecules and atoms take everything through their props and
never fetch. The route files under `app/` keep what depends on the router and render a page.

## What it binds

Decided in #75, and binding since the routes were split into pages and templates. It binds:

- `src/components/templates/`: layout only, taking named `ReactNode` props rather than domain data.
- `src/components/pages/`: the one level that calls `useApiClient`.
- `app/*.tsx`: reduced to reading route parameters and rendering a page.
- `useApiClient`, which reads its client from an `ApiClientProvider` so that a story, or a test,
  can serve the fixture client instead.

Where a loaded answer is kept, above the routes, is ADR-0025.

## Why

**One loading point per screen.** The library screen counts a whole library, and ADR-0005 caches
that tally per player. Organisms that fetched for themselves would each ask again, and the question
of which of them owns a loading or an error state would have as many answers as there are
organisms.

**Pure components are already the rule.** Every organism here is tested by what it states when
told something; none has a loading state of its own to test. This keeps them that way, and puts
loading and failure where a screen experiences them.

**The seam goes where the router is not.** A page separated from its route renders in Storybook
with a fixture `ApiClient` and its real loading path, without mocking Expo Router. That is what
lets a page story show a fetch rather than a picture of one.

## What this does not say

It does not require the #51 screen tests to move onto `ApiClientProvider`; `jest.mock` on
`use-api-client` still cuts at the same place.

It does not forbid a component from holding state. A tab chosen, a sort order, a field being typed
into — local state stays local. What stays at the page is what comes from the API.

## Considered options

**Organisms that load their own data**, as `my-game-mobile/front` does with its `*Async`
organisms, each story then mocking its queries. Rejected on the first ground above: the tally is
one download, and splitting who asks for it splits who reports it failing.

**Pages as stories only, with no `pages/` directory.** The route would keep its loading and the
page story would be a template fed with fixture props. Rejected because the loading path would then
exist in no story at all — only the route has it, and the route cannot be rendered without the
router.
