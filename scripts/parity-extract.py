#!/usr/bin/env python3
"""Mechanically parses the official raw result files in audit/parity/sources/ into JSON
(audit/parity/official/*.json). No number is typed by hand: every value is read from the file.
Needs: python3, xlrd (Maine .xls), pdftotext (Alaska PDF)."""
import json, re, html, subprocess, sys, hashlib, os
S = os.path.join(os.path.dirname(__file__), '..', 'audit', 'parity', 'sources')
O = os.path.join(os.path.dirname(__file__), '..', 'audit', 'parity', 'official')
n = lambda s: int(float(str(s).replace(',', '').replace('+', '')))
def sha(f): return hashlib.sha256(open(os.path.join(S, f), 'rb').read()).hexdigest()
def textlines(f):
    t = open(os.path.join(S, f), encoding='utf-8', errors='replace').read()
    t = re.sub(r'(?is)<(script|style).*?</\1>', '', t)
    t = re.sub(r'(?i)</(tr|p|div|h\d|br)>|<br\s*/?>', '\n', t); t = re.sub(r'(?i)</t[dh]>', ' | ', t)
    t = html.unescape(re.sub(r'<[^>]+>', '', t))
    return [l for l in (re.sub(r'\s+', ' ', x).strip() for x in t.split('\n')) if l.strip(' |')]

def maine():
    import xlrd
    f = 'maine-updated-summary-report-CD2.xls'; sh = xlrd.open_workbook(os.path.join(S, f)).sheet_by_index(0)
    rows = [[c.value for c in sh.row(r)] for r in range(sh.nrows)]
    R = [{'tallies': {}, 'transfers': {}, 'categories': {}} for _ in range(2)]
    cat = {'By Overvotes': 'overvotes', 'By Undervotes': 'undervotes', 'By Exhausted Choices': 'exhaustedChoices', 'Continuing Ballots': 'continuing', 'TOTAL': 'total'}
    for row in rows[8:12]:
        name = re.sub(r'^(DEM|REP) ', '', str(row[0]).strip())
        R[0]['tallies'][name] = n(row[1]); R[0]['transfers'][name] = n(row[3]); R[1]['tallies'][name] = n(row[4]); R[1]['transfers'][name] = n(row[6])
    for row in rows[12:18]:
        k = str(row[0]).strip()
        if k in cat:  # columns: R1 votes, R1 transfer, R2 votes, R2 transfer (non-empty cells in order)
            v = [x for x in row[1:] if x != '']
            R[0]['categories'][cat[k]] = n(v[0]); R[1]['categories'][cat[k]] = n(v[2])
            if cat[k] not in ('continuing', 'total'): R[0]['transfers'][cat[k]] = n(v[1]); R[1]['transfers'][cat[k]] = n(v[3])  # those two rows carry percentage cells, not transfers
    thr = [x for x in rows[18][1:] if x != '']; R[0]['threshold'] = n(thr[0]); R[1]['threshold'] = n(thr[1])
    R[0]['eliminated'] = sorted(k for k, v in R[0]['transfers'].items() if k in R[0]['tallies'] and v < 0)
    R[1]['eliminated'] = []
    w = max(R[1]['tallies'], key=R[1]['tallies'].get)
    return {'source': f, 'sha256': sha(f), 'publisher': 'Maine Secretary of State (RCV summary report)', 'rounds': R, 'winner': w}

def alaska():
    f = 'alaska-RcvDetailedReport.pdf'
    t = subprocess.run(['pdftotext', '-layout', os.path.join(S, f), '-'], capture_output=True, text=True, check=True).stdout
    R = []; cur = None; elim = None
    for l in t.split('\n'):
        s = l.strip()
        if m := re.match(r'^Round (\d+)$', s): cur = {'tallies': {}, 'categories': {}, 'transfers': {}}; R.append(cur); continue
        if cur is None: continue
        if m := re.match(r'^(.+?, .+?)\s{2,}([\d,]+)\s+[\d.]+%$', s): cur['tallies'][m[1]] = n(m[2]); continue
        if m := re.match(r'^(Continuing Ballots Total|Blanks|Exhausted|Overvotes|Remainder Points|Non Transferable Total)\s+([\d,]+)$', s):
            cur['categories'][{'Continuing Ballots Total': 'continuing', 'Blanks': 'blanks', 'Exhausted': 'exhausted', 'Overvotes': 'overvotes', 'Remainder Points': 'remainder', 'Non Transferable Total': 'nonTransferable'}[m[1]]] = n(m[2]); continue
        if m := re.match(r'^(.+?) is eliminated', s): cur['eliminated'] = [m[1]]; continue
        if m := re.match(r'^(.+?) is elected', s): cur['elected'] = [m[1]]; continue
        if m := re.match(r'^(.+?, .+?)\s{2,}(.+?)\s{2,}(\d+)\s+([\d,]+)$', s): cur['transfers'][m[2]] = n(m[4]); continue
    R[-1]['skipEliminated'] = True  # last-round 'eliminated because not elected' is a report formality
    return {'source': f, 'sha256': sha(f), 'publisher': 'Alaska Division of Elections (Dominion RCV Detailed Report)', 'rounds': R, 'winner': R[-1]['elected'][0]}

def nyc():
    f = 'nyc-recap.html'; L = textlines(f)
    i = next(k for k, l in enumerate(L) if l.startswith('| Round 1'))
    nr = len(re.findall(r'Round \d+', L[i]))
    cells = lambda l: [c.strip() for c in l.split('|')]
    el = cells(L[i + 1])[1:1 + nr]; ed = cells(L[i + 2])[1:1 + nr]
    # The BOE lists a candidate under the round whose tally no longer includes them, i.e. the
    # candidate was eliminated at the end of the previous round; store it on that previous round.
    names = lambda c: sorted(x.strip(' *') for x in c.split(';') if x.strip())
    R = [{'tallies': {}, 'transfers': {}, 'eliminated': names(el[k + 1]) if k + 1 < nr else [], 'elected': names(ed[k])} for k in range(nr)]
    for l in L[i + 4:]:
        if l.startswith('*'): break
        c = cells(l); name, v = c[0], c[1:]
        if name == 'Inactive ballots':
            # same layout as candidates: [votes, pct, transfer] per round; round 1 has no inactive figure
            for k in range(nr):
                if k: R[k]['inactiveSinceR1'] = n(v[3 * k])
                if k < nr - 1 and v[3 * k + 2]: R[k]['transfers']['inactive'] = n(v[3 * k + 2])
            continue
        for k in range(nr):
            if 3 * k < len(v) and re.fullmatch(r'[\d,]+', v[3 * k] or ''): R[k]['tallies'][name] = n(v[3 * k])
            if 3 * k + 2 < len(v) and re.fullmatch(r'-?\d+', v[3 * k + 2] or ''): R[k]['transfers'][name] = n(v[3 * k + 2])
            # "-XXX" = all votes transferred out; recorded as the negative of the round's votes
            if 3 * k + 2 < len(v) and v[3 * k + 2] == '-XXX': R[k]['transfers'][name] = -R[k]['tallies'][name]
    w = R[-1]['elected'][0]
    return {'source': f, 'sha256': sha(f), 'publisher': 'NYC Board of Elections (certified ranked-choice rounds, 2021-07-20)', 'rounds': R, 'winner': w}

def burlington():
    f = 'burlington-2009-mayor.official-rounds.html'; L = [l.strip(' |') for l in textlines(f)]
    m = next(re.search(r'threshold is (\d+)', l) for l in L if 'threshold is' in l); thr = int(m[1])
    valid = n(next(re.match(r'([\d,]+) valid ballots', l)[1] for l in L if re.match(r'[\d,]+ valid ballots', l)))
    R = []; k = 0
    while k < len(L):
        if re.match(r'^ROUND \d+ --', L[k]):
            cur = {'tallies': {}, 'transfers': {}, 'status': {}}; R.append(cur); k += 5
            while not L[k].startswith('EXHAUSTED'):
                cur['transfers'][L[k]] = n(L[k + 1]); cur['tallies'][L[k]] = n(L[k + 2]); cur['status'][L[k]] = L[k + 3]; k += 4
            assert L[k + 3] == 'TOTALS:', L[k + 3]
            cur['transfers']['exhausted'] = n(L[k + 1]); cur['exhaustedPile'] = n(L[k + 2]); cur['totals'] = n(L[k + 5]); k += 6
            continue
        k += 1
    for i, r in enumerate(R):
        r['eliminated'] = sorted(c for c, s in r['status'].items() if s.startswith('DEFEATED') and (i == 0 or not R[i - 1]['status'][c].startswith('DEFEATED')))
        r['elected'] = [c for c, s in r['status'].items() if s.startswith('ELECTED') and (i == 0 or not R[i - 1]['status'][c].startswith('ELECTED'))]
    for r in R:
        if all(v == 0 for v in r['transfers'].values()): r['formal'] = True  # closing round: nothing moves
    for r in R:
        if r['elected']: r['skipEliminated'] = True
    w = next(c for c, s in R[-1]['status'].items() if s.startswith('ELECTED'))
    return {'source': f, 'sha256': sha(f), 'publisher': 'City of Burlington, ChoicePlus Pro 2.3.2 round detail report (copy kept at rangevoting.org)', 'threshold': thr, 'validBallots': valid, 'rounds': R, 'winner': w}

for name, fn in [('maine-2018-cd2', maine), ('alaska-2022-special', alaska), ('nyc-2021-dem-mayor', nyc), ('burlington-2009-mayor', burlington)]:
    d = fn(); json.dump(d, open(os.path.join(O, name + '.json'), 'w'), indent=1, ensure_ascii=False); print(name, len(d['rounds']), 'rounds, winner', d['winner'])
