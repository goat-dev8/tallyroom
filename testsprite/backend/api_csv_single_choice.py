# api:csv-single-choice
# BUG-001: headerless count,ranking files whose ballots have one choice each ("3,A") must count, not 422.
import os, requests
BASE = os.environ.get("TALLYROOM_BASE_URL", "https://tallyroom-git-fix-csv-single-choice-goats-projects-3f023cc9.vercel.app").rstrip("/")

def post_csv(text):
    return requests.post(BASE + "/api/tabulate", data=text.encode("utf-8"), headers={"Content-Type": "text/csv"}, timeout=60)

def test():
    r = post_csv("3,A\n2,B\n")
    assert r.status_code == 200, (r.status_code, r.text[:300])
    j = r.json()
    assert j["candidates"] == ["A", "B"] and j["totalBallots"] == 5 and j["winner"] == "A", j
    assert j["rounds"][0]["tallies"] == {"A": 3, "B": 2}, j["rounds"][0]
    # one ballot line, one choice
    r = post_csv("7,Peltola\n"); assert r.status_code == 200, r.text[:300]
    assert r.json()["winner"] == "Peltola" and r.json()["totalBallots"] == 7
    # mixed single and multi-choice lines still read as ranking lines
    r = post_csv("4,A\n3,B>A\n2,C>B\n"); assert r.status_code == 200, r.text[:300]
    j = r.json(); assert j["rounds"][0]["tallies"] == {"A": 4, "B": 3, "C": 2} and j["winner"] == "A", j
    # a single-choice line with a zero count is still a clear 4xx error, not a numeric-candidate guess
    r = post_csv("0,A\n2,B\n"); assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_COUNT", r.text[:300]

test()
