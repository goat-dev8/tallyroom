# api:certified-rounds-maine
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

CERT = {"totalBallots": 296077, "round1": {"REP Poliquin, Bruce": 134184, "DEM Golden, Jared F.": 132013, "Bond, Tiffany L.": 16552, "Hoar, William R.S.": 6875}, "final": {"DEM Golden, Jared F.": 142440, "REP Poliquin, Bruce": 138931}, "rounds": 2}

def get_rounds(slug):
    r = requests.get(BASE + "/api/elections/" + slug + "/rounds", timeout=120); assert r.status_code == 200, r.text[:300]
    j = r.json(); conserved(j); return j

def test():
    j = get_rounds("maine-2018-cd2")
    assert j["totalBallots"] == CERT["totalBallots"] == 296077 and len(j["rounds"]) == CERT["rounds"] == 2
    assert j["rounds"][0]["tallies"] == CERT["round1"], j["rounds"][0]["tallies"]
    assert j["rounds"][-1]["tallies"] == CERT["final"], j["rounds"][-1]["tallies"]
    assert j["winner"] == "DEM Golden, Jared F."
    r1, r2 = j["rounds"]
    # Maine certified RCV report: ballots inactive in round 1 (blank/overvote/skips) and round 2 exhausted categories
    assert r1["continuing"] == 289624 and r1["inactive"]["overvote"] == 435 and r1["inactive"]["blank"] == 5711
    assert r2["continuing"] == 281371 and r2["inactive"]["overvote"] == 533 and r2["inactive"]["exhausted"] == 335
    assert sorted(r1["eliminated"]) == ["Bond, Tiffany L.", "Hoar, William R.S."]  # batch elimination

test()
