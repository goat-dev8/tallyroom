# api:tabulate-nyc
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
    r = post("/api/elections/nyc-2021/tabulate"); assert r.status_code == 200, r.text[:300]
    j = r.json(); conserved(j)
    assert j["winner"] == "Eric L. Adams" and len(j["rounds"]) == 8
    r1 = j["rounds"][0]["tallies"]
    assert (r1["Eric L. Adams"], r1["Maya D. Wiley"], r1["Kathryn A. Garcia"], r1["Andrew Yang"]) == (289403, 201127, 184463, 115130)
    assert j["rounds"][-1]["tallies"] == {"Eric L. Adams": 404513, "Kathryn A. Garcia": 397316}

test()
