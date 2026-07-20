# SDLC & process workflow

## Why this exists

Written after a session where the actual pattern was: a change requested in chat → implemented
directly on `main` → DB migrations pushed straight to the single production Supabase project
from an ad hoc terminal (including a live `ALTER TABLE ... DROP CONSTRAINT` hotfix) → a shipped
commit sat un-pushed to `origin/main`, unnoticed, until someone asked why a feature wasn't live →
and separately, a cloud AI session applied its own untracked schema change directly to
production with a broken foreign key that any review gate would have caught before it shipped.
None of this was any one mistake — it's what "ask an AI in chat, it ships" looks like with no
process around it.

## What already exists in this repo (use it, don't rebuild it)

- **PR template**: `.github/pull_request_template.md`
- **Issue templates**: `.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`
- **CI**: `.github/workflows/ci.yml` — build, lint, `tsc --noEmit` on push/PR to `main`/`staging`
- **Security scanning**: `.github/workflows/security.yml` — CodeQL + npm audit, weekly + on
  push/PR to `main`
- **Dependabot**: `.github/dependabot.yml`
- **Release automation**: `.github/workflows/release.yml` — tags matching `v*.*.*` auto-generate
  a GitHub Release with a changelog
- **Branches**: `staging` exists (locally and on `origin`), intended as an integration branch

## Deploy mechanism (resolved 2026-07-20)

**Vercel**, connected via GitHub integration (no `vercel.json`/`.vercel` in the repo — configured
in the Vercel dashboard, not tracked in-repo). Confirmed by observation: pushing to `main` earlier
this session made snewweb.org update live, and opening PR #14 against `staging` produced a Vercel
preview deployment + a "Vercel Preview Comments" check. Standard zero-config Vercel behavior:
`main` is the production branch (deploys on push), every other branch/PR gets its own preview URL.
This means the "committed but not live" failure mode from earlier this session was really "not
pushed to `main`" — Vercel itself deploys automatically and immediately once code lands there, so
the fix is upstream of Vercel: don't let unmerged work sit un-pushed, not "add a deploy step."

## What's genuinely missing

- **Single Supabase environment.** `supabase/config.toml` has exactly one `project_id`. CI
  already references `STAGING_SUPABASE_URL`/`STAGING_SUPABASE_ANON_KEY` secrets, implying a
  staging environment was intended, but no second project exists to point them at.
- **Zero automated tests.** `playwright` is an installed dependency with no config, no test
  files, and no `test` script — currently dead weight.
- **No branch protection** observed on `main` — direct pushes are possible today.

## Target workflow

1. **Requirements as issues.** New work starts as a GitHub issue (using the existing templates),
   assigned to whoever's picking it up. Creates a durable, linkable record of *why* before
   *what*, and — now that there are 3 people — prevents two devs from silently starting the same
   work.
2. **Branch + PR, always.** Every change happens on a branch (`type/short-description`, e.g.
   `feat/commentary-moderation`), opened as a PR against `staging`. `main` only receives merges
   from `staging` after validation there — never direct commits, from anyone, including the repo
   owner.
3. **Code review is mandatory, not optional.** Every PR needs at least **1 approval from someone
   other than the author** before merge — this is the main thing that changes with 3 people
   instead of 1. Add a `CODEOWNERS` file (`.github/CODEOWNERS`) so GitHub auto-requests the right
   reviewer; for a 3-person team this can just be one shared owners line to start
   (`* @owner1 @owner2 @owner3`) rather than per-directory carve-ups, which aren't worth the
   overhead yet.
4. **CI as a gate, not a report.** Branch protection on `main` and `staging` requiring `ci.yml`
   and `security.yml` to pass **and** the 1-approval review **before merge is possible**.
   *Repo-admin action — see "Owner actions" below.*
5. **A real staging environment.** A second Supabase project for staging, with the
   already-referenced CI secrets pointed at it for real. Every migration gets applied and
   verified on staging before it ever touches production — this matters more with 3 people
   potentially writing migrations, since collisions/ordering conflicts are now possible.
   *Owner action — billing/account.*
6. **Deploy is already automatic (Vercel) — the fix is process, not tooling.** Vercel deploys
   `main` to production on every push and every other branch to a preview URL, with no CD job
   needed. What actually caused the "committed but not live" incident this session was unmerged
   work sitting un-pushed — which items 1-4 above (issue → branch → reviewed PR → merge) prevent
   structurally, since a PR that's still open can't silently vanish the way an unpushed local
   commit did.
7. **Minimum viable automated testing.** One Playwright smoke spec (load feed, log in, toggle a
   favorite, open the commentary modal) run in CI on every PR — enough to catch "the feature
   doesn't actually render" before merge. Grows as the team does; don't build a full test
   pyramid on day one.
8. **Design docs before big decisions.** `design/` holds ADR-style docs for decisions like
   framework choices (see `design/mobile/mobile-app-strategy.md`) so reasoning survives past any
   one chat session or any one person's memory — now load-bearing with 3 people who need shared
   context, not optional nice-to-have.
9. **Semver releases.** Tag merges to `main` (`v0.x.y`) so `release.yml` produces real
   changelogs — an audit trail of who shipped what, when.

## Team coordination (new — only matters once it's not just one person)

- **Work tracking.** A single GitHub Projects board (Kanban: Backlog / In Progress / In Review /
  Done) driven off issues. Don't adopt full Scrum ceremony (sprints, story points, retros) for a
  3-person team unless it's already familiar and wanted — a lightweight Kanban board with WIP
  limits (e.g. max 1-2 issues in progress per person) gives most of the coordination value with
  far less overhead.
- **PR size.** Keep PRs small enough to review in one sitting (rough guideline: under ~400
  changed lines, excluding generated files like `package-lock.json` or `types.ts`). Large diffs
  — like the ultraplan-generated commentary-feature diff this session, which bundled an unrelated
  cron migration in with the feature — should be split before review, not reviewed as one blob.
- **Merge strategy.** Squash-merge PRs into `staging` so `git log` on `staging`/`main` reads as
  one entry per reviewed change, not per commit-while-iterating.
- **Secrets & access.** Service role keys and Supabase credentials should live in GitHub Actions
  secrets and each dev's local `.env` (never committed — already `.gitignore`d), not passed
  around in chat. Decide now who has direct production Supabase dashboard/SQL access — recommend
  restricting direct prod DB access to the repo owner, with the 2 new devs working exclusively
  through staging + reviewed migrations, at least until the staging environment is proven out.
- **Hotfix path.** Genuine production incidents can branch directly off `main` and fast-track
  review (still requires the 1 approval, just expedited), then get back-merged into `staging` so
  the two branches don't drift. This should stay rare — if it's not rare, staging isn't catching
  what it should be.
- **Onboarding.** The 2 new devs need: repo access, `.env.example` walked through, a staging
  Supabase project invite (once one exists), and a read-through of this doc plus
  `design/mobile/mobile-app-strategy.md` and the architecture notes before their first PR.

## Owner actions (not done unilaterally by an AI session)

- Enable branch protection on `main`/`staging` in GitHub repo settings — require CI +
  1 approval before merge (or explicitly authorize an AI session to do it via `gh api`).
- ~~Add `.github/CODEOWNERS`~~ — done; currently `@Itachi4` only, add the 2 new devs' handles
  once known.
- Grant the 2 new devs repo write access (branch/PR permissions, not direct push to
  `main`/`staging` if protection is configured correctly).
- Provision a second Supabase project for staging and add its URL/anon key as the
  `STAGING_SUPABASE_URL`/`STAGING_SUPABASE_ANON_KEY` GitHub secrets; invite the 2 new devs to it,
  not to the production project.
- ~~Identify the production deploy mechanism~~ — done; it's Vercel, see above.
- Consider disabling Vercel's automatic production deploy on push-to-`main` in favor of
  deploy-on-merge-only once branch protection is enabled, so a merge is always the trigger, never
  a direct push (belt-and-suspenders with branch protection, not a replacement for it).

## Working rule

No direct commits to `main` or `staging`, from anyone. Open an issue, branch, open a PR, get 1
review approval, let CI pass, merge to `staging` first, validate, then promote to `main`. This
applies to AI-assisted sessions too — see the pointer in `CLAUDE.md`.
