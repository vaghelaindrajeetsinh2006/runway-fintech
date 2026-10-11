# Runway — Make ₹10,000 Last 30 Days

Runway is a Gen Z-focused personal-finance simulation that helps a user explore how a ₹10,000 budget could last over a 30-day period. It brings spending, income, commitments, subscriptions, savings goals, risk indicators and a forward forecast into one client-side application.

> This is an educational budgeting simulation, not a bank connection or professional financial advice.

## Features

- Dashboard with available balance, safe daily allowance, financial risk, health score, alerts and a 30-day forecast.
- Searchable income and expense entries with category/day filters.
- Future commitments and subscriptions that are charged as the simulated timeline advances.
- Savings goals and contributions reflected in the shared finance state.
- Decision Lab previews for purchases, new subscriptions, daily/weekly habits, subscription cancellation, extra income, goal contributions, skipping a commitment and rescheduling a bill.
- Unexpected-expense scenarios, a day slider, next-day/skip-seven-day controls, spending insights and a month-end summary.
- Zustand state persistence through guarded localStorage access and schema sanitization; reset to demo data is available.
- Responsive dark/light interface, keyboard-visible focus, labelled controls, and reduced-motion support.

## Technology

React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, Framer Motion, lucide-react and React Router. The application has no backend and no external API requirement.

## Local development

Requires Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Run the financial model tests and quality checks before publishing:

```bash
npm run lint
npm test
npm run build
```

Or run all checks in one command:

```bash
npm run verify
```

## Architecture

- `src/lib/finance.ts` contains pure balance, forecast, risk, health-score and decision-simulation rules.
- `src/lib/sanitize.ts` validates persisted data loaded from browser storage.
- `src/store/useFinanceStore.ts` is the single source of truth for the finance state and validated state transitions.
- `src/pages/` contains the major user flows.
- `src/components/` contains shared layout, input, dialog and chart components.
- `tests/finance.test.cjs` checks the financial model, draft purity, validation, sanitization, subscriptions, goals and weekly decisions.

## GitHub Pages deployment

The repository is configured for GitHub Pages project URLs at `/runway-fintech/` and uses `HashRouter` so navigation works when refreshed on Pages.

1. In repository **Settings → Pages**, select **GitHub Actions** as the publishing source.
2. Run `npm install` after changing dependencies so `package-lock.json` stays in sync.
3. Commit and push the project to `main`.
4. Wait for **Actions → Verify and deploy Runway** to finish green.
5. Open `https://vaghelaindrajeetsinh2006.github.io/runway-fintech/` and test on mobile and desktop.

The workflow runs lint, model tests and a production build before publishing. A green deployment verifies those automated checks, but manual browser testing is still required for interaction and accessibility checks.

## Data and privacy

Budget information is stored locally in the user's browser. It is not synced to a bank or server. Resetting browser storage may remove saved state. Do not enter sensitive real-world financial information into a demonstration app.
