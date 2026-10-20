"""Hostile-input generator: the shapes of bugs already fixed, so the fuzzer can find them again.
python3 fuzz/hostile.py SEED COUNT > hostile.jsonl
Each case: {id, shape, contentType, body, expect}. expect is either {"status": 422, "code": ...}, {"status": 413}
or {"status": 200, "result": <oracle answer>} with the answer from fuzz/oracle.py on the canonical ballots."""
import json, random, sys
from oracle import parse, irv

RESERVED = ["__proto__", "constructor", "prototype", "toString", "hasOwnProperty", "valueOf", "__defineGetter__"]
UNICODE = ["Zoë", "Łukasz", "李娜", "Ωmega", "Nguyễn", "Ana María", "Ölçer"]
PLAIN = ["Ada", "Bo", "Cy"]
DEFAULT_RULES = {"overvote": "exhaust", "skips": "continue", "duplicates": "ignore", "batch": False, "tiebreak": "previous-round"}
SAFE = 2 ** 53 - 1
LIMIT = 4 * 1024 * 1024


def first_seen(lines):
    seen = []
    for l in lines:
        for tok in l.split(",", 1)[1].split(">"):
            for name in tok.strip().strip("[]").split("="):
                name = name.strip()
                if name and name != "_" and name not in seen:
                    seen.append(name)
    return seen


def ballots(rng, names, big=False):
    out = []
    for _ in range(rng.randint(1, 8)):
        n = rng.randint(2 ** 40, 2 ** 49) if big else rng.randint(1, 30)
        out.append(f"{n}," + ">".join(rng.sample(names, rng.randint(1, len(names)))))
    return out


def counted(lines):
    text = "\n".join(lines)
    cands = first_seen(lines)
    return {"status": 200, "result": irv(parse(text), cands, DEFAULT_RULES)}


def case(rng, i):
    shape = rng.choice(["reserved", "unicode", "big-safe", "big-over", "header-only", "comments",
                        "json-as-csv", "crlf-bom", "bytes-over", "bytes-under"])
    pool = {"reserved": RESERVED, "unicode": UNICODE}.get(shape, PLAIN)
    names = rng.sample(pool + PLAIN, rng.randint(2, 4)) if shape in ("reserved", "unicode") else PLAIN[: rng.randint(2, 3)]
    ct, lines = "text/csv", ballots(rng, names, big=shape == "big-safe")
    if shape == "big-safe":  # every count < 2^50, total below 2^53: must be counted exactly
        body, expect = "\n".join(lines), counted(lines)
    elif shape == "big-over":  # total above 2^53 - 1: must be refused, never rounded
        lines.append(f"{SAFE - rng.randint(0, 10)},{names[0]}")
        body, expect = "\n".join(lines), {"status": 422, "code": "INVALID_COUNT"}
    elif shape == "header-only":
        body, expect = rng.choice(["count,ranking", "count,ranking\n", "count, ranking\n\n"]), {"status": 422, "code": "NO_BALLOTS"}
    elif shape == "comments":  # '#' lines with commas between ballots are comments
        out = []
        for l in lines:
            if rng.random() < 0.5:
                out.append("# " + rng.choice(["exported 2024-10-01, Ward 3", "source: county, state", "a,b,c", "# , ,"]))
            out.append(l)
        body, expect = "\n".join(out), counted(lines)
    elif shape == "json-as-csv":  # a JSON body with the wrong Content-Type is still JSON
        body, expect = json.dumps({"ballots": "\n".join(lines)}), counted(lines)
    elif shape == "crlf-bom":
        body, expect = "\ufeff" + "\r\n".join(lines) + "\r\n", counted(lines)
    elif shape in ("bytes-over", "bytes-under"):  # 2-byte characters: the limit is in UTF-8 bytes, not characters
        n = (LIMIT // 2) - 1 + (rng.randint(1, 64) if shape == "bytes-over" else -rng.randint(1, 64))
        size = len(("3," + "é" * n).encode())  # body is built by the runner from "repeat" (keeps the jsonl small)
        expect = {"status": 413} if size > LIMIT else {"status": 200, "winnerLength": n}
        return {"id": i, "shape": shape, "contentType": ct, "repeat": {"prefix": "3,", "char": "é", "n": n}, "bytes": size, "expect": expect}
    else:
        body, expect = "\n".join(lines), counted(lines)
    return {"id": i, "shape": shape, "contentType": ct, "body": body, "expect": expect}


if __name__ == "__main__":
    seed, n = int(sys.argv[1]), int(sys.argv[2])
    rng = random.Random(seed)
    for i in range(n):
        print(json.dumps(case(rng, i), ensure_ascii=False, separators=(",", ":")))
