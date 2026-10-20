/** Illustrative 100-ballot count for "How a count unfolds". Static markup shows the final state; MotionRoot scrubs it from round 1. */
export const SCENE = {
  names: ['A', 'B', 'C', 'D'], colors: ['#7c8cff', '#f5b83d', '#4cc9f0', '#c77dff'],
  rounds: [
    { cont: 100, v: [38, 31, 19, 12] },
    { cont: 98, v: [41, 36, 21, 0] },  // D's 12: A+3, B+5, C+2, 2 inactive
    { cont: 94, v: [45, 49, 0, 0] },   // C's 21: A+4, B+13, 4 inactive
  ],
};
const X0 = 70, W = 300, ROW = 46, Y0 = 34;
export const barW = (v: number, cont: number) => +(W * v / cont).toFixed(2);
export function CountScene() {
  const fin = SCENE.rounds[2];
  const y = (i: number) => Y0 + i * ROW;
  const thread = (from: number, fromV: number, fromC: number, to: number, toV: number, toC: number) => {
    const x1 = X0 + barW(fromV, fromC), y1 = y(from) + 9, x2 = X0 + barW(toV, toC), y2 = y(to) + 9; const mx = Math.max(x1, x2) + 40;
    return `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
  };
  const r0 = SCENE.rounds[0], r1 = SCENE.rounds[1];
  return (
    <svg viewBox="0 0 440 260" className="h-auto w-full" role="img" aria-label="Illustration: four candidates, two eliminations, candidate B overtakes A and passes the majority line in round 3" data-testid="count-scene">
      <defs><pattern id="cs-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ffffff08" /></pattern></defs>
      <rect width="440" height="260" fill="url(#cs-grid)" />
      <text data-scene-label x={X0} y="18" className="fill-[#8a8f98] font-mono text-[9px] tracking-[.14em]">ROUND <tspan data-scene-round>3</tspan> · <tspan data-scene-cont>{fin.cont}</tspan> CONTINUING</text>
      {SCENE.names.map((n, i) => (
        <g key={n} data-scene-row={i}>
          <text x={X0 - 14} y={y(i) + 13} textAnchor="end" className="fill-[#c9ccd2] font-mono text-[11px]">{n}</text>
          <rect x={X0} y={y(i)} width={W} height="18" rx="4" fill="#ffffff07" />
          <rect data-scene-bar={i} x={X0} y={y(i)} width={barW(fin.v[i], fin.cont)} height="18" rx="4" fill={SCENE.colors[i]} />
          <text data-scene-num={i} x={X0 + W + 30} y={y(i) + 13} textAnchor="end" className="fill-[#8a8f98] font-mono text-[10px]">{fin.v[i] || '—'}</text>
        </g>
      ))}
      <g fill="none" strokeWidth="1.5" strokeLinecap="round" opacity=".9">
        {[0, 1, 2].map(t => <path key={`d${t}`} data-scene-thread="d" d={thread(3, r0.v[3], r0.cont, t, r1.v[t], r1.cont)} stroke={SCENE.colors[3]} />)}
        {[0, 1].map(t => <path key={`c${t}`} data-scene-thread="c" d={thread(2, r1.v[2], r1.cont, t, fin.v[t], fin.cont)} stroke={SCENE.colors[2]} />)}
      </g>
      <line x1={X0 + W / 2} x2={X0 + W / 2} y1="24" y2="214" stroke="#f5b83d" strokeDasharray="3 3" />
      <text x={X0 + W / 2} y="232" textAnchor="middle" className="fill-[#f5b83d] font-mono text-[9px] tracking-[.14em]">MAJORITY · 50% OF CONTINUING</text>
      <g data-scene-win transform={`translate(${X0 + barW(fin.v[1], fin.cont) + 8} ${y(1) + 1})`}><circle cx="8" cy="8" r="8" fill="#3ddc97" /><path d="M4.5 8.2l2.3 2.3 4.6-4.8" stroke="#07080a" strokeWidth="1.8" fill="none" strokeLinecap="round" /></g>
    </svg>
  );
}
