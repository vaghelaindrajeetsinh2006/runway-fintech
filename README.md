# ✨ Runway — Make ₹10,000 Last 30 Days

**Runway** is a modern, interactive personal finance web application designed for Gen Z. It helps users manage a limited ₹10,000 budget over 30 days, track spending, plan savings, manage financial commitments, and simulate financial decisions before making them.

Rather than being just another expense tracker, Runway connects daily spending, upcoming bills, savings goals, subscriptions, financial forecasts, risk levels, and overall financial health in one interactive experience.

## 🎯 Problem Statement

Young adults often struggle to balance everyday expenses, recurring commitments, savings goals, and unexpected costs within a limited budget.

Runway addresses this challenge by allowing users to understand their current financial position, explore possible financial decisions, and see how those decisions could affect their remaining balance and projected financial health.

## 🚀 Features

### 📊 Interactive Dashboard

* Track your available balance and remaining budget.
* View your safe daily spending allowance.
* Monitor progress through a 30-day budgeting period.
* Explore projected balance and financial risk.
* Review upcoming commitments and savings goals.
* Receive insights and alerts based on financial data.

### 💸 Transaction Management

* Record income and expenses.
* Organize expenses by category.
* Search and filter transactions.
* Edit or delete existing entries.
* Visualize spending patterns through charts.

### 📅 Commitments & Subscriptions

* Manage upcoming financial commitments.
* Track recurring subscriptions and their costs.
* Activate or pause subscriptions.
* Understand how future bills affect your available budget.

### 🎯 Savings Goals

* Create and manage savings goals.
* Set target amounts and deadlines.
* Track savings progress.
* Record contributions and review goal status.

### 🧪 Decision Lab

Explore potential financial decisions before applying them.

* Simulate purchases and other financial changes.
* Compare financial indicators before and after a decision.
* Review potential changes to your balance, spending allowance, forecast, risk, and savings goals.
* Explore alternative decisions.
* Apply a selected decision to the main application state or discard the simulation.

### ⚡ Unexpected Expense Simulation

Explore how unexpected expenses can affect your financial plans and evaluate possible ways to manage them.

### ⏳ Time Simulation

* Advance through the 30-day budgeting period.
* Review how expenses and financial commitments affect your balance over time.
* Explore projected financial outcomes.

### 📈 Financial Insights

* Analyze spending by category.
* Identify significant expenses.
* Review spending patterns.
* Understand projected financial outcomes.

### 🏁 Monthly Summary

Review your financial progress, savings, spending, and overall budget position at the end of the simulation.

### 💾 Persistent Local Data

Runway uses browser storage to preserve supported application data between sessions. Demo data can be restored using the reset option.

## 🛠️ Technology Stack

| Technology    | Purpose                                 |
| ------------- | --------------------------------------- |
| React 18      | Component-based user interface          |
| TypeScript    | Type-safe application development       |
| Vite          | Development server and production build |
| Tailwind CSS  | Responsive user interface styling       |
| Zustand       | Global state management and persistence |
| Recharts      | Financial charts and data visualization |
| Framer Motion | Animations and transitions              |
| lucide-react  | Icons                                   |
| React Router  | Application navigation                  |
| localStorage  | Client-side data persistence            |

## 🏗️ Project Architecture

The project uses a modular structure that separates application pages, reusable components, shared state, financial calculations, and data models.

```text
runway-fintech/
├── src/
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── Charts.tsx
│   │   ├── OnboardingCard.tsx
│   │   └── ui.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Commitments.tsx
│   │   ├── Goals.tsx
│   │   ├── DecisionLab.tsx
│   │   ├── Insights.tsx
│   │   └── Summary.tsx
│   │
│   ├── store/
│   │   └── useFinanceStore.ts
│   │
│   ├── lib/
│   │   ├── finance.ts
│   │   ├── format.ts
│   │   └── seed.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── README.md
```

### Architecture Highlights

* **Centralized financial logic:** Financial calculations are organized in `src/lib/finance.ts`.
* **Shared application state:** Zustand manages the core financial data used throughout the application.
* **Reusable components:** Common interface elements and charts are separated into reusable components.
* **Typed data models:** TypeScript interfaces and types are maintained in `src/types/index.ts`.
* **Lazy-loaded pages:** Application pages are loaded on demand.
* **Persistent state:** Zustand persistence stores supported data in the browser.

## ⚙️ Getting Started

### Prerequisites

Install the following on your computer:

* [Node.js](https://nodejs.org/)
* npm, which is included with Node.js
* [Git](https://git-scm.com/), if you want to clone the repository

### 1. Clone the Repository

```bash
git clone https://github.com/vaghelaindrajeetsinh2006/runway-fintech.git
```

### 2. Navigate to the Project

```bash
cd runway-fintech
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Development Server

```bash
npm run dev
```

Open the localhost URL displayed in your terminal to access Runway in your browser.

### 5. Build for Production

```bash
npm run build
```

This command runs the TypeScript project build checks and generates the production assets using Vite.

### 6. Preview the Production Build

```bash
npm run preview
```

## 🌐 Deployment on Vercel

Runway can be deployed to Vercel as a frontend application.

1. Push the project to GitHub.
2. Sign in to [Vercel](https://vercel.com/).
3. Import the `runway-fintech` repository.
4. Configure the build settings.

**Build Command**

```bash
npm run build
```

**Output Directory**

```text
dist
```

5. Deploy the application.
6. Open the deployed URL and test the main features.

Ensure that the production build completes successfully and the deployed application is accessible before submitting it for evaluation.

## 📱 Design & User Experience

Runway uses a contemporary fintech-inspired interface designed around clarity, interactive financial information, and practical decision-making.

Design considerations include:

* Responsive layouts for mobile and desktop.
* Dark and light theme support.
* Visual financial indicators.
* Interactive charts and data cards.
* Clear navigation and readable financial values.
* Animated interface elements with reduced-motion support.

## 🔐 Privacy & Data

Runway is a frontend demonstration application.

* Financial information is stored locally in the browser.
* The application does not require a backend for its local demonstration workflow.
* The application does not connect to a user's bank account.
* Clearing browser storage can remove locally saved application data.

Avoid entering sensitive real-world financial or personal information into a demonstration environment.

## 🧮 Financial Simulation

Runway demonstrates how budgeting decisions can influence a simulated financial plan.

The application models concepts such as:

* Available balance.
* Income and expenses.
* Upcoming financial commitments.
* Subscription charges.
* Savings goals.
* Daily spending allowance.
* Projected end-of-period balance.
* Financial risk and health indicators.

Forecasts and health indicators are estimates based on the application's calculation rules and available data. They are intended for educational purposes and should not be treated as professional financial advice.

## 🎓 Project Purpose

Runway was developed as a frontend web development project focused on interactive financial planning, responsive design, state management, and decision simulation.

It explores how a consumer-facing financial application can help users understand the consequences of everyday spending choices.

## 📄 License

This repository is intended for educational and hackathon use. Add an appropriate open-source license before distributing the project under specific reuse permissions.
