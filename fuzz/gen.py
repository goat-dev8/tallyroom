"""Seeded election generator for the differential fuzz run.
python3 fuzz/gen.py SEED COUNT > cases.jsonl   (one JSON case per line, with the oracle's answer attached)"""
import json, random, sys, unicodedata
from oracle import parse, irv, stv

NAMES = ["Ada", "Bo", "Cy", "Dee", "Eli", "Fay", "Gus"]
# Decomposed (NFD) spellings: the engine must treat them as the composed name everywhere (review item 5).
NFD_NAMES = [unicodedata.normalize("NFD", n) for n in ["José", "Zoë", "Ñuño", "Åsa", "Rémi", "Ünal", "Çelik"]]


def ballot_line(rng, cands):
    n = rng.choice([1, 1, 2, 2, 3, 5, 8, 13, rng.randint(1, 40)])  # small counts => frequent ties
    toks = []
    for _ in range(rng.randint(0, len(cands) + 2)):
        r = rng.random()
        if r < 0.12:
            toks.append("_")
        elif r < 0.20:
            toks.append("[" + "=".join(rng.sample(cands, rng.randint(2, min(3, len(cands))))) + "]")
        else:
            toks.append(rng.choice(cands))  # repeats happen naturally
    if not toks:
        toks = ["_"]
    return f"{n}," + ">".join(toks)


def case(rng, i):
    k = rng.randint(2, 7)
    cands = (NFD_NAMES if rng.random() < 0.15 else NAMES)[:k]
    text = "\n".join(ballot_line(rng, cands) for _ in range(rng.randint(1, 25)))
    ballots = parse(text)
    stv_case = k >= 3 and rng.random() < 0.35
    fmt = rng.choice(["text", "text", "spaced", "columns"])
    c = {"id": i, "candidates": cands, "format": fmt}
    eol = rng.choice(["\n", "\n", "\r\n", "\r"])  # LF, CRLF and bare CR line endings (BUG-016)
    if fmt == "text":
        c["ballots"] = text.replace("\n", eol)
    elif fmt == "spaced":  # same ballots, alternate spellings the parser documents
        c["ballots"] = "count,ranking\n" + "\n".join(
            n + ", " + " > ".join("undervote" if t == "_" else t for t in r.split(">"))
            for n, r in (l.split(",", 1) for l in text.splitlines()))
    else:  # one rank per CSV column; short rows are padded with blank (skipped) ranks
        width = max(len(m) for _, m in ballots)
        rows = ["count," + ",".join(f"rank{j + 1}" for j in range(width))]
        for n, r in (l.split(",", 1) for l in text.splitlines()):
            cells = ["" if t == "_" else t for t in r.split(">")]
            rows.append(n + "," + ",".join(cells + [""] * (width - len(cells))))
        c["csv"] = "\n".join(rows)
        ballots = [(n, m + [("skip",)] * (width - len(m))) for n, m in ballots]
    if stv_case:
        c["seats"] = rng.randint(2, k - 1)
        c["quota"] = rng.choice(["droop", "hare"])
        tb = rng.choice(["previous-round", "lot"])  # STV ties follow the rules too (BUG-014)
        c["rules"] = {"tiebreak": tb}
        if rng.random() < 0.4:
            c["rules"]["lotOrder"] = rng.sample(cands, k)
        c["expected"] = stv(ballots, cands, c["seats"], c["quota"], tb, c["rules"].get("lotOrder"))
    else:
        rules = {"overvote": rng.choice(["exhaust", "skip", "continuing"]),
                 "skips": rng.choice(["continue", "two-exhaust"]),
                 "duplicates": rng.choice(["ignore", "skip"]),
                 "batch": rng.random() < 0.35,
                 "tiebreak": rng.choice(["previous-round", "lot"])}
        if rng.random() < 0.3:
            rules["lotOrder"] = rng.sample(cands, k)
        c["rules"] = rules
        c["expected"] = irv(ballots, cands, rules)
    return c


if __name__ == "__main__":
    seed, n = int(sys.argv[1]), int(sys.argv[2])
    rng = random.Random(seed)
    for i in range(n):
        print(json.dumps(case(rng, i), separators=(",", ":")))
