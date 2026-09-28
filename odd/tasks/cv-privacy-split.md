# CV Privacy Split (private/ + public templates)

## Objective
Make the project shareable while keeping Darwin's personal CV data local-only: personal masters move to gitignored `private/`, neutral example templates ship publicly, and git history is rewritten to remove every personal identifier.

## Problem / Why
User asked for new masters for other people to use, with his current masters kept in a `private/` folder included in `.gitignore` (only he has access). Exploration found the old masters were already committed AND pushed to GitHub — ignoring the folder alone would not remove them from history, so a history rewrite + force push was required (user approved "Limpiar historial"). User also approved "Neutralizar ligero": generic `author` in package.json, neutral README/scripts, premiums staying only in `private/`.

## Scope (authorized)
- Move `data/cv-master.md` + `data/cv-master-en.md` → `private/` (with folder-local .gitignore and README).
- Create neutral templates `data/examples/cv-example-{es,en}.md` (placeholder names, contact, achievements).
- Update package.json scripts: `cv*` → examples, new `cv:private` → personal masters → `private/out/`.
- Neutralize package.json `author`, rewrite README quick-path/structure/usage.
- Remove personal data from git history (filter-branch) and force-push origin/main.
- Sanitize personal identifiers from odd/tasks logs.

## Constraints
- Old masters must NOT be deleted from disk (user: "no los borres").
- Everything under `private/` stays untracked (root `.gitignore` has `private/`; folder has its own `*` ignore with `!.gitignore`/`!README.md` exceptions).
- Old PDFs (`out/GomezD_CV_*.pdf`) relocated to `private/out/` (ignored).
- No Co-Authored-By / no AI attribution in commits.

## Tasks
- [x] T1: ODD doc + engram mirror (this document, topic `odd/cv-privacy-split/tasks`).
- [x] T2: Created `private/`, moved masters, added nested + root gitignore entries, `git rm -r --cached data`.
- [x] T3: Authored neutral templates ES + EN in `data/examples/` (same markdown subset, placeholder data).
- [x] T4: Updated package.json scripts (cv, cv:es, cv:en, cv:tsx → examples; cv:private → personal) + generic author.
- [x] T5: README rewrite for the private/ + examples structure.
- [x] T6: `pnpm run cv` generates 1-page example PDFs (ES name "Nombre Apellido", EN "Example Name"); private PDFs regenerate into `private/out/` (2 pages). All content/no-leak assertions pass.
- [x] T7: Work-unit commit `e1b9e08` (single commit: templates + private migration + gitignore + README + scripts).
- [x] T8: History rewrite: sanitized odd log + removed masters from all historical commits (filter-branch, 2 passes), refs/original deleted, reflog expired, gc --prune=now. Final scan: 7 commits, zero matches for personal identifiers.
- [x] T9: Force-pushed `main` to GitHub (`3bc8d8e...e1b9e08`), verified via fresh clone: 7 commits, no personal data in any commit.
- [x] T10: Sanitized `odd/tasks/md-to-pdf-cv.md` (filenames + remote URL) and committed as `docs: sanitize personal identifiers from feature log`.

## Route evidence
- Route: delegated direct for exploration reads; direct inline for the moves/edits (small, mechanical, fully understood 4-file surface).
- TDD: no test infra in project; verification = functional PDF generation + pypdf content assertions + git grep over ALL history + fresh-clone verification. Disclosed.

## Result
DONE. Repo is publicly shareable with zero personal data in any commit; personal masters live in `private/` (gitignored) and regenerate via `pnpm cv:private` → `private/out/`.

## Key learnings
1. BSD sed inside filter-branch tree-filter needs `sed -i ""` macOS syntax; `_ 20__` escaped quoting for repo paths.
2. `git filter-branch --prune-empty` refuses master paths in index if they're also in current tree — must combine with `git rm --cached` + re-commit BEFORE rewriting.
3. `git clone` of private-repo over SSH in temp dir is the ultimate verification: scan `$(git rev-list --all)` there for leaked identifiers.
4. pypdf assertion set: page count is content-relative (example = 1 page, personal = 2 pages).
