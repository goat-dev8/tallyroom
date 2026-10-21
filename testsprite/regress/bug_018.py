# regress:bug-018
import os; os.environ["TALLYROOM_BASE_URL"] = "https://tallyroom-rosy.vercel.app"  # tallyroom: bound base URL
import json, unicodedata, requests
# Regression guard for BUG-018: lotOrder names are NFC-normalised (audit/defects.md). Asserts the CORRECT behaviour, so it fails while the bug is live.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(body=None, raw=None, ctype="application/json"):
    r = requests.post(BASE + "/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])

def test():
    nfd = unicodedata.normalize("NFD", "Zo\u00eb")
    st, j = post({"ballots": "3,Zo\u00eb\n3,Bo", "rules": {"tiebreak": "lot", "lotOrder": [nfd, "Bo"]}})
    assert st == 200, (st, j)
    assert j["winner"] == "Zo\u00eb", j

test()
