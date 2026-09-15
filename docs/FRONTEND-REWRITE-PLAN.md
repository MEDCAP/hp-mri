# Frontend Rewrite Plan

> **STATUS: COMPLETED 2026-06-12.** All phases (0–5) executed, plus a type-safety pass
> driving `@typescript-eslint/no-explicit-any` to zero. `npm run build` and `npm run
> lint` both exit clean. Notable deviations discovered during execution: the two
> upload-progress components are complementary (not duplicates — kept both); GIF export
> was never implemented (no-op handler; screenshot logic extracted to `useScreenshot`
> instead of the planned `useGifExport`); `PulseResponse` wire types corrected to the
> backend's real 3-D/2-D shapes. Remaining manual step: runtime smoke test with backend
> + AWS creds (see Verification below).

Strategy: **incremental, phase-gated refactor** of `hp-mri-frontend/` — not a greenfield
rewrite. The app must compile (`npm run build` = `tsc -b && vite build`) after every
phase. No behavior changes except where a bug is documented in `docs/KNOWN-ISSUES.md`.
No new runtime dependencies in this pass (structure should make adding React Query or a
store trivial later). Backend untouched.

## Target structure

```
src/
├── api/                      # ALL HTTP in one place — no axios outside this folder
│   ├── client.ts             # axios instance (baseURL '/api'), normalized ApiError
│   ├── mrdFiles.ts           # listMrdFiles, getMrdFile, uploadMrdFiles, deleteMrdFiles
│   ├── viewer.ts             # fetchImageArray, fetchPulseArray, fetchGradientArray
│   └── types.ts              # response/request types (re-export MRDFile)
├── config/
│   └── env.ts                # typed import.meta.env access (VITE_COGNITO_*)
├── auth/
│   ├── cognito.ts            # moved from pages/loginpages/cognitoUtils.ts, env-driven
│   └── ProtectedRoute.tsx
├── components/               # only app-wide shared primitives
│   ├── dialogs/AppDialog.tsx # shared Transition + StyledDialog + SectionBox shell
│   └── Sidebar.tsx
├── features/
│   ├── files/                # RetrievePage + upload suite + details + delete dialog
│   │   ├── components/
│   │   ├── hooks/            # useFileList (sort/filter/select), useUpload
│   │   └── RetrievePage.tsx, UploadPage.tsx
│   ├── viewer/
│   │   ├── components/       # viewer components + icons
│   │   ├── hooks/            # useViewerState (rewritten), useMRDArrayConcatenation
│   │   └── ViewerPage.tsx
│   ├── recon/                # ReconstructModal (+ future ReconstructPage)
│   ├── simulator/
│   ├── calculator/
│   ├── auth/                 # AccountPage, SignUpPage, ConfirmSignUpPage
│   └── home/                 # homepage pages
├── layouts/
├── styles/  theme.ts
├── types/
└── App.tsx  main.tsx
```

## Phases

### Phase 0 — Fix the broken baseline build
`src/components/viewer/ConcatenationPanel.tsx`: remove unused `IconButton` import
(TS6133); replace deprecated MUI v6 `<ListItem button onClick>` with `<ListItemButton>`
(TS2769). Gate: `npm run build` exits 0.

### Phase 1 — API client layer + env config (no behavior change)
- Create `src/api/` per target structure. Typed functions for every endpoint currently
  called: `GET /mrd-files`, `GET /mrd-files/:id`, `POST /upload` (multipart, progress
  callback), `DELETE /mrd-file`, `GET /viewer/:id`, `GET /viewer/get_pulse_array/:id`,
  `GET /viewer/get_gradient_array/:id`, `GET /simulator`.
- Migrate every inline axios/fetch call (`RetrievePage`, `UploadPage`, `UploadModal`,
  `useViewerState`, `PulsePlotComponent`, `SimulatorPage`) to the API layer. Keep
  `PulsePlotComponent`'s in-memory cache, moved behind the api function or hook.
- Create `src/config/env.ts`; move hardcoded Cognito pool IDs from `cognitoUtils.ts` to
  `VITE_COGNITO_USER_POOL_ID` / `VITE_COGNITO_CLIENT_ID` with `.env` (gitignored) +
  `.env.example` (committed). env.ts falls back to current literal values so dev keeps
  working without an env file.
- Gates: build passes; `grep -rn "axios" src --include='*.ts*' -l` → only `src/api/`.

### Phase 2 — Dead code removal + deduplication
Deletions (verify zero references first, then delete):
- `components/viewer/PlotShiftPanel.tsx` (commented-out corpse)
- `pages/reconpages/ReconstructPage.tsx` (empty, unrouted)
- `components/viewer/PlotComponent.tsx` **only if** unreferenced
- orphan CSS: `researchPage.css`, `solutionPage.css`, `publicationPage.css` if unimported
Keep the stub homepages (product placeholders, routed).
Merges:
- `FileDetailsModal.tsx` + `FileDetailsPanel.tsx` → one metadata component
  (`features/files/components/FileDetails.tsx` content view) with a thin dialog wrapper.
- `UploadProgressIndicator.tsx` vs `UploadProgressModal.tsx` → keep one progress UI.
- Extract shared dialog shell used by all modals (Transition/StyledDialog/SectionBox
  copy-paste) into `components/dialogs/AppDialog.tsx`.
Gate: build passes; deleted symbols ungrepable.

### Phase 3 — Viewer state refactor
Rewrite `useViewerState.ts`: replace the ~30 suffix-numbered variables
(`imageArray1/2/3`, `sliceIndex1/2/3`, …) with `windows: ViewerWindowState[]` (file,
imageArray, nmrLabels, channel/slice/metabolite/measurement indices, loading) plus
indexed updaters. `ViewerPage` maps over windows; `ImageDisplayWindow`/`InlineControls`
take one `window` + `onChange`. Identical behavior, three windows preserved.
Gate: build passes.

### Phase 4 — Split the giant components
- `RetrievePage.tsx` (639) → `FilesTable`, `FilesToolbar` (search/actions),
  `useFileList` hook (fetch/sort/filter/selection); page becomes orchestration.
- `UploadModal.tsx` (660) → `useUpload` hook (file state, validation, progress) +
  presentational dropzone/file-list subcomponents on the shared dialog shell.
- `ViewerSidePanel.tsx` (597) → control-section subcomponents + `useGifExport` hook
  (gif.js + html2canvas logic).
- `ReconstructModal.tsx` (554) → `ParameterTable` component + validation util; keep the
  documented TODO (no backend call yet).
Gate: build passes; no file in these areas exceeds ~300 lines.

### Phase 5 — Feature-folder restructure + styling cleanup
- Move files to the target structure; update all imports (and `App.tsx`).
- Replace hardcoded `#011F5B` etc. with `theme.palette` tokens; replace sidebar
  pixel-margin hacks with shared constants in `theme.ts`.
- Delete now-empty directories and confirmed-orphan CSS.
- Gates: `npm run build` and `npm run lint` pass; `git status` shows renames not chaos.

## Verification (end of rewrite)
1. `npm run build` and `npm run lint` clean.
2. Grep checks: no axios outside `src/api/`; no `pages/` directory remnants; no
   hardcoded Cognito IDs outside `config/env.ts` fallbacks.
3. Manual smoke (requires backend + AWS creds): file table loads, upload works, viewer
   renders, auth flow intact — to be done by a human or `/verify` with creds present.

## Explicitly out of scope
- New runtime deps (React Query, Zustand) — structure enables them later.
- Backend fixes (tracked in KNOWN-ISSUES B1–B8), reconstruction wiring, simulator
  completion, backend token validation.
- Visual redesign — pixel-identical UI is the goal.
