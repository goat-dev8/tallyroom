# regress:bug-029
import os; os.environ["TALLYROOM_BASE_URL"] = "https://tallyroom-rosy.vercel.app"  # tallyroom: bound base URL
import json, unicodedata, requests
# Regression guard for BUG-029: one surplus per stage, largest first (SSI 2007/42 Sch. 1 r. 49) (audit/defects.md). Asserts the CORRECT behaviour, so it fails while the bug is live.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(body=None, raw=None, ctype="application/json"):
    r = requests.post(BASE + "/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])

def test():
    st, j = post({"ballots": "91,A>C\n55,B>C>D\n10,C\n40,D\n44,F", "seats": 4, "candidates": ["A", "B", "C", "D", "F"]})
    assert st == 200, (st, j)
    assert sorted(j["winners"]) == ["A", "B", "C", "D"], j

test()
