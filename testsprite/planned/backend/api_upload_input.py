# api:upload-input
# BUG-009..011 (audit/defects.md): "#" comment lines with commas are ignored; the 4 MB limit is in bytes; JSON sent as text/csv is read as JSON.
import os, requests
BASE = os.environ["TALLYROOM_BASE_URL"].rstrip("/")

def post(body):
    return requests.post(BASE + "/api/tabulate", data=body.encode("utf-8"), headers={"Content-Type": "text/csv"}, timeout=60)

def test():
    r = post("# exported 2024-10-01, Ward 3\n3,A>B\n2,B\n"); assert r.status_code == 200, (r.status_code, r.text[:300])
    j = r.json(); assert j["totalBallots"] == 5 and j["rounds"][0]["tallies"] == {"A": 3, "B": 2}, j
    r = post("# source: county, state\nrank1,rank2\nA,B\nB,A\nA,\n"); assert r.status_code == 200, (r.status_code, r.text[:300])
    j = r.json(); assert j["candidates"] == ["A", "B"] and j["totalBallots"] == 3, j

test()

def test_bytes_and_type():
    # BUG-010: over 4 MB in UTF-8 bytes but under 4M characters
    body = ("1," + "é" * 1000 + "\n") * 2500
    r = post(body); assert r.status_code == 413 and r.json()["error"]["code"] == "PAYLOAD_TOO_LARGE", (r.status_code, r.text[:200])
    # BUG-011: JSON labelled text/csv
    r = post('{"ballots":["A>B","B","A"]}'); assert r.status_code == 200, r.text[:300]
    j = r.json(); assert j["candidates"] == ["A", "B"] and j["winner"] == "A", j

test_bytes_and_type()
