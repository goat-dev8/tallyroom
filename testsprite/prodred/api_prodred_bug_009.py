# api:prodred-bug-009
import os; os.environ["TALLYROOM_BASE_URL"] = "https://tallyroom-rosy.vercel.app"  # tallyroom: bound base URL
import json, unicodedata, requests
# Red-first production check for BUG-009: a "#" comment line with a comma is a comment, not data (audit/defects.md). Asserts the CORRECT behaviour, so it fails while the bug is live.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(body=None, raw=None, ctype="application/json"):
    r = requests.post(BASE + "/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])

def test():
    st, j = post(raw="# note, with comma\n3,A>B\n2,B>A\n", ctype="text/csv")
    assert st == 200, (st, j)
    assert j["candidates"] == ["A", "B"] and j["winner"] == "A", j

test()
