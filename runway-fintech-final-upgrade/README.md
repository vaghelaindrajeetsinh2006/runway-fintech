# Runway — Make ₹10,000 Last 30 Days

**A private, browser-based Gen Z budgeting simulator** for exploring how a ₹10,000 budget may last across a 30-day month. Runway connects balance, income, discretionary spending, unexpected costs, commitments, subscriptions, savings goals, forecast, risk and financial-health signals in one shared financial model.

> Educational simulation only. Runway does not connect to a bank or provide professional financial advice. All demo finance data remains in the browser.

## What makes Runway different

### Decision Lab — preview before you apply

The signature experience lets a user model a money move before committing to it. Users can choose a decision type or describe one in ordinary language, for example:

- `Buy sneakers for ₹1,800`
- `₹150 coffee daily`
- `Pause Netflix`
- `Save ₹300 for Goa trip`

A local, deterministic interpreter converts supported wording into an editable draft. It uses no external AI service or API, sends no data to a server, and does **not** mutate the financial state. The user reviews the fields, compares before/after balance, safe daily allowance, projected month-end balance, risk, health and goal status, then explicitly chooses **Apply decision** or **Discard**.

### Connected budgeting tools

- **Dashboard:** current balance, safe daily allowance, day counter, runway and financial-health signals, alerts, upcoming bills, goals and projected balance.
- **Transactions:** search and filter income/expenses, add/update/delete entries, and compare category spending.
- **Commitments & subscriptions:** manage bill dates, active subscriptions and their future impact.
- **Savings goals:** track progress, add contributions and calculate deadline status from the shared model.
- **Unexpected costs:** preview example life events and possible offsets before applying.
- **Time simulation:** advance a day, skip seven days or scrub the simulated day; charges are reflected in the shared state.
- **Insights & recap:** review category patterns, biggest leaks, projected vs actual outcomes and month-end results.

## Evaluation-oriented engineering

The codebase intentionally separates financial calculations from UI components and uses a single Zustand store as the source of truth. Charting code is loaded only when a chart is close to the viewport, so users can begin reading the dashboard before the Recharts module is needed. A top-level error boundary gives lazy-loaded screens an accessible recovery path.

- Pure finance calculations and forecasts live in `src/lib/finance.ts`.
- Rule-based Decision Lab language interpretation lives in `src/lib/decisionParser.ts`.
- Persisted data validation lives in `src/lib/sanitize.ts`.
- Shared, persisted state and transitions live in `src/store/useFinanceStore.ts`.
- `src/components/Charts.tsx` defers the heavier chart implementation in `ChartsImpl.tsx`.
- `src/components/ErrorBoundary.tsx` provides a recovery screen if a route or lazy-loaded chunk fails.
- `tests/finance.test.cjs` covers financial invariants, draft purity, subscriptions, goals, timelines, sanitization and supported plain-language decision prompts.

## Stack

React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, Recharts, Framer Motion, lucide-react and React Router. No backend or external API is required. The production build is a static client-side application.

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Before publishing, run the same checks locally that are used in the repository workflow:

```bash
npm run verify
npm audit
```

`npm run verify` runs ESLint, the financial model and decision-parser tests, TypeScript checks and the Vite production build. Review `npm audit` output rather than using `npm audit fix --force` blindly: forced major-version changes may break compatibility.

## Architecture / financial integrity

`src/lib/finance.ts` is the calculation boundary for current balance, upcoming obligations, goal reserve, safe daily allowance, day-by-day forecast, projected end balance, estimated zero day, runway, risk level and the weighted health score. UI pages should display selectors/calculations from this module rather than duplicate finance math. Draft decisions are calculated against an in-memory copy; the persistent Zustand state changes only when the user applies a valid draft.

The simulator is deterministic for the same data and day. Forecasts are estimates based on demo inputs and the model's rules, not guarantees about future real-world events.

## Accessibility and responsive design

The app includes semantic page landmarks, a keyboard-visible skip link, focus rings, labelled controls, text labels alongside risk colours, reduced-motion styling, chart text alternatives, a recovery boundary for unexpected route/render failures, and mobile-first navigation. Manually test keyboard-only navigation, zoom, contrast and screen widths because automated lint/tests cannot certify full WCAG conformance.

## Evaluation traceability

| Evaluation area | Implementation evidence | How to verify |
|---|---|---|
| Problem alignment | Dashboard, Transactions, Commitments, Goals, Decision Lab, Life Happens, Insights and Summary | Walk through a complete decision and then advance time |
| Interactivity | Single Zustand store; draft-only simulations; apply/discard/undo | Change a draft, confirm no balance change before Apply, then confirm every relevant panel updates |
| Innovation | Local plain-language decision interpreter plus editable financial-impact preview | Try the four Decision Lab examples and inspect the generated draft before applying |
| Reliability | Pure finance model and 23 deterministic Node tests | Run `npm test` |
| Input/data security | Positive amount validation, text length/control-character sanitization and persisted-state normalization | Run model tests, then test empty, invalid and oversized inputs manually |
| Runtime efficiency | Route-level lazy loading plus `IntersectionObserver`-gated Recharts module | Use browser Network tools and Lighthouse on the deployed URL |
| Accessibility | Skip link, landmarks, focus styles, descriptive chart names and reduced motion | Navigate with keyboard and inspect accessibility tree/contrast manually |
| Documentation | This README covers features, architecture, verification, privacy and deployment | Follow the local run and GitHub Pages instructions below |

## Final self-test checklist

- [ ] `npm run verify` passes from the same folder that will be pushed.
- [ ] `npm audit` is reviewed; do not force major upgrades blindly.
- [ ] Decision Lab does not write to the store until Apply; Discard leaves the original plan unchanged.
- [ ] Applying a decision updates balance, obligations, safe allowance, goal status, forecast, risk and health consistently.
- [ ] Test invalid/empty/very large amounts, no goals, no subscriptions and the Day 30 terminal state.
- [ ] Advance one day and seven days; confirm charges and notifications correspond to due days.
- [ ] Check the deployed URL in a fresh/incognito tab and inspect the browser console.
- [ ] Test 360px, 768px, 1024px and 1440px widths plus keyboard-only navigation.

## GitHub Pages deployment

The repository is configured for the project URL `/runway-fintech/` and uses `HashRouter` so direct navigation and refresh work under GitHub Pages.

1. In repository **Settings → Pages**, select **GitHub Actions** as the source.
2. Make sure dependency changes are reflected in `package-lock.json` by running `npm install` and committing the lockfile.
3. Push the verified code to `main`.
4. Wait for **Actions → Verify and deploy Runway** to finish green. The workflow checks out the code, installs dependencies, runs `npm run verify`, checks for high-severity dependency advisories and publishes `dist/` only after the verification job succeeds.
5. Open [the live Runway app](https://vaghelaindrajeetsinh2006.github.io/runway-fintech/) and test the real deployment on mobile and desktop.

A green build is necessary, but not a substitute for checking the live user flows.

## Privacy

Budget state is stored locally in the browser. It is not synced to a bank or server. Clearing browser storage may remove local demo data. Do not enter sensitive real-world financial information into this demonstration application.
