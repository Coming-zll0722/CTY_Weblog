# Public site quality review — 2026-10-31

## Scope

- Fix `/api/v1/posts?q=...` and the notes page on PostgreSQL.
- Remove planning-example widgets and disconnected GitHub metrics from the public homepage; keep the planning components and their unit tests.
- Replace the mock project dashboard with actual project text when no cover is available.
- Keep existing navigation, layout controls, brand imagery and themes.
- Associate search responses with query, category and page; hide stale responses immediately and ignore aborted requests.
- Describe available contact channels accurately without adding personal information.
- Provide a separate [article draft](../../drafts/tcp-udp-test-platform-design.md), runnable synthetic TCP example and recorded output. No database content is published by this change.

## Root cause and verification

The article listing combined `SELECT DISTINCT` with a computed relevance expression in `ORDER BY` that was absent from the select list. PostgreSQL rejects this combination; the SQLite test database accepted it. The production error type was `InvalidColumnReferenceError`.

Category and tag membership now use subqueries, so each selected post appears once without `DISTINCT`. Count and data queries share the same filters. An ID tie-breaker keeps equal-score pagination deterministic.

The new public API regression runs on both SQLite and PostgreSQL. It covers Chinese and English queries, title/summary/tag/category matches, multiple tags per post, stable pagination, out-of-range pages, no matches, whitespace, and exclusion of drafts, future publications and deleted posts. PostgreSQL runs in a unique test schema; local migration verification uses a temporary cluster and also checks backup/restore. CI provides an explicit disposable `TEST_POSTGRES_URL`.

The existing PostgreSQL smoke test had a stale hard-coded migration head. It now compares the restored database with the actual Alembic head instead.

## Local validation

- ESLint and TypeScript: passed.
- Production build and real FastAPI → React SSR smoke: passed.
- Render/bundle suite: 8 passed.
- Component suite: 20 passed.
- Backend suite: 35 passed, 1 PostgreSQL case skipped when `TEST_POSTGRES_URL` was not set.
- Separate isolated SQLite/PostgreSQL 18.3 query run: 2 passed; migration and backup/restore passed. The CI backend job uses PostgreSQL 16 and must independently pass before release.
- Ruff: passed for backend, verification helper and teaching example.
- Playwright: 17 passed. Includes 320–2560px navigation checks, mobile layout recovery, keyboard focus, core-page accessibility checks and homepage/notes/search/contact checks in both themes.
- Teaching example: all 12 two-chunk partitions and oversized-frame rejection passed; real loopback normal, truncated and silent cases matched their expected outcomes.

Initial local blockers were a shared npm cache permission error, a missing Chromium test runtime and the stale migration expectation. They were resolved using a project-local npm cache, Playwright's Chromium installation and the migration-head correction. These initial failures are not counted as successful tests.

## Screenshots

These are local integration fixtures with synthetic article/project data, not production content or production acceptance evidence.

| View | Light | Dark |
| --- | --- | --- |
| Desktop, 1440px | [Screenshot](home-1440-light.png) | [Screenshot](home-1440-dark.png) |
| Mobile, 390px | [Screenshot](home-390-light.png) | [Screenshot](home-390-dark.png) |

## Semantic monitoring and release checks

A streamed page may have already sent HTTP 200 before a child component fails. Changing the status after the headers have been sent is not a reliable fix. The full-stack smoke now checks that `/notes` contains its actual heading rather than merely accepting HTTP 200.

The read-only helper checks notes/contact headings and Chinese/English post-query response envelopes:

```text
python deploy/scripts/check-public-site.py --base-url https://devlelin.xyz
```

Use this alongside process/container health checks, including after deployment. It does not schedule monitoring automatically and does not replace browser checks of client-side behavior. It performs no writes and does not require administrator credentials.

Release requires a green PR and green merged-main checks (`frontend`, `backend`, `containers`), a unique release tag, verified release assets and the existing protected relay deployment flow. No new database migration or deployment permission is introduced by this change.

## Pending owner input and boundaries

- The public contact configuration has no email or GitHub profile at review time. The page therefore accurately offers RSS. The owner may later provide contact details explicitly intended for publication.
- Real learning records and authentic project screenshots can be added later; no activity or project outcome has been invented.
- The previous checkout's four uncommitted navigation/style/test edits are untouched and excluded from this separate branch.
- Local validation does not establish CI or production deployment success; those are checked separately for the resulting commit and release.
