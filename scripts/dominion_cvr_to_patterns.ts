/**
 * Streaming converter: Dominion CvrExport.json (hundreds of MB) -> compact pattern TSV for one contest.
 * Usage: tsx scripts/dominion_cvr_to_patterns.ts <dir> <contestId> <out.tsv>
 * Per ballot it uses the session version flagged IsCurrent (Modified if adjudicated, else Original).
 * Per rank: no definite (non-ambiguous) mark -> 'undervote'; one distinct candidate -> name; 2+ distinct -> 'overvote'.
 * Write-in candidate marks become the token 'Write-in'. Also emits a JSON side report of counts.
 */
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { chain } = require('stream-chain');

const [dir, contestIdStr, out] = process.argv.slice(2);
const contestId = Number(contestIdStr);
const USE_OC9 = process.env.USE_OC9 !== '0'; // Dominion OutstackCondition 9 = OvervotedRanking
const KEEP_AMBIGUOUS = process.env.KEEP_AMBIGUOUS === '1';
const cands = JSON.parse(readFileSync(`${dir}/CandidateManifest.json`, 'utf8')).List.filter((c: any) => c.ContestId === contestId);
const contest = JSON.parse(readFileSync(`${dir}/ContestManifest.json`, 'utf8')).List.find((c: any) => c.Id === contestId);
const nameById = new Map<number, string>(cands.map((c: any) => [c.Id, c.Type === 'WriteIn' ? 'Write-in' : c.Description]));
const ranks: number = contest.NumOfRanks || Math.max(...[5]);
const patterns = new Map<string, number>();
const stats = { sessions: 0, ballotsWithContest: 0, usedModified: 0, ambiguousMarks: 0, nonVoteMarks: 0 };
let maxRank = 0;
const pipeline = chain([createReadStream(`${dir}/CvrExport.json`), parser(), pick({ filter: 'Sessions' }), streamArray()]);
pipeline.on('data', ({ value: s }: any) => {
  stats.sessions++;
  const v = s.Modified && s.Modified.IsCurrent ? s.Modified : s.Original;
  if (v === s.Modified) stats.usedModified++;
  for (const card of v.Cards) for (const ct of card.Contests) {
    if (ct.Id !== contestId) continue;
    stats.ballotsWithContest++;
    const byRank = new Map<number, Set<string>>(); const flaggedOver = new Set<number>();
    for (const m of ct.Marks) {
      // Dominion sets IsVote only for rank-1 plurality semantics; RCV ranks >1 are IsVote=false.
      // A mark counts unless the scanner flagged it ambiguous (faint / not a definite mark).
      if (!m.IsVote) stats.nonVoteMarks++;
      if (m.IsAmbiguous) { stats.ambiguousMarks++; if (!KEEP_AMBIGUOUS) continue; }
      if (USE_OC9 && (m.OutstackConditionIds ?? []).includes(9)) flaggedOver.add(m.Rank);
      maxRank = Math.max(maxRank, m.Rank);
      const n = nameById.get(m.CandidateId); if (!n) throw new Error('unknown candidate ' + m.CandidateId);
      (byRank.get(m.Rank) ?? byRank.set(m.Rank, new Set()).get(m.Rank)!).add(n);
    }
    const row: string[] = [];
    for (let r = 1; r <= ranks; r++) { const s2 = byRank.get(r); row.push(flaggedOver.has(r) || (s2 && s2.size > 1) ? 'overvote' : !s2 ? 'undervote' : [...s2][0]); }
    const key = row.join('\t'); patterns.set(key, (patterns.get(key) ?? 0) + 1);
  }
});
pipeline.on('end', () => {
  const lines = [...patterns].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, c]) => `${c}\t${k}`);
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(JSON.stringify({ contest: contest.Description, ranks, maxRank, patterns: patterns.size, ...stats }));
});
