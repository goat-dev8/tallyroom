# api:report-hash-stable
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
    a = requests.get(BASE + "/api/report?election=maine-2018-cd2", timeout=60).json()
    b = requests.get(BASE + "/api/report?election=maine-2018-cd2", timeout=60).json()
    assert a["contentHash"].startswith("sha256:") and len(a["contentHash"]) == 71 and a["contentHash"] == b["contentHash"]
    assert a["winner"] == "DEM Golden, Jared F."
    u1 = post("/api/report", {"ballots": "5,A>B\n4,B>C\n2,C>B"}).json(); u2 = post("/api/report", {"ballots": "5,A>B\n4,B>C\n2,C>B"}).json()
    assert u1["contentHash"] == u2["contentHash"] != a["contentHash"] and u1["winner"] == "B"
    assert u1["rounds"][1]["transfers"] == [{"count": 2, "from": "C", "to": "B"}]
    u3 = post("/api/report", {"ballots": "5,A>B\n4,B>C\n3,C>B"}).json()
    assert u3["contentHash"] != u1["contentHash"]

test()
