"""PrefLib .toi -> pattern TSV. A tied rank {a,b} is an overvote at that rank, written overvote:A|B so the names survive. Usage: toi_to_patterns.py in.toi out.tsv"""
import re, sys
names, rows = {}, []
for line in open(sys.argv[1]):
    m = re.match(r'# ALTERNATIVE NAME (\d+): (.*)', line)
    if m: names[m[1]] = m[2].strip(); continue
    if line.startswith('#') or ':' not in line: continue
    n, order = line.split(':', 1)
    ranks = [t if t.startswith('{') else t for t in re.findall(r'\{[^}]*\}|[^,\s]+', order.strip())]
    rows.append((int(n), ['overvote:' + '|'.join(names[x] for x in r[1:-1].split(',')) if r.startswith('{') else names[r] for r in ranks]))
w = max(len(r) for _, r in rows)
with open(sys.argv[2], 'w') as f:
    for n, r in sorted(rows, key=lambda x: -x[0]):
        f.write('\t'.join([str(n)] + r + ['undervote'] * (w - len(r))) + '\n')
print(sum(n for n, _ in rows), 'ballots', len(rows), 'patterns')
