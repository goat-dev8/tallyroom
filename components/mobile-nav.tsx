'use client';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
const LINKS = [['parity', 'Parity'], ['how', 'How it counts'], ['rules', 'Rules'], ['api', 'API']] as const;
/** Section links for narrow screens, where the inline nav is hidden. Esc or a link closes it. */
export function MobileNav() {
  const [open, setOpen] = useState(false); const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  return (
    <div className="md:hidden">
      <button ref={btn} type="button" aria-label="Sections" aria-expanded={open} aria-controls="mobile-sections" data-testid="nav-menu" onClick={() => setOpen(o => !o)}
        className="grid h-9 w-9 place-items-center rounded-md text-mute hover:bg-white/5 hover:text-fg">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
      {open && (
        <div id="mobile-sections" data-testid="nav-menu-panel" className="absolute inset-x-0 top-14 z-50 border-b border-line bg-[#0b0c0f]/95 px-5 py-3 backdrop-blur-md">
          <ul className="grid gap-1 text-sm">
            {LINKS.map(([id, label]) => <li key={id}><a href={`#${id}`} data-testid={`mnav-${id}`} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2.5 text-fg hover:bg-white/5">{label}</a></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
