# api:tabulate-maine
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
    r = post("/api/elections/maine-2018-cd2/tabulate"); assert r.status_code == 200, r.text[:300]
    j = r.json(); conserved(j)
    assert j["winner"] == "DEM Golden, Jared F." and j["totalBallots"] == 296077 and len(j["rounds"]) == 2
    assert j["rounds"][0]["tallies"] == {"REP Poliquin, Bruce": 134184, "DEM Golden, Jared F.": 132013, "Bond, Tiffany L.": 16552, "Hoar, William R.S.": 6875}
    assert j["rounds"][1]["tallies"] == {"DEM Golden, Jared F.": 142440, "REP Poliquin, Bruce": 138931}
    assert j["rounds"][1]["continuing"] == 281371 and j["rounds"][1]["inactive"]["overvote"] == 533 and j["rounds"][1]["inactive"]["exhausted"] == 335

test()
