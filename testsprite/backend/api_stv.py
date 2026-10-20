# api:stv-multiseat
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
    r = post("/api/tabulate", {"ballots": "5,A>B>C\n4,B>C\n3,C>A\n2,D>C", "seats": 2}); assert r.status_code == 200, r.text
    j = r.json()
    assert j["method"] == "stv" and j["quota"] == "5.0000" and j["winners"] == ["A", "C"]
    assert j["rounds"][0]["elected"] == ["A"] and j["rounds"][1]["eliminated"] == ["D"]
    assert j["rounds"][2]["tallies"] == {"B": "4.0000", "C": "5.0000"}

test()
