# api:tie-break
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
    j = post("/api/tabulate", {"ballots": "3,A>B\n3,B>A"}).json()
    assert j["rounds"][0]["eliminated"] == ["B"] and j["rounds"][0]["tieNote"] == "lot" and j["winner"] == "A"
    j2 = post("/api/tabulate", {"ballots": "3,A>B\n3,B>A", "rules": {"tiebreak": "lot", "lotOrder": ["B", "A"]}}).json()
    assert j2["winner"] == "B", j2

test()
