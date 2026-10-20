# api:elections-list
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
    r = requests.get(BASE + "/api/elections", timeout=30); assert r.status_code == 200
    e = {x["id"]: x for x in r.json()["elections"]}
    assert list(e) == ["maine-2018-cd2", "alaska-2022", "nyc-2021", "burlington-2009"]
    assert (e["maine-2018-cd2"]["ballotCount"], e["maine-2018-cd2"]["certifiedWinner"]) == (296077, "DEM Golden, Jared F.")
    assert (e["alaska-2022"]["ballotCount"], e["alaska-2022"]["certifiedWinner"]) == (192289, "Peltola, Mary S.")
    assert e["nyc-2021"]["certifiedWinner"] == "Eric L. Adams"
    for x in e.values(): assert x["method"] == "IRV" and x["seats"] == 1 and x["source"].startswith("https://")

test()
