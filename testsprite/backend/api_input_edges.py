# api:input-edges
# BUG-002..004 (audit/defects.md): a count,ranking header, candidates named like Object.prototype keys,
# and counts beyond 2^53 must be read correctly or rejected with INVALID_COUNT, never miscounted.
import os, requests
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")

def post(body, ctype="text/csv"):
    return requests.post(BASE + "/api/tabulate", data=body.encode("utf-8"), headers={"Content-Type": ctype}, timeout=60)

def test():
    # BUG-002: the header line is not a ballot
    r = post("count,ranking\n3,A\n2,B\n"); assert r.status_code == 200, (r.status_code, r.text[:300])
    j = r.json(); assert j["candidates"] == ["A", "B"] and j["totalBallots"] == 5 and j["rounds"][0]["tallies"] == {"A": 3, "B": 2}, j
    r = post("count,ranking\n"); assert r.status_code == 422 and r.json()["error"]["code"] == "NO_BALLOTS", (r.status_code, r.text[:300])
    # BUG-003: "__proto__" must keep its 3 votes and win
    r = post("3,__proto__\n2,B\n"); assert r.status_code == 200, r.text[:300]
    j = r.json(); assert j["rounds"][0]["tallies"].get("__proto__") == 3 and j["winner"] == "__proto__", j["rounds"][0]
    r = post("3,constructor\n2,B\n"); assert r.json()["winner"] == "constructor", r.text[:300]
    # BUG-004: no silent rounding of huge counts
    r = post("99999999999999999999,A\n1,B\n"); assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_COUNT", (r.status_code, r.text[:300])
    r = post('{"ballots":[{"count":1e308,"ranks":["A"]},{"count":1,"ranks":["B"]}]}', "application/json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_COUNT", (r.status_code, r.text[:300])

test()
