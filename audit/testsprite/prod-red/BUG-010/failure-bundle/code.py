# Auto-injected credentials — redacted for security; set TESTSPRITE_AUTH_CREDENTIAL to run this locally
__AUTH_CREDENTIAL__ = __import__("os").environ.get("TESTSPRITE_AUTH_CREDENTIAL", "")
__AUTH_TYPE__ = "public"
__EXTRA_HEADERS__ = {}
__AUTH_HEADERS__ = {}
# api:prodred-bug-010
import os; os.environ["TALLYROOM_BASE_URL"] = "https://tallyroom-rosy.vercel.app"  # tallyroom: bound base URL
import json, unicodedata, requests
# Red-first production check for BUG-010: the 4 MB limit is in UTF-8 bytes (audit/defects.md). Asserts the CORRECT behaviour, so it fails while the bug is live.
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")
def post(body=None, raw=None, ctype="application/json"):
    r = requests.post(BASE + "/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type": ctype}, timeout=120)
    return r.status_code, (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text[:300])

def test():
    raw = json.dumps({"ballots": "1," + "\u00e9" * 2_100_000 + "\n2,B"}, ensure_ascii=False).encode("utf-8")
    assert 4 * 1024 * 1024 < len(raw) < 4_400_000 and len(raw.decode("utf-8")) < 4 * 1024 * 1024
    st, j = post(raw=raw, ctype="application/json; charset=utf-8")
    assert st == 413, (st, str(j)[:200])
    assert j["error"]["code"] == "PAYLOAD_TOO_LARGE", j

test()