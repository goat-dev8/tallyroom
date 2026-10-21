import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '../../components/logo';
import { buttonVariants } from '../../components/ui';
import { HairlineFigure, type FigureName } from '../../components/hairline-figure';

export const metadata: Metadata = { title: 'Counted, then checked — Tallyroom' };

// Links point at main, where this page ships.
const REPO = 'https://github.com/goat-dev8/tallyroom/blob/main/';
const ITEMS: { id: string; title: string; body: string; links: [string, string][]; fig: FigureName; tone?: string }[] = [
  { id: 'parity', fig: 'plot', tone: '', title: 'Certified parity', body: 'Maine 2018 CD2, Alaska 2022 special and NYC 2021 Democratic mayor are recounted from the official cast vote records. Every round, every candidate and every inactive category matches the certified report with zero gap. A workflow re-downloads the raw CVRs from the release, checks their SHA-256 sums and runs the count again. It is scheduled nightly; the one run so far was started by hand and came back exact.', links: [['Parity tables', 'PARITY.md'], ['Parity workflow', '.github/workflows/parity-nightly.yml']] },
  { id: 'field-parity', fig: 'loupe', tone: 'hairline-iris', title: 'Field-by-field check against the official round tables', body: 'A second check reads the official round tables straight from the published files and compares each number with our count. Those files are a Maine spreadsheet, an Alaska PDF, a NYC Board of Elections page, the Burlington ChoicePlus report, and the stage-by-stage reports for 30 Scottish council wards from 2022 (11 in Argyll and Bute, 19 in Highland). For the Scottish wards the ballots come from each council\'s own preference file, and the count uses the Scottish rule that cuts each transferred vote to 5 decimal places. The check covers votes for every candidate at every stage, transfers, non-transferable votes, votes lost to rounding, quotas, which surplus or exclusion each stage handled, and who was elected when. Of 4,345 fields, 4,344 agree, and 33 of the 34 elections agree on every field. The one difference is the Burlington 2009 winning threshold: the city printed 4,491 (half of all 8,980 valid ballots, plus one), and we print 4,489 because we leave out the 4 ballots already inactive in round 1. When the Scottish wards are counted with exact fractions instead of the 5-place rule, the same candidates are elected in the same order, but some vote figures move by up to 0.021. Each source file is saved with its SHA-256 sum.', links: [['Field parity table', 'audit/parity/field-parity.md'], ['Source files', 'audit/parity/sources/SHA256SUMS.txt'], ['Scottish sources', 'audit/parity/sources/scotland/SHA256SUMS.txt'], ['Method', 'audit/parity/README.md']] },
  { id: 'ledger', fig: 'branches', tone: 'hairline-win', title: 'Red→green bug ledger', body: 'Each bug fix ships with a test that fails on the old build and passes on the fix. The failing and passing runs are both kept.', links: [['Defects', 'audit/defects.md'], ['PR ledger', 'audit/LEDGER.md']] },
  { id: 'mutation', fig: 'cabinet', tone: '', title: 'Mutation score', body: 'Stryker mutates the code and runs the test suite against each mutant. The engine files (IRV, STV, exact fractions) score 92.54%, and the parser scores 78.95%. Surviving mutants are listed in the report.', links: [['Mutation summary', 'audit/mutation/README.md']] },
  { id: 'traceability', fig: 'relay', tone: 'hairline-iris', title: 'Traceability', body: 'Each counting rule, R1 to R20, maps to the unit tests, TestSprite API/UI tests and PRs that cover it.', links: [['Traceability matrix', 'audit/traceability.md']] },
  { id: 'workflows', fig: 'slow', tone: 'hairline-win', title: 'CI and TestSprite workflows', body: 'Every PR runs lint, typecheck and unit tests. The TestSprite UI suite runs on every PR preview, a gate fails the PR if any of those tests fails, and the TestSprite API tests run on the preview when the PR touches API code. After a merge that changes app code, the API suite runs against production and posts JUnit results.', links: [['CI', '.github/workflows/ci.yml'], ['PR tests', '.github/workflows/testsprite-cli.yml'], ['Production tests', '.github/workflows/testsprite-prod.yml']] },
];

const TS = 'https://www.testsprite.com/dashboard-v3/o/dd10cd84-8b8f-5d0b-87b0-254e74a42770/projects/f312fcf5-741d-4116-bed4-c7ac9334859a/execution/';
// Every figure here is read from a file in the repo or from the GitHub checks of PR #26; see README "Numbers and where they come from".
const STATS: [string, string, string][] = [
  ['4,344 / 4,345', 'official fields matched', 'audit/parity/field-parity.md'],
  ['34 / 34', 'TestSprite UI tests on the merged head', 'audit/testsprite/final-pr/README.md'],
  ['43', 'ledger rows, 9 first caught by TestSprite', 'audit/defects.md'],
  ['330', 'Vitest tests', 'test/'],
  ['98', 'Playwright runs (49 tests × 2 viewports)', 'tests/e2e/'],
  ['92.54%', 'mutation score on the engine', 'audit/mutation/README.md'],
];
const STORY: { id: string; head: string; steps: [string, string, string?][] }[] = [
  { id: 'BUG-008', head: 'The hero replay fell back to round 1', steps: [['red', 'ui:hero-autoplay fails on PR #26 R′ (e91c92e): 33/34', TS + 'e34f1719-cc5a-4eaf-a7ed-5f66b84b58f1'], ['fix', 'replay holds on the certified final round'], ['green', 'passes on G′ and on the merged head', TS + 'f118839c-f6b3-4ad0-8d2c-12275d9754e2']] },
  { id: 'BUG-041', head: 'Sankey labels lost their “·” separator', steps: [['red', 'ui:sankey-render fails on ef08f17: 31/34', TS + 'adac70d0-8e0a-48bb-be69-90a18639f145'], ['fix', 'separator rendered inside the label (76e67ce)'], ['green', 'All 34 tests passed on 76e67ce, merged as 876052f', TS + 'f118839c-f6b3-4ad0-8d2c-12275d9754e2']] },
];
const DOT: Record<string, string> = { red: 'bg-[#f87171]', fix: 'bg-tally', green: 'bg-win' };

export default function Proof() {
  return (
    <main className="relative isolate" data-testid="proof">
      <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-50" />
      <div className="mx-auto max-w-[1100px] px-5 py-14 md:px-6">
        <Link href="/" aria-label="Tallyroom home"><Logo className="text-lg" /></Link>
        <header className="mt-12 grid items-center gap-10 md:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[.14em] text-mute">How we know the count is right</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] md:text-5xl" data-testid="proof-title">Counted, then checked</h1>
            <p className="mt-4 max-w-xl text-mute">Tallyroom does not ask you to trust a count. Each claim below links to the file that checks it, and every number on this page can be traced to one.</p>
          </div>
          <HairlineFigure name="terrain" label="A field of pillars rising like tallied ballots" className="mx-auto w-full max-w-[340px]" />
        </header>

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3" data-testid="proof-stats">
          {STATS.map(([v, k, src]) => (
            <a key={k} href={REPO + src} className="group bg-ink p-5 transition-colors hover:bg-panel">
              <dt className="font-mono text-[11px] uppercase tracking-[.12em] text-mute">{k}</dt>
              <dd className="mt-2 font-mono text-2xl tracking-tight text-fg tnum group-hover:text-tally">{v}</dd>
            </a>
          ))}
        </dl>

        <section className="mt-14" aria-labelledby="story-title">
          <h2 id="story-title" className="text-2xl font-semibold tracking-tight">Red, then green, on the pull request</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">The TestSprite App check runs the 34 UI tests on every PR preview, and a gate blocks the merge unless all 34 pass. Two real bugs it caught on the final PR:</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {STORY.map(b => (
              <article key={b.id} className="card p-6" data-testid={`proof-story-${b.id}`}>
                <div className="font-mono text-[11px] text-mute">{b.id}</div>
                <h3 className="mt-1 font-medium">{b.head}</h3>
                <ol className="mt-4 space-y-3 border-l border-line pl-4">
                  {b.steps.map(([k, t, href]) => (
                    <li key={k} className="relative text-sm text-mute">
                      <span className={`absolute top-1.5 -left-[21px] h-2 w-2 rounded-full ${DOT[k]}`} />
                      <span className="mr-2 font-mono text-[11px] uppercase text-fg">{k}</span>{href ? <a href={href} className="underline underline-offset-4 hover:text-fg">{t}</a> : t}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <ol className="mt-14 grid gap-4">
          {ITEMS.map(it => (
            <li key={it.id} id={it.id} className="grid gap-6 rounded-2xl border border-line bg-panel/30 p-6 md:grid-cols-[1fr_200px] md:items-center" data-testid={`proof-${it.id}`}>
              <div>
                <h2 className="text-lg font-semibold">{it.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-mute">{it.body}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px]">
                  {it.links.map(([label, path]) => <a key={path} href={REPO + path} className="underline underline-offset-4 hover:text-fg">{label}</a>)}
                </div>
              </div>
              <HairlineFigure name={it.fig} label={it.title} className={`hidden w-full md:block ${it.tone ?? ''}`} />
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3"><Link href="/app" className={buttonVariants({ variant: 'tally' })}>Open the dashboard</Link><Link href="/" className={buttonVariants({ variant: 'outline' })}>Back to home</Link></div>
        <p className="mt-10 font-mono text-[11px] text-mute">Line figures by <a className="underline underline-offset-4" href="https://github.com/lucasmarkes/hairline">Hairline</a> (MIT).</p>
      </div>
    </main>
  );
}
