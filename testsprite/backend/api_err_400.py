# api:err-parse-400
import os, json, hashlib, requests
# Target: TALLYROOM_BASE_URL, bound to the PR preview by scripts/testsprite-api.mjs. No hard-coded default.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(path, body=None, raw=None, ctype="application/json"):
    return requests.post(BASE + path, data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
def err(r, status, code):
    assert r.status_code == status, (r.status_code, r.text[:300])
    j = r.json(); assert j["error"]["code"] == code, j; return j["error"]
def conserved(j):
    for rd in j["rounds"]:
        assert sum(rd["tallies"].values()) == rd["continuing"], rd["round"]
        assert rd["continuing"] + sum(rd["inactive"].values()) == j["totalBallots"], rd["round"]

def test():
    err(post("/api/tabulate", raw=""), 400, "INVALID_JSON")
    e = err(post("/api/tabulate", {"ballots": "5,A>B\nx,B"}), 400, "INVALID_COUNT"); assert e["details"] == {"row": 2, "column": 1}
    e = err(post("/api/tabulate", {"ballots": "5,A>Z", "candidates": ["A", "B"]}), 422, "UNKNOWN_CANDIDATE"); assert e["details"]["candidate"] == "Z"
    err(post("/api/tabulate", raw='rank1,rank2\nA,"B', ctype="text/csv"), 400, "UNTERMINATED_QUOTE")
    err(post("/api/tabulate", {"ballots": "5,A>B", "rules": "nope"}), 400, "UNKNOWN_PRESET")
    err(requests.get(BASE + "/api/report", timeout=30), 400, "MISSING_ELECTION")

test()
