import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '../../components/logo';
import { buttonVariants } from '../../components/ui';

export const metadata: Metadata = { title: 'Counted, then checked — Tallyroom' };

// The linked files are on the PR #24 branch, not on main yet. Switch this back to blob/main/ when PR #24 merges.
const REPO = 'https://github.com/goat-dev8/tallyroom/blob/ts-red-green/';
const ITEMS: { id: string; title: string; body: string; links: [string, string][] }[] = [
  { id: 'parity', title: 'Certified parity', body: 'Maine 2018 CD2, Alaska 2022 special and NYC 2021 Democratic mayor are recounted from the official cast vote records. Every round, every candidate and every inactive category matches the certified report with zero gap. A workflow re-downloads the raw CVRs from the release, checks their SHA-256 sums and runs the count again. It is scheduled nightly; the one run so far was started by hand and came back exact.', links: [['Parity tables', 'PARITY.md'], ['Parity workflow', '.github/workflows/parity-nightly.yml']] },
  { id: 'field-parity', title: 'Field-by-field check against the official round tables', body: 'A second check reads the official round tables straight from the published files and compares each number with our count. Those files are a Maine spreadsheet, an Alaska PDF, a NYC Board of Elections page, the Burlington ChoicePlus report, and the stage-by-stage reports for 30 Scottish council wards from 2022 (11 in Argyll and Bute, 19 in Highland). For the Scottish wards the ballots come from each council\'s own preference file, and the count uses the Scottish rule that cuts each transferred vote to 5 decimal places. The check covers votes for every candidate at every stage, transfers, non-transferable votes, votes lost to rounding, quotas, which surplus or exclusion each stage handled, and who was elected when. Of 4,345 fields, 4,344 agree, and 33 of the 34 elections agree on every field. The one difference is the Burlington 2009 winning threshold: the city printed 4,491 (half of all 8,980 valid ballots, plus one), and we print 4,489 because we leave out the 4 ballots already inactive in round 1. When the Scottish wards are counted with exact fractions instead of the 5-place rule, the same candidates are elected in the same order, but some vote figures move by up to 0.021. Each source file is saved with its SHA-256 sum.', links: [['Field parity table', 'audit/parity/field-parity.md'], ['Source files', 'audit/parity/sources/SHA256SUMS.txt'], ['Scottish sources', 'audit/parity/sources/scotland/SHA256SUMS.txt'], ['Method', 'audit/parity/README.md']] },
  { id: 'ledger', title: 'Red→green bug ledger', body: 'Each bug fix ships with a test that fails on the old build and passes on the fix. The failing and passing runs are both kept.', links: [['Defects', 'audit/defects.md'], ['PR ledger', 'audit/LEDGER.md']] },
  { id: 'mutation', title: 'Mutation score', body: 'Stryker mutates the code and runs the test suite against each mutant. The engine files (IRV, STV, exact fractions) score 92.54%, and the parser scores 78.95%. Surviving mutants are listed in the report.', links: [['Mutation summary', 'audit/mutation/README.md']] },
  { id: 'traceability', title: 'Traceability', body: 'Each counting rule, R1 to R20, maps to the unit tests, TestSprite API/UI tests and PRs that cover it.', links: [['Traceability matrix', 'audit/traceability.md']] },
  { id: 'workflows', title: 'CI and TestSprite workflows', body: 'Every PR runs lint, typecheck and unit tests. The TestSprite UI suite runs on every PR preview, a gate fails the PR if any of those tests fails, and the TestSprite API tests run on the preview when the PR touches API code. After a merge that changes app code, the API suite runs against production and posts JUnit results.', links: [['CI', '.github/workflows/ci.yml'], ['PR tests', '.github/workflows/testsprite-cli.yml'], ['Production tests', '.github/workflows/testsprite-prod.yml']] },
];

export default function Proof() {
  return (
    <main className="mx-auto max-w-[860px] px-5 py-14 md:px-6" data-testid="proof">
      <Link href="/" aria-label="Tallyroom home"><Logo className="text-lg" /></Link>
      <p className="mt-10 font-mono text-[11px] uppercase tracking-[.14em] text-mute">How we know the count is right</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight" data-testid="proof-title">Counted, then checked</h1>
      <p className="mt-3 max-w-xl text-sm text-mute">Tallyroom does not ask you to trust a count. Each claim below links to the file that checks it.</p>
      <ol className="mt-10 grid gap-4">
        {ITEMS.map(it => (
          <li key={it.id} id={it.id} className="rounded-xl border border-line p-5" data-testid={`proof-${it.id}`}>
            <h2 className="text-lg font-semibold">{it.title}</h2>
            <p className="mt-2 text-sm text-mute">{it.body}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px]">
              {it.links.map(([label, path]) => <a key={path} href={REPO + path} className="underline underline-offset-4 hover:text-fg">{label}</a>)}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex gap-3"><Link href="/app" className={buttonVariants({ variant: 'tally' })}>Open the dashboard</Link><Link href="/" className={buttonVariants({ variant: 'outline' })}>Back to home</Link></div>
    </main>
  );
}
