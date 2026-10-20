import Link from 'next/link';
import { Logo } from '../components/logo';
import { buttonVariants } from '../components/ui';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center" data-testid="not-found">
      <div>
        <Logo className="justify-center text-lg" />
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[.14em] text-mute">404 · no such page</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight" data-testid="not-found-title">This page was not on the ballot.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-mute">The address does not match any page. The certified counts and your own uploads live in the dashboard.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/app" className={buttonVariants({ variant: 'tally' })} data-testid="not-found-dashboard">Open the dashboard</Link>
          <Link href="/" className={buttonVariants({ variant: 'outline' })} data-testid="not-found-home">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
