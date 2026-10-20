# api:certified-rounds-alaska
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

CERT = {"totalBallots": 192289, "rounds": [{"tallies": {"Begich, Nick": 53810, "Palin, Sarah": 58973, "Peltola, Mary S.": 75799}, "continuing": 188582, "blanks": 3412, "exhausted": 0, "overvotes": 295}, {"tallies": {"Palin, Sarah": 86026, "Peltola, Mary S.": 91266}, "continuing": 177292, "blanks": 3412, "exhausted": 11243, "overvotes": 342}], "begichTransfers": {"Palin, Sarah": 27053, "Peltola, Mary S.": 15467, "exhausted": 11243, "overvotes": 47}}

def get_rounds(slug):
    r = requests.get(BASE + "/api/elections/" + slug + "/rounds", timeout=120); assert r.status_code == 200, r.text[:300]
    j = r.json(); conserved(j); return j

def test():
    j = get_rounds("alaska-2022")
    assert j["totalBallots"] == CERT["totalBallots"] and len(j["rounds"]) == len(CERT["rounds"]) and j["winner"] == "Peltola, Mary S."
    r1 = j["rounds"][0]
    for i, (rd, cr) in enumerate(zip(j["rounds"], CERT["rounds"])):
        ina = rd["inactive"]
        assert rd["tallies"] == cr["tallies"], (i, rd["tallies"])
        assert rd["continuing"] == cr["continuing"], (i, rd["continuing"])
        assert ina["overvote"] == cr["overvotes"], (i, ina)
        # Division of Elections "blank" = ballots with no usable mark in round 1 (blank + skipped + undervoted)
        r1_blank = r1["inactive"]["blank"] + r1["inactive"]["skips"] + r1["inactive"]["undervote"]
        assert r1_blank == cr["blanks"], (i, r1_blank)
        assert ina["skips"] + ina["undervote"] + ina["exhausted"] + ina["blank"] - r1_blank == cr["exhausted"], (i, ina)

test()
