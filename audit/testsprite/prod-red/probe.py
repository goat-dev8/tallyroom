import json, sys, requests, unicodedata
B=sys.argv[1]
def P(body=None, raw=None, ct="application/json"):
    r=requests.post(B+"/api/tabulate", data=raw if raw is not None else json.dumps(body), headers={"Content-Type":ct}, timeout=120)
    try: j=r.json()
    except Exception: j=r.text[:200]
    return r.status_code, j
def s(st,j,keys):
    if isinstance(j,dict) and "error" in j: return (st, j["error"]["code"], j["error"]["message"][:90])
    return (st,)+tuple(j.get(k) for k in keys)
nfd=unicodedata.normalize("NFD","Zoë")
probes={
"009": lambda: s(*P(raw="# note, with comma\n3,A>B\n2,B>A\n", ct="text/csv"),["candidates","winner"]),
"010": lambda: s(*P(raw=json.dumps({"ballots":"1,"+"é"*2_150_000+"\n2,B"})),["winner"]),
"011": lambda: s(*P(raw=json.dumps({"ballots":"3,A>B\n2,B"}), ct="text/csv"),["candidates","winner"]),
"012": lambda: s(*P({"ballots":"3,[A=B]\n2,B\n2,C","rules":{"overvote":"continuing"}}),["winner","rounds"]),
"013": lambda: s(*P({"ballots":"3,A\n2,B","candidates":["A","A","B"],"seats":3}),["winners","quota"]),
"014": lambda: s(*P({"ballots":"8,A>C\n5,B\n3,C","seats":2}),["winners"]),
"015": lambda: s(*P({"ballots":"3,A>_>A>_>B\n4,B\n5,C","rules":{"duplicates":"ignore","skips":"two-exhaust"},"candidates":["A","B","C"]}),["winner"]),
"016": lambda: s(*P(raw="1,B\r5,A\r", ct="text/csv"),["candidates","winner"]),
"018": lambda: s(*P({"ballots":"3,Zoë\n3,Bo","rules":{"tiebreak":"lot","lotOrder":[nfd,"Bo"]}}),["winner"]),
"019": lambda: s(*P({"seats":2,"ballots":"3,_>_>A\n2,B\n2,C","rules":{"skips":"two-exhaust"}}),["winners","rounds"]),
"021": lambda: s(*P({"ballots":"1,[A=Zed]\n2,A\n1,B","candidates":["A","B"],"rules":{"overvote":"continuing"}}),["winner"]),
"024": lambda: s(*P({"ballots":"3,A\n2,B\n2,C","seat":2}),["method","winner"]),
"028": lambda: s(*P({"ballots":"10,A>C\n6,B\n5,C\n9,_","seats":2,"candidates":["A","B","C"]}),["quotaExact","winners"]),
"029": lambda: s(*P({"ballots":"91,A>C\n55,B>C>D\n10,C\n40,D\n44,F","seats":4,"candidates":["A","B","C","D","F"]}),["winners"]),
"030": lambda: s(*P(raw='5,"Ada>Bo"\n4,"Bo>Ada"\n2,"Cy>Bo"\n', ct="text/csv"),["candidates","winner"]),
}
for k,f in probes.items():
    try: print(k, json.dumps(f(), ensure_ascii=False)[:260])
    except Exception as e: print(k, "EXC", e)
