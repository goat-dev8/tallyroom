# api:tabulate-csv-and-presets
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
    j = post("/api/tabulate", raw="count,rank1,rank2\n5,A,B\n4,B,C\n2,C,B", ctype="text/csv").json()
    assert j["winner"] == "B" and j["rounds"][0]["tallies"] == {"A": 5, "B": 4, "C": 2} and j["rounds"][1]["tallies"] == {"A": 5, "B": 6}
    j2 = post("/api/tabulate", {"ballots": "5,A>B\n4,B>C\n2,C>B"}).json()
    assert j2["winner"] == "B" and j2["rounds"] == j["rounds"]
    j3 = post("/api/tabulate", {"ballots": "5,A>B", "rules": "maine-2018"}).json()
    assert j3["rules"] == {"overvote": "exhaust", "skips": "two-exhaust", "batch": True, "tiebreak": "lot"}, j3["rules"]

test()
