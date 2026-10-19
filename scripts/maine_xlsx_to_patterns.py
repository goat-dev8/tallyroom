"""Convert Maine SoS 2018 CD2 CVR xlsx files into a compact pattern file.
Output: data/fixtures/maine-2018-cd2.patterns.tsv  (count \t rank1 \t ... \t rank5)
Tokens: candidate names (ballot-position suffix like ' (5931)' stripped), 'overvote', 'undervote', 'Write-in'."""
import openpyxl, glob, re, collections, sys, os
RAW = 'data/raw/maine-2018-cd2'
FILES = ['Nov18CVRExportFINAL1','Nov18CVRExportFINAL2','Nov18CVRExportFINAL3','RepCD2-8final',
         'UOCAVA-FINALRepCD2','UOCAVA-AUX-CVRRepCD2','UOCAVA2CVRRepCD2','AUXCVRProofedCVR95RepCD2']
def norm(v):
    s = str(v).strip() if v is not None else 'undervote'
    s = re.sub(r'\s*\(\d+\)$', '', s)
    return s or 'undervote'
counts = collections.Counter(); per_file = {}; tokens = collections.Counter()
for f in FILES:
    ws = openpyxl.load_workbook(f'{RAW}/{f}.xlsx', read_only=True).active
    n = 0
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or row is None or all(c is None for c in row): continue
        ranks = tuple(norm(c) for c in row[3:8])
        counts[ranks] += 1; n += 1
        tokens.update(ranks)
    per_file[f] = n
os.makedirs('data/fixtures', exist_ok=True)
with open('data/fixtures/maine-2018-cd2.patterns.tsv', 'w') as out:
    for ranks, c in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        out.write(str(c) + '\t' + '\t'.join(ranks) + '\n')
print(per_file, 'total', sum(per_file.values()), 'patterns', len(counts), file=sys.stderr)
print(dict(tokens), file=sys.stderr)
