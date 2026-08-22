# Missing Backend Dependencies

No backend exists yet for this frontend (confirmed: empty Supabase schema — zero tables,
zero functions — no `backend/` directory, placeholder `docker-compose.yml`). Every page
currently reads from `frontend-app/src/services/*.ts`, which wraps mock data behind the
async function signatures a real API would have. Swapping mocks for real calls means
editing only these service files — no page or component needs to change.

Base URL is read from `VITE_API_BASE_URL` in `frontend-app/src/services/apiClient.ts`.

## Dashboard — `src/services/dashboard.ts`
- `GET /dashboard/stats` → `DashboardStat[]`
- `GET /dashboard/notifications` → `DashboardNotification[]`
- `GET /dashboard/task-completion` → `TaskCompletion[]`
- `GET /dashboard/case-status` → `CaseStatusCount[]`
- `GET /dashboard/team-activity` → `TeamMetric[]`

## Cases — `src/services/cases.ts`
Currently backed by `localStorage` (acts as a fake DB, not a mock — state persists and mutates).
- `GET /cases` → `Case[]`
- `GET /cases/:id` → `Case`
- `POST /cases` (body: `CaseInput`) → `Case`
- `POST /cases/:id/hearings` (body: `Hearing`) → `Case`
- `DELETE /cases/:id` → `void`

## Documents — `src/services/documents.ts`
- `GET /documents` → `DocumentSummary[]`

**Known schema conflict:** `AppLayout.tsx` seeds `localStorage['storedFiles']` via
`generateExampleDocuments()` in `lib/utils.ts`, using a *different* shape
(`name/modified/status/created/case_id`) than what `Documents.tsx` actually renders
(`title/lastModified/type/category`). Neither is authoritative — the real `/documents`
response shape needs to be decided, not inferred from either mock.

## Document Intelligence — `src/services/documentIntelligence.ts`
- `GET /documents/:id/intelligence` → `DocumentDetail` (clauses, entities, related judgments, timeline, AI notes)

## Compliance — `src/services/compliance.ts`
- `GET /compliance/snapshot` → `ComplianceSnapshot` (score, risk score, category scores, violations, recommendations)

## Chat / Orchestrator — `src/services/chat.ts`
- `GET /chat/suggested-prompts` → `string[]`
- `POST /chat/stream` → SSE stream of `{ token: string, done: boolean, citations?: Citation[] }`
  - Current mock streams word-by-word with an 18ms delay per token; a real endpoint should
    stream actual model output, not simulate pacing.

## AI Agents — `src/services/agents.ts`
- `GET /agents` → `Agent[]` (status, progress, last execution, current activity per agent)
- `POST /agents/execute` (body: `{ query: string }`) → `ExecutionRun` (ordered steps per agent)

## Legal Research — `src/services/research.ts`
- `GET /research/search?query=&jurisdiction=&dateRange=&contentType=` → `CaseResult[] | StatuteResult[] | ArticleResult[]`
  - The fabricated "AI confidence" percentage bar that used to sit on this page has
    been removed (it didn't correspond to any real computation). Do not reintroduce
    a confidence score unless a real relevance/ranking signal exists to back it.

## Document Drafting — `src/services/drafting.ts`
- `POST /drafting/generate` (body: `{documentType, details, jurisdiction}`) → `{ document: string }`
  - Previously called `supabase.functions.invoke('generate-document', ...)`, which failed
    at runtime (no such edge function exists; Supabase schema is empty). Now returns an
    honest placeholder document instead of a silent failure.
  - `TemplateGallery.tsx` and `RecentDocuments.tsx` still need their own data source decided.

## Not yet adapter-wrapped (deferred, out of this pass)
- **Voice** — no voice UI or endpoint exists anywhere in the current frontend; not
  in scope until a voice surface is designed.

## Fake-latency pattern (flag, not a missing endpoint)
Nearly every page wraps its data read in a hardcoded `setTimeout(..., 300–1200ms)` before
showing data that was already available synchronously (`AppLayout.tsx`, `Cases.tsx`,
`CaseDetails.tsx`, `Index.tsx`). This simulates network latency for its own sake. Once
real endpoints exist, this should be removed — real fetch latency will produce genuine
loading states; a manufactured delay on top of a real delay double-penalizes load time.
