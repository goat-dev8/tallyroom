# api:err-method-405
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
    for m, p in (("GET", "/api/tabulate"), ("PUT", "/api/tabulate"), ("GET", "/api/elections/maine-2018-cd2/tabulate")):
        r = requests.request(m, BASE + p, timeout=30)
        assert r.headers.get("allow") == "POST", (m, p)
        err(r, 405, "METHOD_NOT_ALLOWED")

test()
