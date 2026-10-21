"""Second, independent counter for Tallyroom (Python standard library only).

Written from the rule descriptions (src/types.ts doc comments, README), never from the TypeScript source, so a
shared misreading is less likely. Ballot text uses the public upload syntax: `count,A>B>_>[A=C]`.

IRV
  * a ballot counts for its highest-ranked continuing candidate;
  * `_` is a blank rank; `[X=Y]` is an overvote naming X and Y;
  * overvote rule: exhaust -> ballot inactive; skip -> rank passed over;
    continuing -> counts for the single continuing name, passed over if none, inactive if 2+;
  * skips rule two-exhaust: two blank ranks in a row (a repeat counts as blank under duplicates=skip) -> inactive;
    under duplicates=ignore a repeat is still a marked rank, so it ends a run of blanks;
  * a ballot that went inactive stays inactive;
  * win: majority of continuing votes (floor(c/2)+1), last candidate standing, or strict leader of the final two;
  * batch: drop the largest group of trailing candidates whose combined votes are below the next one up;
  * last-place ties: previous-round looks back round by round, then lot (last listed in lot order goes).
STV (seats > 1): Droop floor(n/(s+1))+1 or Hare n/s on all ballots, exact fractions, weighted inclusive Gregory:
  everyone at or above quota is elected together, each transfers (votes-quota)/votes of every paper it holds;
  blanks are passed over, overvotes exhaust; when hopefuls <= open seats they all win; otherwise the lowest
  hopeful is excluded; ties for lowest use the same rules as IRV (previous-round by default, then lot).
Lines may end in LF, CRLF or a bare CR.
"""
from fractions import Fraction
import unicodedata


def inferred_candidates(ballots):
    """Candidate order when none are declared: first appearance, names inside [X=Y] included (BUG-021)."""
    out = []
    for _, marks in ballots:
        for m in marks:
            for x in ((m[1],) if m[0] == "c" else m[1] if m[0] == "ov" else ()):
                if x not in out:
                    out.append(x)
    return out


def parse(text):
    out = []
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if not line.strip():
            continue
        n, rest = line.split(",", 1)
        marks = []
        for tok in rest.split(">"):
            tok = tok.strip()
            if tok in ("", "_"):
                marks.append(("skip",))
            elif tok.startswith("["):
                marks.append(("ov", tuple(unicodedata.normalize("NFC", x.strip()) for x in tok[1:-1].split("="))))
            else:
                marks.append(("c", unicodedata.normalize("NFC", tok)))
        out.append((int(n), marks))
    return out


def irv_pick(marks, live, rules):
    if not any(m[0] != "skip" for m in marks):
        return None
    seen, blanks = set(), 0
    for m in marks:
        if m[0] == "ov":
            mode = rules["overvote"]
            if mode == "exhaust":
                return None
            if mode == "continuing":
                hits = [x for x in m[1] if x in live]
                if len(hits) == 1:
                    return hits[0]
                if len(hits) > 1:
                    return None
            blanks = 0
            continue
        if m[0] == "skip" or (m[1] in seen and rules.get("duplicates") == "skip"):
            blanks += 1
            if rules["skips"] == "two-exhaust" and blanks >= 2:
                return None
            continue
        if m[1] in seen:
            blanks = 0
            continue
        seen.add(m[1])
        blanks = 0
        if m[1] in live:
            return m[1]
    return None


def irv(ballots, cands, rules):
    cands = [unicodedata.normalize("NFC", x) for x in cands]  # names are compared after NFC
    lot = [unicodedata.normalize("NFC", x) for x in (rules.get("lotOrder") or cands)]
    live = list(cands)
    dead = set()
    rounds = []
    picks = {}
    while True:
        tally = {c: 0 for c in live}
        moved = {}  # transfers off last round's eliminated candidates; inactive ballots stay inactive (BUG-022)
        gone = set(rounds[-1]["eliminated"]) if rounds else set()
        for i, (n, marks) in enumerate(ballots):
            if i in dead:
                continue
            p = irv_pick(marks, set(live), rules)
            if picks.get(i) in gone:
                key = (picks[i], p or "exhausted")
                moved[key] = moved.get(key, 0) + n
            picks[i] = p
            if p is None:
                dead.add(i)
            else:
                tally[p] += n
        cont = sum(tally.values())
        rd = {"tallies": tally, "continuing": cont, "eliminated": [],
              "transfers": sorted([{"from": f, "to": t, "count": c} for (f, t), c in moved.items()], key=lambda e: (e["from"], e["to"]))}
        rounds.append(rd)
        top = max(live, key=lambda c: (tally[c], -lot.index(c)))
        if tally[top] >= cont // 2 + 1 or len(live) == 1:
            return {"winner": top, "rounds": rounds}
        if len(live) == 2 and tally[live[0]] != tally[live[1]]:
            return {"winner": top, "rounds": rounds}
        out = []
        if rules["batch"]:
            asc = sorted(live, key=lambda c: (tally[c], -lot.index(c)))
            for k in range(1, len(asc) - 1):
                if sum(tally[c] for c in asc[:k]) < tally[asc[k]]:
                    out = asc[:k]
        if not out:
            low = min(tally.values())
            tied = [c for c in live if tally[c] == low]
            if len(tied) > 1 and rules["tiebreak"] == "previous-round":
                for prev in reversed(rounds[:-1]):
                    m = min(prev["tallies"][c] for c in tied)
                    tied = [c for c in tied if prev["tallies"][c] == m]
                    if len(tied) == 1:
                        break
            if len(tied) > 1:
                tied = [max(tied, key=lot.index)]
            out = tied
        rd["eliminated"] = out
        live = [c for c in live if c not in out]


def stv(ballots, cands, seats, quota_kind, tiebreak="previous-round", lot=None, rules=None):
    # BUG-019: ballots are read with the IRV ballot rules; once inactive, a paper stays inactive.
    # BUG-028/029 (SSI 2007/42 Sch. 1): quota from valid papers (rules 45(3), 46); one surplus per stage, largest
    # first (rule 49); a paper only moves when its holder is excluded or its surplus is transferred.
    rules = {"overvote": "exhaust", "skips": "continue", "duplicates": "ignore", **(rules or {})}
    cands = [unicodedata.normalize("NFC", x) for x in cands]
    lot = [unicodedata.normalize("NFC", x) for x in (lot or cands)]
    hist = []
    hope, won, waiting, rounds = list(cands), [], [], []
    w = [Fraction(1)] * len(ballots)
    at = [irv_pick(marks, set(hope), rules) for _, marks in ballots]
    valid = sum(n for (n, _), h in zip(ballots, at) if h is not None)
    if valid == 0:
        return {"status": 422, "error": "NO_VALID_BALLOTS"}
    quota = Fraction(valid // (seats + 1) + 1) if quota_kind == "droop" else Fraction(valid, seats)

    def move(c, f):
        for i, (_, marks) in enumerate(ballots):
            if at[i] == c:
                w[i] *= f
                at[i] = irv_pick(marks, set(hope), rules)

    while len(won) < seats:
        t = {c: Fraction(0) for c in cands if c in hope or c in waiting}
        ex = Fraction(0)
        for i, (n, _) in enumerate(ballots):
            if at[i] is None:
                ex += w[i] * n
            elif at[i] in t:
                t[at[i]] += w[i] * n
        rd = {"tallies": {k: f"{v.numerator}/{v.denominator}" for k, v in t.items()},
              "exhausted": f"{ex.numerator}/{ex.denominator}", "elected": [], "eliminated": []}
        rounds.append(rd)
        hist.append(dict(t))
        order = sorted(hope, key=lambda c: (-t[c], cands.index(c)))
        if len(hope) <= seats - len(won):
            won += order
            rd["elected"] = order
            break
        hit = [c for c in order if t[c] >= quota]
        won += hit
        waiting += hit
        rd["elected"] = list(hit)
        hope = [c for c in hope if c not in hit]
        if len(won) >= seats:
            break
        if len(hope) <= seats - len(won):
            rd["elected"] += hope
            won += hope
            hope = []
            break
        if waiting:
            big = max(t[c] for c in waiting)
            tied = [c for c in waiting if t[c] == big]
            for prev in reversed(hist[:-1]):
                if len(tied) == 1 or any(c not in prev for c in tied):
                    break
                m = max(prev[c] for c in tied)
                tied = [c for c in tied if prev[c] == m]
            s = min(tied, key=lot.index)
            waiting.remove(s)
            rd["surplusTransferred"] = s
            move(s, (t[s] - quota) / t[s])
            continue
        low = min(t[c] for c in hope)
        tied = [c for c in hope if t[c] == low]
        if len(tied) > 1 and tiebreak == "previous-round":
            for prev in reversed(hist[:-1]):
                m = min(prev[c] for c in tied)
                tied = [c for c in tied if prev[c] == m]
                if len(tied) == 1:
                    break
        lo = max(tied, key=lot.index)
        rd["eliminated"] = [lo]
        hope.remove(lo)
        move(lo, Fraction(1))
    return {"winners": won, "quotaExact": f"{quota.numerator}/{quota.denominator}", "rounds": rounds}
