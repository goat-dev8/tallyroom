/** Hand-built 24-unit glyphs for the narrative sections. Paths carry data-draw so GSAP DrawSVG can stroke them in. */
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
export const GlyphBallot = (p: { className?: string }) => <svg {...base} {...p}><path data-draw d="M6 3h9l3 3v15H6z" /><path data-draw d="M15 3v3h3" /><path data-draw d="M9 10h1M9 14h1M9 18h1" /><path data-draw d="M12.5 10H15M12.5 14H15M12.5 18H15" /></svg>;
export const GlyphRank = (p: { className?: string }) => <svg {...base} {...p}><path data-draw d="M4 6h3M4 12h3M4 18h3" /><path data-draw d="M10 6h10M10 12h7M10 18h4" /></svg>;
export const GlyphTransfer = (p: { className?: string }) => <svg {...base} {...p}><path data-draw d="M3 12h6" /><path data-draw d="M9 12c4 0 4-6 9-6M9 12c4 0 4 6 9 6M9 12h9" /><path data-draw d="M16 4l2 2-2 2M16 16l2 2-2 2M16 10l2 2-2 2" /></svg>;
export const GlyphMajority = (p: { className?: string }) => <svg {...base} {...p}><path data-draw d="M12 3v18" strokeDasharray="2 2.5" /><path data-draw d="M3 9h13M3 15h6" /><path data-draw d="M15.5 16.5l2 2 3.5-4" /></svg>;
/** "approximately" → "exactly": morph targets for the parity cards. */
export const APPROX = 'M5 9.5C7.5 7 9.5 12 12 9.5S16.5 7 19 9.5M5 14.5C7.5 12 9.5 17 12 14.5S16.5 12 19 14.5';
export const EXACT = 'M5 9.5C7.5 9.5 9.5 9.5 12 9.5S16.5 9.5 19 9.5M5 14.5C7.5 14.5 9.5 14.5 12 14.5S16.5 14.5 19 14.5';
