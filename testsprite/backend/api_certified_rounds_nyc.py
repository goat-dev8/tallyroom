# api:certified-rounds-nyc
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

CERT = {"rounds": [{"tallies": {"Eric L. Adams": 289403, "Maya D. Wiley": 201127, "Kathryn A. Garcia": 184463, "Andrew Yang": 115130, "Scott M. Stringer": 51778, "Dianne Morales": 26495, "Raymond J. McGuire": 25242, "Shaun Donovan": 23167, "Aaron S. Foldenauer": 7742, "Art Chang": 7048, "Paperboy Love Prince": 3964, "Joycelyn Taylor": 2662, "Isaac Wright Jr.": 2242, "Write-in": 1568}, "inactive": 0, "eliminated": ["Write-in"]}, {"tallies": {"Eric L. Adams": 289603, "Maya D. Wiley": 201193, "Kathryn A. Garcia": 184571, "Andrew Yang": 115301, "Scott M. Stringer": 51850, "Dianne Morales": 26534, "Raymond J. McGuire": 25272, "Shaun Donovan": 23189, "Aaron S. Foldenauer": 7758, "Art Chang": 7064, "Paperboy Love Prince": 4007, "Joycelyn Taylor": 2683, "Isaac Wright Jr.": 2254}, "inactive": 752, "eliminated": ["Isaac Wright Jr."]}, {"tallies": {"Eric L. Adams": 290055, "Maya D. Wiley": 201518, "Kathryn A. Garcia": 184669, "Andrew Yang": 115502, "Scott M. Stringer": 51951, "Dianne Morales": 26645, "Raymond J. McGuire": 25418, "Shaun Donovan": 23314, "Aaron S. Foldenauer": 7819, "Art Chang": 7093, "Paperboy Love Prince": 4060, "Joycelyn Taylor": 2780}, "inactive": 1207, "eliminated": ["Paperboy Love Prince", "Aaron S. Foldenauer", "Art Chang", "Joycelyn Taylor"]}, {"tallies": {"Eric L. Adams": 291806, "Maya D. Wiley": 206013, "Kathryn A. Garcia": 186731, "Andrew Yang": 118008, "Scott M. Stringer": 53599, "Dianne Morales": 30157, "Raymond J. McGuire": 26361, "Shaun Donovan": 24042}, "inactive": 5314, "eliminated": ["Shaun Donovan"]}, {"tallies": {"Eric L. Adams": 295798, "Maya D. Wiley": 209108, "Kathryn A. Garcia": 191876, "Andrew Yang": 121597, "Scott M. Stringer": 56723, "Dianne Morales": 30933, "Raymond J. McGuire": 27934}, "inactive": 8062, "eliminated": ["Raymond J. McGuire", "Dianne Morales", "Scott M. Stringer"]}, {"tallies": {"Eric L. Adams": 317092, "Maya D. Wiley": 239174, "Kathryn A. Garcia": 223634, "Andrew Yang": 135686}, "inactive": 26445, "eliminated": ["Andrew Yang"]}, {"tallies": {"Eric L. Adams": 354657, "Maya D. Wiley": 254728, "Kathryn A. Garcia": 266932}, "inactive": 65714, "eliminated": ["Maya D. Wiley"]}, {"tallies": {"Eric L. Adams": 404513, "Kathryn A. Garcia": 397316}, "inactive": 140202, "eliminated": []}]}

def get_rounds(slug):
    r = requests.get(BASE + "/api/elections/" + slug + "/rounds", timeout=120); assert r.status_code == 200, r.text[:300]
    j = r.json(); conserved(j); return j

def test():
    j = get_rounds("nyc-2021")
    assert j["totalBallots"] == 947932 and len(j["rounds"]) == len(CERT["rounds"]) == 8 and j["winner"] == "Eric L. Adams"
    base = sum(j["rounds"][0]["inactive"].values())  # round-1 overvotes: the BOE recap counts inactive from round 1 on
    for rd, cr in zip(j["rounds"], CERT["rounds"]):
        assert rd["tallies"] == cr["tallies"], (rd["round"], rd["tallies"])
        assert sum(rd["inactive"].values()) - base == cr["inactive"], (rd["round"], rd["inactive"])
        assert sorted(rd["eliminated"]) == sorted(cr["eliminated"]), (rd["round"], rd["eliminated"])
    assert j["rounds"][-1]["tallies"] == {"Eric L. Adams": 404513, "Kathryn A. Garcia": 397316}

test()
