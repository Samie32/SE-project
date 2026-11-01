"""Local-only integration smoke: Keycloak -> API -> MySQL -> Mailpit. Does not print tokens."""
import json, urllib.request, urllib.parse, urllib.error, uuid, datetime, time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
env=dict(line.split("=",1) for line in (root/".env").read_text().splitlines() if "=" in line and not line.startswith("#"))
base="http://localhost:8080"
def call(path,method="GET",data=None,token=None,key=None,expected=200,headers=None):
    h=dict(headers or {})
    if token:h["Authorization"]="Bearer "+token
    if key:h["Idempotency-Key"]=key
    payload=None if data is None else json.dumps(data).encode()
    if payload:h["Content-Type"]="application/json"
    request=urllib.request.Request(base+path,data=payload,headers=h,method=method)
    try:
        with urllib.request.urlopen(request,timeout=15) as response:
            status=response.status;body=response.read()
    except urllib.error.HTTPError as e:
        status=e.code;body=e.read()
    assert status==expected,(method,path,status,expected,body[:200])
    return json.loads(body) if body else None
def token(user):
    payload=urllib.parse.urlencode({"grant_type":"password","client_id":"clinic-local-cli","username":user,"password":env["DEMO_PASSWORD"]}).encode()
    req=urllib.request.Request("http://localhost:8180/realms/clinic/protocol/openid-connect/token",data=payload)
    with urllib.request.urlopen(req,timeout=15) as response:return json.load(response)["access_token"]
patient=token("patient");other=token("patient2");admin=token("admin")
call("/actuator/health")
call("/api/me",expected=401)
assert call("/api/me",token=patient)["roles"]==["PATIENT"]
call("/api/me",token=patient[:-20]+"invalidsignature",expected=401)
call("/api/specialties","POST",{"name":"Denied"},patient,expected=403)
call("/api/me","OPTIONS",headers={"Origin":"http://localhost:5173","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"authorization"})
day=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).date()+datetime.timedelta(days=1)
if day.weekday()==6:day+=datetime.timedelta(days=1)
slots=call("/api/slots?date="+day.isoformat(),token=patient)
assert len(slots)>=3,"Need at least three free demo slots"
key=str(uuid.uuid4())
a=call("/api/appointments","POST",{"slotId":slots[0]["id"]},patient,key)
try:
    assert call("/api/appointments","POST",{"slotId":slots[0]["id"]},patient,key)==a
    call("/api/appointments","POST",{"slotId":slots[1]["id"]},patient,key,409)
    call("/api/appointments","POST",{"slotId":slots[0]["id"]},other,str(uuid.uuid4()),409)
    call("/api/appointments/"+a["id"]+"/cancel","POST",{"reason":"Not owner","version":a["version"]},other,str(uuid.uuid4()),404)
    a=call("/api/appointments/"+a["id"]+"/reschedule","POST",{"slotId":slots[1]["id"],"version":a["version"]},patient,str(uuid.uuid4()))
    assert a["version"]==1
finally:
    call("/api/appointments/"+a["id"]+"/cancel","POST",{"reason":"Smoke test cleanup","version":a["version"]},patient,str(uuid.uuid4()))
for _ in range(20):
    jobs=call("/api/notification-jobs",token=admin)
    matching=[j for j in jobs if j["appointmentId"]==a["id"] and j["eventType"]=="CANCELLED"]
    if matching and matching[0]["status"]=="SENT":break
    time.sleep(1)
else:raise AssertionError("Confirmation not sent")
with urllib.request.urlopen("http://localhost:8025/api/v1/messages") as response:
    messages=json.load(response)
    assert messages["total"]>0,"Mailpit received no messages"
spec=call("/v3/api-docs")
out=root/"docs/api/openapi.json";out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(spec,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print("PASS: real OIDC login, JWT rejection, role/ownership checks, CORS, booking, replay, conflict, reschedule, cancellation, Mailpit and OpenAPI export.")
