# iOS/Android strategy for snewweb.org

Status: proposed, not started. Written 2026-07-20.

## Current state (confirmed against the codebase, not assumed)

- **Not responsive.** `src/components/feed/FilterBar.tsx` is built entirely from fixed-pixel
  inline styles with no media queries. A `useIsMobile()` 768px hook exists
  (`src/hooks/use-mobile.tsx`) but is wired only into the shadcn sidebar — not the main
  feed/filter UI most users touch.
- **No PWA layer at all.** No `manifest.json`, no service worker, no `vite-plugin-pwa` — a clean
  slate.
- **Auth is browser-URL-coupled.** The Supabase client uses PKCE with `detectSessionInUrl: true`
  (`src/integrations/supabase/client.ts:28-36`), and `src/pages/Auth.tsx` hardcodes
  `https://snewweb.org/...` redirect URLs. This works because the app assumes a real browser URL
  bar to complete auth.
- **Browser-only APIs in active use**: `navigator.share`, `navigator.clipboard`, `window.open`
  (share sheet, "record on YouTube Studio" button in `CommentaryModal.tsx`), `window.localStorage`
  (digest prefs, font scale), `BrowserRouter`. All have Capacitor plugin equivalents; none have a
  React Native equivalent without a rewrite.
- **The 3D globe is a mobile-perf landmine.** `src/components/InteractiveGlobeView.tsx`
  (Three.js via `react-globe.gl`) is statically imported — not code-split — and fetches its earth
  texture at runtime from `unpkg.com` rather than a bundled asset. Hurts both PWA offline
  capability and any native shell's bundle size/startup time.
- **UGC risk.** The article-commentary feature (public YouTube/Vimeo links visible to other
  users) has no report/block/moderation flow and no published ToS/contact info. Not a problem for
  the web app today, but a near-certain app-store rejection risk (Apple Guideline 1.2, Google
  Play UGC policy) the moment this ships as a native app.

## Options considered

| Approach | Code reuse | Effort | Notes |
|---|---|---|---|
| **PWA only** | ~100% | Days, once responsive | Installable on Android home screen; iOS PWA support is limited (no push until iOS 16.4+, manual "Add to Home Screen", no store presence) |
| **Capacitor (wrap existing React app)** | ~95% | Weeks | Real App Store/Play Store listings, native shell around the existing SPA, browser APIs map to Capacitor plugins |
| **React Native rewrite** | ~0% (UI layer) | Months | True native feel, but Tailwind/shadcn/react-router/react-globe.gl are all web-only — a second app to build and maintain forever |
| **Flutter rewrite** | 0% | Months+ | Entirely separate stack (Dart), no reuse, no existing team skill in it — hardest to justify here |

**Recommendation: Capacitor, sequenced behind a responsive/PWA pass — not a rewrite.** Wrapping a
non-responsive app in a native shell just native-packages a broken mobile UI, so the responsive
fix has to come first regardless of framework. Once the layout works on a phone, a PWA is nearly
free and gets real mobile usage with zero app-store review risk while store-specific work
(moderation, deep links, signing) happens in parallel.

## Recommended phased approach

1. **Responsive pass** (~2-4 weeks) — fix `FilterBar.tsx` and the main feed layout for phone
   widths; extend `useIsMobile()` usage beyond the sidebar. Also fix the globe: code-split
   `InteractiveGlobeView.tsx` with `React.lazy()`, self-host the earth texture instead of pulling
   from `unpkg.com` at runtime.
2. **PWA layer** (~few days, folded into phase 1) — add `manifest.json`, icons, a service worker
   (e.g. via `vite-plugin-pwa`). Gets installable-on-homescreen mobile presence with zero signing
   or review gate.
3. **UGC moderation, before any store submission** (~2-3 weeks) — basic report/hide/block flow
   for public commentaries, a published ToS/contact page. Hard prerequisite for store approval,
   independent of Capacitor vs. any other framework.
4. **Capacitor integration** (~2-3 weeks) — `capacitor.config.ts` + `ios/`/`android/` projects;
   swap `navigator.share`/`clipboard`/`window.open` for Capacitor's Share/Clipboard/Browser
   plugins; replace ad hoc `window.localStorage` calls with Capacitor Preferences where it
   matters for native persistence. Auth: implement Universal Links (iOS,
   apple-app-site-association) and App Links (Android, assetlinks.json) so Supabase's
   `detectSessionInUrl` PKCE flow completes via deep link instead of a browser URL bar — a
   common first-timer multi-day trap, budget real time for it.
5. **Store prep and submission** (~2-4 weeks elapsed, mostly waiting on review, not dev time) —
   Apple Developer ($99/yr) and Google Play ($25 one-time) accounts, code signing/provisioning,
   icons/screenshots/privacy policy/data-safety forms, submit, handle rejection cycles.

**Realistic total: roughly 3-4 months of calendar time** for a solo/AI-paired dev to get both
apps live in both stores — not weeks. The PWA (end of phase 2) is live well before that, in
~4-6 weeks, and is the meaningful "mobile users can use this today" milestone.

## Biggest risks to flag explicitly

- UGC moderation is a hard store-submission blocker, independent of framework choice — treat as
  a prerequisite phase, not a nice-to-have.
- Universal Links/App Links setup for the PKCE auth deep-link handoff is routinely underestimated
  by first-time Capacitor adopters — budget it as its own task, not a subtask of "add Capacitor."
- The globe's runtime CDN texture fetch and lack of code-splitting will hurt both PWA offline
  behavior and native shell bundle size if not fixed before either ships.
- No existing deploy pipeline means "shipped" and "live" aren't the same thing yet even for the
  web app — worth fixing before adding two more distribution channels (App Store, Play Store) to
  coordinate. See `design/process/sdlc.md`.

## Verification / how to validate this recommendation before committing further

- After phase 1: run a Lighthouse mobile audit + manually test the feed/filter UI at 375px and
  414px widths (iPhone SE / standard Android) in Chrome DevTools device mode.
- After phase 2: install the PWA via "Add to Home Screen" on a real Android phone and (if
  available) iOS Safari; confirm offline behavior doesn't break on the globe view.
- After phase 4: run the app via `npx cap run ios` / `npx cap run android` on a simulator/emulator,
  confirm the PKCE auth deep link completes end-to-end (sign up, click email link, land back in
  the app authenticated) before spending time on store assets.
- Before submission: read Apple's App Review Guideline 1.2 (UGC) and Google Play's UGC policy
  directly against the moderation flow built in phase 3, not just from memory of what's "usually"
  required.
