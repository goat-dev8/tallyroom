# api:tabulate-alaska
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
    r = post("/api/elections/alaska-2022/tabulate"); assert r.status_code == 200, r.text[:300]
    j = r.json(); conserved(j)
    assert j["winner"] == "Peltola, Mary S." and j["totalBallots"] == 192289 and len(j["rounds"]) == 2
    r1, r2 = j["rounds"]
    assert r1["tallies"] == {"Begich, Nick": 53810, "Palin, Sarah": 58973, "Peltola, Mary S.": 75799} and r1["continuing"] == 188582 and r1["inactive"]["overvote"] == 295
    assert r1["eliminated"] == ["Begich, Nick"]
    assert r2["tallies"] == {"Palin, Sarah": 86026, "Peltola, Mary S.": 91266} and r2["continuing"] == 177292 and r2["inactive"]["overvote"] == 342
    assert r2["transfers"] == {"Palin, Sarah": 27053, "Peltola, Mary S.": 15467}

test()
