import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppShell } from './components/AppShell';
import { useFinanceStore } from './store/useFinanceStore';
import { Card } from './components/ui';
import { Wallet } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Commitments = lazy(() => import('./pages/Commitments'));
const Goals = lazy(() => import('./pages/Goals'));
const DecisionLab = lazy(() => import('./pages/DecisionLab'));
const Insights = lazy(() => import('./pages/Insights'));
const Summary = lazy(() => import('./pages/Summary'));

function LoadingScreen() {
  return <div className="space-y-5" aria-label="Loading Runway"><div className="h-8 w-48 animate-pulse rounded-xl bg-[var(--soft)]" /><div className="grid gap-4 md:grid-cols-3"><div className="h-40 animate-pulse rounded-3xl bg-[var(--soft)]" /><div className="h-40 animate-pulse rounded-3xl bg-[var(--soft)]" /><div className="h-40 animate-pulse rounded-3xl bg-[var(--soft)]" /></div><Card className="flex h-64 items-center justify-center"><div className="text-center"><Wallet size={28} className="mx-auto text-violet-500" /><div className="mt-2 text-sm text-[var(--muted)]">Getting your money in order…</div></div></Card></div>;
}

export default function App() {
  const theme = useFinanceStore((state) => state.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <MotionConfig reducedMotion="user"><Routes>
    <Route element={<AppShell />}>
      <Route index element={<Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense>} />
      <Route path="transactions" element={<Suspense fallback={<LoadingScreen />}><Transactions /></Suspense>} />
      <Route path="commitments" element={<Suspense fallback={<LoadingScreen />}><Commitments /></Suspense>} />
      <Route path="goals" element={<Suspense fallback={<LoadingScreen />}><Goals /></Suspense>} />
      <Route path="decision-lab" element={<Suspense fallback={<LoadingScreen />}><DecisionLab /></Suspense>} />
      <Route path="insights" element={<Suspense fallback={<LoadingScreen />}><Insights /></Suspense>} />
      <Route path="summary" element={<Suspense fallback={<LoadingScreen />}><Summary /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes></MotionConfig>;
}
