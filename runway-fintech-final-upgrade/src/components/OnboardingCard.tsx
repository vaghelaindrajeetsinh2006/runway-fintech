import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Compass, Sparkles, Wallet } from 'lucide-react';
import { Button, Card, Field, Input } from './ui';
import { useFinanceStore } from '../store/useFinanceStore';

export function OnboardingCard() {
  const completed = useFinanceStore((state) => state.onboardingComplete);
  const complete = useFinanceStore((state) => state.completeOnboarding);
  const skip = useFinanceStore((state) => state.skipOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(useFinanceStore.getState().profile.name || 'Alex');
  const [mode, setMode] = useState<'demo' | 'empty'>('demo');
  const [goal, setGoal] = useState('Goa trip');
  if (completed) return null;

  return <AnimatePresence mode="wait">
    <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
      <Card className="relative overflow-hidden border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-[var(--card)] to-cyan-400/5">
        <div className="absolute -right-7 -top-10 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500"><Compass size={18} /></div><span className="text-xs font-bold uppercase tracking-[.16em] text-violet-500">Quick setup · {step + 1}/3</span></div>
            <button type="button" onClick={skip} className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--soft)]">Skip for now</button>
          </div>
          {step === 0 && <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr] md:items-center">
            <div><h2 className="text-xl font-bold sm:text-2xl">Let’s give your money a little runway.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">A 30-day money cockpit for your ₹10,000 budget. No lectures, just clearer trade-offs before you tap pay.</p></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"><Field label="What should we call you?"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" maxLength={32} /></Field><Button className="mt-3 w-full" onClick={() => setStep(1)}>Make it mine <ArrowRight size={16} /></Button></div>
          </div>}
          {step === 1 && <div><h2 className="text-xl font-bold">Start with a real-ish picture.</h2><p className="mt-2 text-sm text-[var(--muted)]">Choose how you want to begin. You can reset to demo data later.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" aria-pressed={mode === 'demo'} onClick={() => setMode('demo')} className={`rounded-2xl border p-4 text-left transition ${mode === 'demo' ? 'border-violet-500 bg-violet-500/10' : 'border-[var(--border)] bg-[var(--panel)]'}`}><div className="flex items-center justify-between"><Sparkles className="text-violet-500" size={19} />{mode === 'demo' && <Check size={17} className="text-violet-500" />}</div><div className="mt-3 font-semibold">Use demo data</div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">An interesting budget with bills, subscriptions and a few real-life spends.</p></button>
            <button type="button" aria-pressed={mode === 'empty'} onClick={() => setMode('empty')} className={`rounded-2xl border p-4 text-left transition ${mode === 'empty' ? 'border-violet-500 bg-violet-500/10' : 'border-[var(--border)] bg-[var(--panel)]'}`}><div className="flex items-center justify-between"><Wallet className="text-cyan-500" size={19} />{mode === 'empty' && <Check size={17} className="text-violet-500" />}</div><div className="mt-3 font-semibold">Start fresh</div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">A clean ₹10,000 runway. Add your own transactions and commitments.</p></button>
          </div><div className="mt-4 flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft size={15} />Back</Button><Button onClick={() => setStep(2)}>Next <ArrowRight size={15} /></Button></div></div>}
          {step === 2 && <div className="grid gap-5 md:grid-cols-[1fr_.8fr] md:items-end">
            <div><h2 className="text-xl font-bold">Give future-you a reason.</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Add a starter savings goal. Totally optional — small goals count too.</p><Field className="mt-4" label="First goal (optional)"><Input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="e.g. Concert tickets" maxLength={48} /></Field></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"><div className="text-xs text-[var(--muted)]">Starting budget</div><div className="mt-1 text-3xl font-black">₹10,000</div><div className="mt-1 text-xs text-[var(--muted)]">30 days · no bank connection</div><Button className="mt-4 w-full" onClick={() => complete({ name, mode, firstGoalTitle: goal })}>Enter my runway <Check size={16} /></Button><button type="button" onClick={() => setStep(1)} className="mt-3 w-full text-center text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">Back to setup options</button></div>
          </div>}
          <div className="mt-5 flex gap-1.5" aria-label={`Setup step ${step + 1} of 3`}>{[0, 1, 2].map((index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-[var(--soft)]'}`} />)}</div>
        </div>
      </Card>
    </motion.div>
  </AnimatePresence>;
}
