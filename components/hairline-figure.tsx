'use client';
// Isometric line figures from @lucasmarkes/hairline (MIT, Lucas Marques), recoloured in app/globals.css.
// Decorative here: kept out of the Tab order so keyboard paths stay as tested.
import { Plot, Loupe, Branches, Cabinet, Relay, Slow, Terminal, Hub, Terrain, Sieve } from '@lucasmarkes/hairline/react';

const FIGURES = { plot: Plot, loupe: Loupe, branches: Branches, cabinet: Cabinet, relay: Relay, slow: Slow, terminal: Terminal, hub: Hub, terrain: Terrain, sieve: Sieve } as const;
export type FigureName = keyof typeof FIGURES;

export function HairlineFigure({ name, label, className, play = true, intensity = 0.55 }: { name: FigureName; label: string; className?: string; play?: boolean; intensity?: number }) {
  const F = FIGURES[name];
  return <F theme="dark" play={play} intensity={intensity} label={label} tabIndex={-1} className={['hairline', className].filter(Boolean).join(' ')} data-figure={name} />;
}
