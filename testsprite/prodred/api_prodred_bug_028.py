# api:prodred-bug-028
import os; os.environ["TALLYROOM_BASE_URL"] = "https://tallyroom-rosy.vercel.app"  # tallyroom: bound base URL
import json, unicodedata, requests
# Red-first production check for BUG-028: the STV quota is computed from valid ballots (SSI 2007/42 Sch. 1 r. 46) (audit/defects.md). Asserts the CORRECT behaviour, so it fails while the bug is live.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(body=None, raw=None, ctype="application/json"):
    r = requests.post(BASE + "/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])

def test():
    st, j = post({"ballots": "10,A>C\n6,B\n5,C\n9,_", "seats": 2, "candidates": ["A", "B", "C"]})
    assert st == 200, (st, j)
    assert j["quotaExact"] == "8/1" and j["winners"] == ["A", "C"], j

test()
