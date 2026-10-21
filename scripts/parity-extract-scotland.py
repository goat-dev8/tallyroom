#!/usr/bin/env python3
"""Reads the official Scottish council "Candidate Votes Per Stage" PDFs in audit/parity/sources/scotland/ into
audit/parity/official/scotland/*.json. Every number is read from the PDF text (pdftotext -layout); candidate names are
taken from the council's own preference-profile (.blt) file for the same ward, so rows can be matched by name."""
import json, os, re, subprocess, hashlib, glob
from decimal import Decimal
D = os.path.join(os.path.dirname(__file__), '..', 'audit', 'parity', 'sources', 'scotland')
O = os.path.join(os.path.dirname(__file__), '..', 'audit', 'parity', 'official', 'scotland')
os.makedirs(O, exist_ok=True)
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
num = lambda s: str(Decimal(s.replace(',', '')))
NUM = r'-?[\d,]+(?:\.\d+)?'

def blt_names(f):
    L = open(f, encoding='utf-8-sig', errors='replace').read().replace('\r', '').split('\n')
    q = [re.match(r'^"(.*?)"', l)[1] for l in L if l.startswith('"')]
    return q[:-1], q[-1]  # candidates, title

COUNCILS = {'ab2022': ('Argyll and Bute', 'argyll-bute'), 'hl2022': ('Highland', 'highland')}
for pdf in sorted(glob.glob(os.path.join(D, '*.pdf'))):
    base = os.path.basename(pdf)
    if 'votesperstage' not in base.lower().replace('_', ''): continue
    prefix = base[:6]; council, slug = COUNCILS[prefix]
    ward = re.search(r'ward-(\d+)', base)[1]
    blt = [f for f in glob.glob(os.path.join(D, f'{prefix}-*ward-{ward}-*.blt')) if re.search(rf'ward-{ward}-', os.path.basename(f))]
    assert len(blt) == 1, (pdf, blt); blt = blt[0]
    names, title = blt_names(blt)
    t = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout
    head = lambda label: int(re.search(label + r'\s+([\d,]+)', t)[1].replace(',', ''))
    out = {'council': council, 'year': 2022, 'ward': title, 'source': os.path.basename(pdf), 'sha256': sha(pdf),
           'ballotSource': os.path.basename(blt), 'ballotSha256': sha(blt),
           'ballotsReceived': head('Total number of Ballot Papers Received'), 'validVotes': head('Total Number of Valid Votes'),
           'seats': head('Positions to be Filled'), 'quota': head('Quota'), 'stages': []}
    cur = None
    for line in t.split('\n'):
        s = line.strip()
        if m := re.match(r'^Stage (\d+)$', s):
            cur = {'stage': int(m[1]), 'action': None, 'transferred': {}, 'votes': {}, 'elected': []}; out['stages'].append(cur); continue
        if cur is None: continue
        if m := re.match(r'^(Surplus|Exclusion) of (.+?)\s{2,}(' + NUM + r')$', s):
            cur['action'] = {'kind': 'surplus' if m[1] == 'Surplus' else 'exclusion', 'candidate': m[2], 'amount': num(m[3])}; continue
        row = None
        for n in names:
            if line.startswith(n + ' ') or line == n: row = n; break
        for label, key in (('Non-transferable votes due to rounding', 'rounding'), ('Non-transferable votes', 'nonTransferable')):
            if row is None and line.startswith(label): row = key; break
        if row is None:
            if m := re.match(r'^Total\s+(' + NUM + r')$', s): cur['total'] = num(m[1])
            continue
        m = re.search(r'((?:\s+' + NUM + r'){1,2})(\s+Elected)?\s*$', line)
        vals = m[1].split()
        if cur['stage'] > 1 and len(vals) == 2: cur['transferred'][row] = num(vals[0])
        cur['votes'][row] = num(vals[-1])
        if m[2]: cur['elected'].append(row)
    json.dump(out, open(os.path.join(O, f'{slug}-2022-ward-{int(ward):02d}.json'), 'w'), indent=1, ensure_ascii=False)
    print(title, len(out['stages']), 'stages; elected', sum(len(x['elected']) for x in out['stages']))
