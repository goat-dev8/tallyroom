# regress:bug-019
import os; os.environ["TALLYROOM_BASE_URL"] = "https://tallyroom-rosy.vercel.app"  # tallyroom: bound base URL
import json, unicodedata, requests
# Regression guard for BUG-019: STV reads ballots with rules.skips (two-exhaust) (audit/defects.md). Asserts the CORRECT behaviour, so it fails while the bug is live.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(body=None, raw=None, ctype="application/json"):
    r = requests.post(BASE + "/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])

def test():
    st, j = post({"seats": 2, "ballots": "3,_>_>A\n2,B\n2,C", "rules": {"skips": "two-exhaust"}})
    assert st == 200, (st, j)
    assert j["rounds"][0]["exact"]["tallies"]["A"] == "0/1", j["rounds"][0]
    assert sorted(j["winners"]) == ["B", "C"], j

test()
