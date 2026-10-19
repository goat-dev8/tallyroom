import Link from 'next/link';
import { ArrowRight, Binary, BadgeCheck, Scale, Layers, Braces, GitBranch, FileSpreadsheet, ListOrdered, GitCompareArrows, Trophy } from 'lucide-react';
import { Logo } from '../components/logo';
import { HeroDemo } from '../components/hero-demo';
import { HeroVisual } from '../components/hero-visual';
import { MotionRoot } from '../components/motion-root';
import { Badge, buttonVariants } from '../components/ui';
const PARITY = [
  { name: 'Maine 2018', race: 'U.S. House District 2', rounds: 2, ballots: '296,077', winner: 'Golden' },
  { name: 'Alaska 2022', race: 'U.S. House special general', rounds: 2, ballots: '192,289', winner: 'Peltola' },
  { name: 'New York City 2021', race: 'Democratic primary, Mayor', rounds: 8, ballots: '947,932', winner: 'Adams' },
];
const FEATURES = [
  { icon: Binary, t: 'Exact arithmetic', d: 'Every surplus and transfer is a rational number. No floating point, no rounding drift.' },
  { icon: BadgeCheck, t: 'Certified parity', d: 'Tests reproduce official round-by-round results from public cast vote records, ballot for ballot.' },
  { icon: Scale, t: 'Jurisdiction rules', d: 'Overvotes, skipped ranks, duplicates, batch elimination and tie-breaks are explicit, named options.' },
  { icon: Layers, t: 'IRV and multi-seat STV', d: 'Single-winner instant runoff and Gregory-method STV with Droop or Hare quotas.' },
  { icon: Braces, t: 'Open JSON API', d: 'POST ballots to /api/tabulate and get every round, transfer and inactive category back.' },
  { icon: Scale, t: 'Strictly neutral', d: 'Counting math and official figures only. No commentary, no predictions, no opinions.' },
];
const STEPS = [
  { icon: FileSpreadsheet, t: 'Read the ballots', d: 'Cast vote records become ranked patterns with overvotes and skips preserved.' },
  { icon: ListOrdered, t: 'Count first choices', d: 'Each ballot counts for its highest-ranked continuing candidate.' },
  { icon: GitCompareArrows, t: 'Eliminate and transfer', d: 'The last-place candidate is out; their ballots move to the next valid ranking.' },
  { icon: Trophy, t: 'Reach a majority', d: 'Rounds repeat until one candidate holds more than half of continuing ballots.' },
];
export default function Landing() {
  return (
    <main className="relative overflow-x-clip">
      <MotionRoot />
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[900px]" /><div className="glow pointer-events-none absolute inset-x-0 top-0 h-[700px]" />
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 text-sm">
          <Link href="/" aria-label="Tallyroom home"><Logo /></Link>
          <a href="#parity" className="hidden text-mute hover:text-fg sm:block">Parity</a><a href="#how" className="hidden text-mute hover:text-fg sm:block">How it counts</a><a href="#api" className="hidden text-mute hover:text-fg sm:block">API</a>
          <div className="ml-auto flex items-center gap-2">
            <a href="https://github.com/goat-dev8/tallyroom" className={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-label="Source on GitHub"><GitBranch className="h-4 w-4" /></a>
            <Link href="/app" className={buttonVariants({ size: 'sm' })}>Open dashboard</Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pt-20 pb-16 md:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <Badge data-reveal className="mb-6"><span className="h-1.5 w-1.5 rounded-full bg-win" /> Reproduces 3 certified elections exactly</Badge>
            <h1 className="text-grad text-5xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-7xl">Every round.<br />Every ballot.<br />Exactly.</h1>
            <p className="mt-6 max-w-xl text-lg text-mute">Tallyroom is an open ranked-choice and STV counter. Load a cast vote record, pick the jurisdiction's rules, and watch the count unfold, with numbers that match the official result to the last vote.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className={buttonVariants({ variant: 'tally' })}>Count an election <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how" className={buttonVariants({ variant: 'outline' })}>How counting works</a>
            </div>
          </div>
          <div className="relative hidden h-80 lg:block"><HeroVisual /></div>
        </div>
        <div className="relative mt-14" data-reveal><HeroDemo /></div>
      </section>

      <section id="parity" className="mx-auto max-w-6xl px-5 py-20">
        <p data-reveal className="text-sm text-tally">Parity</p>
        <h2 data-reveal className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">Checked against the official record, not against itself.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PARITY.map(p => (
            <div key={p.name} data-reveal className="card p-5">
              <div className="flex items-center justify-between"><span className="font-medium">{p.name}</span><Badge className="text-win"><BadgeCheck className="h-3 w-3" /> exact</Badge></div>
              <p className="mt-1 text-sm text-mute">{p.race}</p>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-mute">Rounds</dt><dd className="mt-1 text-base tnum">{p.rounds}</dd></div><div><dt className="text-mute">Ballots</dt><dd className="mt-1 text-base tnum">{p.ballots}</dd></div><div><dt className="text-mute">Winner</dt><dd className="mt-1 text-base">{p.winner}</dd></div></dl>
              <svg viewBox="0 0 120 24" className="mt-5 h-6 w-full" aria-hidden>{Array.from({ length: 24 }, (_, i) => <rect key={i} x={i * 5} y={24 - (6 + ((i * 37) % 18))} width="3" height={6 + ((i * 37) % 18)} rx="1" fill={i % 5 === 4 ? '#f5b83d' : '#ffffff22'} />)}</svg>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: I, t, d }) => (
            <div key={t} data-reveal className="group bg-ink p-6 transition-colors hover:bg-panel">
              <I className="h-5 w-5 text-tally transition-transform group-hover:-translate-y-0.5" /><h3 className="mt-4 font-medium">{t}</h3><p className="mt-2 text-sm text-mute">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20" data-steps>
        <p className="text-sm text-tally">How it counts</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Instant runoff, one round at a time.</h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <ol className="space-y-4">
            {STEPS.map(({ icon: I, t, d }, i) => (
              <li key={t} data-step className="card relative overflow-hidden p-5">
                <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5"><I className="h-4 w-4 text-tally" /></span><span className="text-xs text-mute tnum">0{i + 1}</span><h3 className="font-medium">{t}</h3></div>
                <p className="mt-2 pl-11 text-sm text-mute">{d}</p>
                <span data-step-bar={i} className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-tally" />
              </li>
            ))}
          </ol>
          <svg viewBox="0 0 400 300" className="card h-auto w-full p-4" aria-label="Diagram of ballots flowing between rounds">
            {[0, 1, 2].map(c => <g key={c}>{[0, 1, 2, 3].slice(0, 4 - c).map(r => <rect key={r} x={30 + c * 140} y={40 + r * 60} width="14" height={40 - c * 2} rx="3" fill={['#f5b83d', '#7c8cff', '#3ddc97', '#ff6b6b'][r]} />)}<text x={37 + c * 140} y={22} textAnchor="middle" className="fill-[#8a8f98] text-[11px]">Round {c + 1}</text></g>)}
            <path data-flow d="M44 220 C 110 220, 110 100, 170 100 M44 160 C 110 160, 110 40, 170 40 M184 160 C 250 160, 250 40, 310 40 M184 100 C 250 100, 250 100, 310 100" stroke="#ff6b6b" strokeOpacity=".5" strokeWidth="3" fill="none" strokeDasharray="600" />
            <text x="200" y="285" textAnchor="middle" className="fill-[#8a8f98] text-[11px]">Eliminated ballots move to their next continuing choice</text>
          </svg>
        </div>
      </section>

      <section id="api" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div data-reveal><p className="text-sm text-tally">API</p><h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">One request, the whole count.</h2>
            <p className="mt-4 text-mute">Send ballots as <code className="font-mono text-fg">count,A&gt;B&gt;C</code> lines. Use <code className="font-mono text-fg">_</code> for a skipped rank and <code className="font-mono text-fg">[A=B]</code> for an overvote. Add <code className="font-mono text-fg">seats</code> for STV.</p></div>
          <pre data-reveal className="card overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[#c9ccd2]"><span className="text-mute">$</span> curl -X POST /api/tabulate \{'\n'}  -d <span className="text-tally">{`'{"ballots":"5,A>B\\n4,B>C\\n2,C>B"}'`}</span>{'\n\n'}<span className="text-mute">{'{'}</span> <span className="text-iris">"method"</span>: "irv", <span className="text-iris">"winner"</span>: <span className="text-win">"B"</span>,{'\n'}  <span className="text-iris">"rounds"</span>: [ … ] <span className="text-mute">{'}'}</span></pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24"><div data-reveal className="card flex flex-col items-start gap-6 p-10 md:flex-row md:items-center"><div><h2 className="text-2xl font-semibold tracking-tight">Run a count in your browser.</h2><p className="mt-2 text-mute">Pick a certified election or upload your own ballots.</p></div><Link href="/app" className={`${buttonVariants({ variant: 'tally' })} md:ml-auto`}>Open dashboard <ArrowRight className="h-4 w-4" /></Link></div></section>
      <footer className="border-t border-line"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 text-sm text-mute"><Logo className="text-fg" /><span>Open source. Official figures only.</span><a className="ml-auto hover:text-fg" href="https://github.com/goat-dev8/tallyroom">GitHub</a><a className="hover:text-fg" href="/api/health">API status</a></div></footer>
    </main>
  );
}
