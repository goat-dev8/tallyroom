import Link from 'next/link';
import { ArrowRight, ArrowUpRight, GitBranch } from 'lucide-react';
import { Logo } from '../components/logo';
import { MobileNav } from '../components/mobile-nav';
import { HeroDemo } from '../components/hero-demo';
import { HeroVisual } from '../components/hero-visual';
import { ThreadsBg } from '../components/threads-bg';
import { MotionLazy } from '../components/motion-lazy';
import { CountScene } from '../components/count-scene';
import { GlyphBallot, GlyphMajority, GlyphRank, GlyphTransfer, APPROX } from '../components/glyphs';
import { buttonVariants } from '../components/ui';
import { CATALOG, CERTIFIED, fmt } from '../lib/catalog';

const STEPS = [
  { g: GlyphBallot, t: 'Read every ballot', d: 'Cast vote records become ranked patterns. Overvotes, skipped ranks and repeats are kept, not cleaned away.' },
  { g: GlyphRank, t: 'Count first choices', d: 'Each ballot counts once, for its highest-ranked candidate who is still in the race.' },
  { g: GlyphTransfer, t: 'Eliminate and transfer', d: 'The last-place candidate is out. Their ballots move to the next valid ranking, or become inactive.' },
  { g: GlyphMajority, t: 'Reach a majority', d: 'Rounds repeat until one candidate holds more than half of the ballots still continuing.' },
];
const RULES: { key: string; label: string; fmt: (v: unknown) => string }[] = [
  { key: 'overvote', label: 'Overvoted rank', fmt: v => v === 'exhaust' ? 'ballot exhausts' : 'rank skipped' },
  { key: 'skips', label: 'Blank ranks', fmt: v => v === 'two-exhaust' ? 'two in a row exhaust' : 'skipped, keep reading' },
  { key: 'duplicates', label: 'Repeated candidate', fmt: v => v === 'skip' ? 'counts as a blank rank' : v === 'ignore' ? 'passed over' : 'passed over' },
  { key: 'batch', label: 'Batch elimination', fmt: v => (v ? 'yes, all who cannot win' : 'no, one per round') },
  { key: 'tiebreak', label: 'Elimination tie', fmt: v => (v === 'lot' ? 'by lot' : 'previous round, then lot') },
];
const Eyebrow = ({ n, children }: { n: string; children: React.ReactNode }) => (
  <p data-reveal className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[.16em] text-mute"><span className="text-tally">{n}</span><span className="h-px w-8 bg-line" />{children}</p>
);

export default function Landing() {
  return (
    <main className="relative overflow-x-clip">
      <MotionLazy />
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-ink/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-7 px-5 text-sm md:px-6" aria-label="Main">
          <Link href="/" aria-label="Tallyroom home" data-testid="nav-home"><Logo /></Link>
          <div className="hidden items-center gap-6 text-mute md:flex">
            <a href="#parity" className="hover:text-fg" data-testid="nav-parity">Parity</a><a href="#how" className="hover:text-fg" data-testid="nav-how">How it counts</a>
            <a href="#rules" className="hover:text-fg" data-testid="nav-rules">Rules</a><a href="#api" className="hover:text-fg" data-testid="nav-api">API</a>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <a href="https://github.com/goat-dev8/tallyroom" className={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-label="Source on GitHub" data-testid="nav-github"><GitBranch className="h-4 w-4" /><span className="hidden sm:inline">Source</span></a>
            <Link href="/app" className={buttonVariants({ size: 'sm' })} data-testid="nav-dashboard">Open dashboard</Link>
            <MobileNav />
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative isolate">
        <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[760px]"><ThreadsBg /></div>
        <div className="mx-auto max-w-[1200px] px-5 pt-16 md:px-6 md:pt-24">
          <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_.75fr]">
            <div className="min-w-0">
              <p className="rise mb-7 inline-flex max-w-full items-center gap-2.5 rounded-full border border-line bg-ink/60 py-1 pr-3 pl-1 font-mono text-[11px] tracking-wide text-mute backdrop-blur">
                <span className="whitespace-nowrap rounded-full bg-win/15 px-2 py-0.5 text-win">3 / 3 exact</span><span className="truncate">Maine · Alaska · NYC, ballot for ballot</span>
              </p>
              <h1 data-split className="rise max-w-[13ch] lg:[animation:none] text-[44px] leading-[0.98] font-semibold tracking-[-0.045em] text-fg sm:text-6xl md:text-[84px]">
                The count, round by round. <span className="text-mute">To the last ballot.</span>
              </h1>
              <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-mute">Tallyroom is an open ranked-choice and STV counter. It reads official cast vote records, applies each jurisdiction&rsquo;s written rules, and reproduces the certified result exactly, with every transfer shown.</p>
              <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '.35s' }}>
                <Link href="/app" className={buttonVariants({ variant: 'tally' })} data-testid="cta-count">Count an election <ArrowRight className="h-4 w-4" /></Link>
                <a href="#how" className={buttonVariants({ variant: 'outline' })} data-testid="cta-how">See how counting works</a>
              </div>
            </div>
            <div className="relative hidden h-[26rem] lg:block"><HeroVisual /></div>
          </div>
          <div className="rise relative mt-14 md:mt-16" style={{ animationDelay: '.45s' }}>
            <div className="pointer-events-none absolute -inset-x-10 -top-10 -bottom-20 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(124,140,255,.16),transparent_70%)]" />
            <HeroDemo />
          </div>
          <div data-reveal className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-[11px] tracking-wide text-mute">
            <span>Exact rational arithmetic</span><span className="hidden h-1 w-1 rounded-full bg-line sm:block" /><span>Runs in your browser</span><span className="hidden h-1 w-1 rounded-full bg-line sm:block" /><span>Open JSON API</span><span className="hidden h-1 w-1 rounded-full bg-line sm:block" /><span>No opinions, official figures only</span>
          </div>
        </div>
      </section>

      {/* PARITY LEDGER */}
      <section id="parity" className="mx-auto max-w-[1200px] px-5 pt-32 pb-24 md:px-6">
        <Eyebrow n="01">Parity ledger</Eyebrow>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 data-reveal className="max-w-[18ch] text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Checked against the official record, not against itself.</h2>
          <p data-reveal className="max-w-md text-mute lg:justify-self-end">Each election below is counted from the public cast vote record. The final round must equal the certified tabulation to the ballot, or the build fails.</p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {CATALOG.map(c => {
            const k = CERTIFIED[c.slug]; const [[w, wv], [l, lv]] = k.final;
            return (
              <article key={c.slug} data-reveal data-parity={c.slug} className="parity-card group relative bg-ink p-6 md:p-7" data-testid={`parity-${c.slug}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[.14em] text-mute">{c.jurisdiction} · {c.year}</span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-win"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path data-morph d={APPROX} /></svg>exact</span>
                </div>
                <h3 className="mt-3 text-[17px] font-medium tracking-tight">{c.title.split(', ').slice(1).join(', ')}</h3>
                <svg viewBox="0 0 300 64" className="mt-7 h-auto w-full" aria-label={`Final round: ${w} ${fmt(wv)}, ${l} ${fmt(lv)}`} role="img">
                  {k.final.map(([n, v], i) => <g key={n}><rect x="0" y={i * 30} width="300" height="18" rx="4" fill="#ffffff07" /><rect data-pbar x="0" y={i * 30} width={+(300 * v / k.continuing).toFixed(2)} height="18" rx="4" fill={i === 0 ? '#3ddc97' : '#ffffff2e'} /></g>)}
                  <line x1="150" x2="150" y1="-2" y2="50" stroke="#f5b83d" strokeDasharray="3 3" />
                </svg>
                <dl className="mt-5 grid grid-cols-2 gap-y-4 font-mono text-xs tnum">
                  <div><dt className="text-mute">Winner, final round</dt><dd className="mt-1 text-sm text-fg">{w} {fmt(wv)}</dd></div>
                  <div><dt className="text-mute">Runner-up</dt><dd className="mt-1 text-sm text-fg">{l} {fmt(lv)}</dd></div>
                  <div><dt className="text-mute">Rounds</dt><dd className="mt-1 text-sm text-fg">{k.rounds}</dd></div>
                  <div><dt className="text-mute">Ballots</dt><dd className="mt-1 text-sm text-fg">{fmt(k.ballots)}</dd></div>
                </dl>
                <Link href={`/app?election=${c.slug}&round=${k.rounds}`} className="mt-6 inline-flex items-center gap-1 text-sm text-mute transition-colors hover:text-fg" data-testid={`parity-open-${c.slug}`}>Open the count <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
                <p className="mt-4 text-[11px] leading-relaxed text-mute/70">{c.source}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* HOW IT COUNTS */}
      <section id="how" className="relative border-y border-line bg-panel/40">
        <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-6 lg:py-0" data-steps>
          <div className="grid gap-12 lg:min-h-dvh lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-20">
            <div>
              <Eyebrow n="02">How it counts</Eyebrow>
              <h2 data-reveal className="mt-5 max-w-[16ch] text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Instant runoff, one round at a time.</h2>
              <ol className="mt-10 space-y-2">
                {STEPS.map(({ g: G, t, d }, i) => (
                  <li key={t} data-step={i} className="step relative rounded-xl border border-transparent p-4 pl-14">
                    <span className="absolute top-4 left-4 grid h-7 w-7 place-items-center rounded-md border border-line bg-ink text-tally"><G className="h-4 w-4" /></span>
                    <h3 className="flex items-baseline gap-2 text-[15px] font-medium"><span className="font-mono text-[11px] text-mute">0{i + 1}</span>{t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-mute">{d}</p>
                    <span data-step-bar={i} className="absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 bg-tally/70" />
                  </li>
                ))}
              </ol>
            </div>
            <figure className="card p-5 md:p-7">
              <CountScene />
              <figcaption className="mt-3 font-mono text-[11px] text-mute">Illustrative 100-ballot count. B trails in round 1, gains most of C&rsquo;s transfers, and wins with 49 of 94 continuing ballots.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* RULEBOOK */}
      <section id="rules" className="mx-auto max-w-[1200px] px-5 py-32 md:px-6">
        <Eyebrow n="03">The rulebook</Eyebrow>
        <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 data-reveal className="max-w-[18ch] text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Each jurisdiction counts differently. We write the difference down.</h2>
          <p data-reveal className="max-w-md text-mute lg:justify-self-end">Every rule that can change a result is a named, explicit option. These are the settings that reproduce each certified count.</p>
        </div>
        <div data-reveal className="mt-12 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm" data-testid="rulebook">
            <thead className="bg-white/[.02] font-mono text-[11px] uppercase tracking-[.12em] text-mute"><tr><th className="p-4 font-normal">Rule</th>{CATALOG.map(c => <th key={c.slug} className="p-4 font-normal">{c.short} {c.year}</th>)}</tr></thead>
            <tbody>{RULES.map(r => <tr key={r.key} className="border-t border-line"><td className="p-4 text-fg">{r.label}<div className="font-mono text-[11px] text-mute">{r.key}</div></td>{CATALOG.map(c => <td key={c.slug} className="p-4 text-mute">{r.fmt((c.rules as Record<string, unknown>)[r.key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {[['Exact fractions', 'Every surplus and transfer value is a rational number. Nothing is rounded, so nothing drifts.', 'p ⁄ q'], ['Multi-seat STV', 'Gregory-method surplus transfers with Droop or Hare quota, for councils and boards.', 'Droop'], ['Inactive, explained', 'Blank, overvote, skipped ranks, undervote and exhausted are counted as separate categories.', '5 reasons']].map(([t, d, k]) => (
            <div key={t} data-reveal className="bg-ink p-6"><div className="font-mono text-2xl tracking-tight text-tally">{k}</div><h3 className="mt-4 font-medium">{t}</h3><p className="mt-1.5 text-sm text-mute">{d}</p></div>
          ))}
        </div>
      </section>

      {/* API */}
      <section id="api" className="border-t border-line">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-32 md:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow n="04">Open API</Eyebrow>
            <h2 data-reveal className="mt-5 text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">One request. The whole count.</h2>
            <p data-reveal className="mt-5 max-w-md text-mute">Send ballots as <code className="font-mono text-fg">count,A&gt;B&gt;C</code> lines. Use <code className="font-mono text-fg">_</code> for a skipped rank and <code className="font-mono text-fg">[A=B]</code> for an overvote. Add <code className="font-mono text-fg">seats</code> for STV. Every round, transfer and inactive category comes back as JSON.</p>
            <a data-reveal href="/api/health" className="mt-7 inline-flex items-center gap-2 font-mono text-xs text-mute hover:text-fg" data-testid="api-health"><span className="h-1.5 w-1.5 rounded-full bg-win" /> GET /api/health</a>
          </div>
          <pre data-reveal className="card overflow-x-auto p-6 font-mono text-[12.5px] leading-[1.8] text-[#c9ccd2]"><span className="text-mute">$</span> curl -X POST https://tallyroom-rosy.vercel.app/api/tabulate \{'\n'}  -H <span className="text-tally">&apos;content-type: application/json&apos;</span> \{'\n'}  -d <span className="text-tally">{`'{"ballots":"5,A>B\\n4,B>C\\n2,C>B"}'`}</span>{'\n\n'}<span className="text-mute">{'{'}</span>{'\n'}  <span className="text-iris">&quot;method&quot;</span>: &quot;irv&quot;,{'\n'}  <span className="text-iris">&quot;winner&quot;</span>: <span className="text-win">&quot;B&quot;</span>,{'\n'}  <span className="text-iris">&quot;rounds&quot;</span>: [ <span className="text-mute">{'{ "round": 1, "tallies": {…}, "threshold": 6 }'}</span>, … ]{'\n'}<span className="text-mute">{'}'}</span></pre>
        </div>
      </section>

      {/* CLOSING */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto max-w-[1200px] px-5 py-32 text-center md:px-6">
          <Logo className="justify-center text-lg" />
          <h2 data-reveal className="mx-auto mt-8 max-w-[20ch] text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Neutral by construction. Counting math and official figures only.</h2>
          <p data-reveal className="mx-auto mt-5 max-w-lg text-mute">No commentary, no predictions, no party colours. Pick a certified election or bring your own ballots.</p>
          <div data-reveal className="mt-9 flex justify-center gap-3"><Link href="/app" className={buttonVariants({ variant: 'tally' })} data-testid="cta-closing">Open the dashboard <ArrowRight className="h-4 w-4" /></Link><a href="https://github.com/goat-dev8/tallyroom" className={buttonVariants({ variant: 'outline' })}>Read the source</a></div>
        </div>
      </section>
      <footer className="border-t border-line"><div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-8 font-mono text-[11px] text-mute md:px-6"><Logo className="font-sans text-sm text-fg" /><span>Open source</span><span>Background threads by React Bits</span><a className="ml-auto hover:text-fg" href="https://github.com/goat-dev8/tallyroom">GitHub</a><a className="hover:text-fg" href="/proof">Proof</a><a className="hover:text-fg" href="/api/health">API status</a></div></footer>
    </main>
  );
}
