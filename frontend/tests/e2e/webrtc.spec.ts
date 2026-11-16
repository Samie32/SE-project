import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const ROOM="00000000-0000-4000-8000-000000000005";
const APPT="00000000-0000-4000-8000-000000000001";
class SignalingFixture {
  session={id:ROOM,appointmentId:APPT,status:"CREATED",version:0};
  tokens=new Map<string,string>(); joins={PATIENT:0,DOCTOR:0};
  messages:{id:number;owner:string;kind:string;payload:string;createdAt:string}[]=[];
  requests=0;
  async install(context:BrowserContext) {
    await context.route("**/webrtc-config.json",r=>r.fulfill({json:{iceServers:[],iceTransportPolicy:"all"}}));
    await context.route("**/api/**",async route=>{
      const req=route.request(), url=new URL(req.url()), path=url.pathname;
      if (!path.startsWith("/api/")) return route.fallback();
      this.requests++;
      const role=req.headers().authorization?.endsWith("DOCTOR") ? "DOCTOR" : "PATIENT";
      const body=req.postDataJSON() ?? {};
      const reply=(status:number,json?:unknown)=>route.fulfill({status,...(json === undefined ? {body:""} : {json})});
      if (path === `/api/appointments/${APPT}/telehealth-session`) return reply(200,{...this.session});
      if (path === `/api/telehealth-sessions/${ROOM}` && req.method() === "GET") return reply(200,{...this.session});
      if (path.endsWith("/join")) {
        if (["ENDED","CANCELLED"].includes(this.session.status)) return reply(409,{});
        if (role === "PATIENT" && body.consent !== true) return reply(422,{});
        if (role === "PATIENT" && this.session.status === "CREATED") {this.session.status="WAITING";this.session.version++;}
        const number=++this.joins[role];const token=`synthetic-${role}-${number}`;this.tokens.set(role,token);
        // One near-expiry admission proves refresh without waiting five wall-clock minutes.
        const duration=role === "PATIENT" && number === 1 ? 40000 : 300000;
        return reply(200,{sessionId:ROOM,token,expiresAt:new Date(Date.now()+duration).toISOString(),signalingUrl:`/api/telehealth-sessions/${ROOM}/signals`});
      }
      if (path.endsWith("/start") || path.endsWith("/end")) {
        if (role !== "DOCTOR" || body.version !== this.session.version) return reply(409,{});
        this.session.status=path.endsWith("/start") ? "ACTIVE" : "ENDED";this.session.version++;
        if (this.session.status === "ENDED") this.tokens.clear();
        return reply(200,{...this.session});
      }
      if (req.headers()["x-room-token"] !== this.tokens.get(role)) return reply(403,{});
      if (!["ACTIVE","RECONNECTING"].includes(this.session.status)) return reply(409,{});
      if (path.endsWith("/connection")) {
        if (body.version !== this.session.version) return reply(409,{});
        this.session.status=body.state;this.session.version++;return reply(200,{...this.session});
      }
      if (path.endsWith("/signals")) {
        if (req.method() === "GET") return reply(200,this.messages.filter(m=>m.owner !== role && m.id>Number(url.searchParams.get("after") ?? 0)).slice(0,100).map(({owner:_,...m})=>m));
        this.messages.push({id:this.messages.length+1,owner:role,kind:body.kind,payload:body.payload,createdAt:new Date().toISOString()});return reply(200,{accepted:true});
      }
      return reply(404,{});
    });
    await context.addInitScript(()=>{
      const Native=window.RTCPeerConnection;
      (window as any).__rtcPeers=[];
      (window as any).RTCPeerConnection=class extends Native {
        constructor(configuration?:RTCConfiguration) {super(configuration);(window as any).__rtcPeers.push(this);}
      };
    });
  }
}
async function received(page:Page, kind:"audio"|"video") {
  return page.evaluate(async kind=>{
    let bytes=0;
    for (const peer of (window as any).__rtcPeers as RTCPeerConnection[]) {
      const report=await peer.getStats();
      report.forEach(row=>{if (row.type === "inbound-rtp" && row.kind === kind) bytes+=row.bytesReceived ?? 0;});
    }
    return bytes;
  },kind);
}
async function openPair(browser:any, mode:"video"|"audio"="video") {
  const service=new SignalingFixture();
  const doctorContext=await browser.newContext({baseURL:"http://127.0.0.1:5174",permissions:["camera","microphone"]});
  const patientContext=await browser.newContext({baseURL:"http://127.0.0.1:5174",permissions:["camera","microphone"]});
  await service.install(doctorContext);await service.install(patientContext);
  const doctor=await doctorContext.newPage(),patient=await patientContext.newPage();
  const errors:string[]=[];
  for (const page of [doctor,patient]) page.on("pageerror",error=>errors.push(error.message));
  if (mode === "audio") await patientContext.addInitScript(()=>{
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=constraints=>constraints?.video ? Promise.reject(new DOMException("Camera denied for fallback test","NotAllowedError")) : original(constraints);
  });
  await Promise.all([doctor.goto("/tests/e2e/call.html?role=DOCTOR"),patient.goto("/tests/e2e/call.html?role=PATIENT")]);
  await patient.getByLabel("Tôi đồng ý tham gia buổi khám từ xa này.").check();
  await patient.getByRole("button",{name:"Tham gia phòng chờ"}).click();
  await expect(patient.getByRole("button",{name:"Đã tham gia phòng"})).toBeVisible({timeout:30000});
  await expect(doctor.getByRole("button",{name:"Bắt đầu phiên khám"})).toBeEnabled();
  await doctor.getByRole("button",{name:"Bắt đầu phiên khám"}).click();
  for (const page of [doctor,patient]) {
    try {await expect.poll(()=>received(page,"audio"),{timeout:30000}).toBeGreaterThan(0);}
    catch (error) {
      for (const endpoint of [doctor,patient]) console.log("RTC diagnostic",await endpoint.evaluate(()=>({text:document.body.innerText,peers:(window as any).__rtcPeers.map((p:RTCPeerConnection)=>({connection:p.connectionState,ice:p.iceConnectionState,signaling:p.signalingState,local:p.localDescription?.type,remote:p.remoteDescription?.type}))})));
      console.log("signaling summary",service.session,service.joins,service.messages.map(m=>({id:m.id,kind:m.kind,owner:m.owner})));
      throw error;
    }
    await expect(page.getByTestId("call-state")).toHaveText("Đã kết nối");
  }
  return {service,doctor,patient,doctorContext,patientContext,errors};
}

test("video/audio hai phía, mute, ICE restart, token refresh và kết thúc đóng hai peer",async({browser})=>{
  const pair=await openPair(browser);
  const {doctor,patient,service}=pair;
  try {
    for (const page of [doctor,patient]) {
      try {await expect.poll(()=>received(page,"video")).toBeGreaterThan(0);}
      catch(error) {
        for (const endpoint of [doctor,patient]) console.log("Video diagnostic",await endpoint.evaluate(async()=>{
          const peers=[];
          for (const p of (window as any).__rtcPeers as RTCPeerConnection[]) {
            const rows:any[]=[];(await p.getStats()).forEach(s=>{if (["inbound-rtp","outbound-rtp","media-source"].includes(s.type)) rows.push({type:s.type,kind:s.kind,bytesSent:s.bytesSent,bytesReceived:s.bytesReceived,framesEncoded:s.framesEncoded,framesDecoded:s.framesDecoded,frames:s.frames});});
            peers.push({tracks:p.getSenders().map(s=>({kind:s.track?.kind,enabled:s.track?.enabled,state:s.track?.readyState})),rows});
          }return peers;
        }));throw error;
      }
      await expect.poll(()=>page.getByTestId("remote-video").evaluate((v:HTMLVideoElement)=>v.videoWidth)).toBeGreaterThan(0);
    }
    expect(service.joins.PATIENT).toBeGreaterThanOrEqual(2);
    await patient.getByRole("button",{name:"Tắt micro",exact:true}).click();
    await expect.poll(()=>patient.evaluate(()=>(window as any).__rtcPeers.at(-1).getSenders().find((s:RTCRtpSender)=>s.track?.kind === "audio").track.enabled)).toBe(false);
    await patient.getByRole("button",{name:"Tắt camera",exact:true}).click();
    await expect.poll(()=>patient.evaluate(()=>(window as any).__rtcPeers.at(-1).getSenders().find((s:RTCRtpSender)=>s.track?.kind === "video").track.enabled)).toBe(false);
    await patient.getByRole("button",{name:"Bật micro",exact:true}).click();
    const before=await received(doctor,"audio");
    await expect.poll(()=>received(doctor,"audio")).toBeGreaterThan(before);
    await patient.getByRole("button",{name:"Bật camera",exact:true}).click();
    const offers=service.messages.filter(m=>m.kind === "OFFER").length;
    await doctor.getByRole("button",{name:"Kết nối lại",exact:true}).click();
    await expect.poll(()=>service.messages.filter(m=>m.kind === "OFFER").length).toBeGreaterThan(offers);
    await expect(doctor.getByTestId("call-state")).toHaveText("Đã kết nối");
    await expect(patient.getByTestId("call-state")).toHaveText("Đã kết nối");
    await doctor.getByRole("button",{name:"Kết thúc phiên",exact:true}).click();
    await doctor.getByRole("dialog").getByRole("button",{name:"Kết thúc phiên",exact:true}).click();
    for (const page of [doctor,patient]) {
      await expect(page.getByText(/Phiên đã kết thúc/)).toBeVisible();
      await expect.poll(()=>page.evaluate(()=>(window as any).__rtcPeers.every((p:RTCPeerConnection)=>p.connectionState === "closed"))).toBe(true);
      await expect.poll(()=>page.getByTestId("local-video").evaluate((v:HTMLVideoElement)=>v.srcObject === null)).toBe(true);
    }
    const count=service.messages.length;await doctor.waitForTimeout(1800);expect(service.messages).toHaveLength(count);
    expect(pair.errors).toEqual([]);
  } finally {await pair.doctorContext.close();await pair.patientContext.close();}
});

test("camera bị từ chối vẫn gọi audio thật, rời rồi tham gia lại trong cùng phiên",async({browser})=>{
  const pair=await openPair(browser,"audio");
  try {
    const {patient,doctor}=pair;
    await expect(patient.getByText(/Đã chuyển sang cuộc gọi chỉ âm thanh/)).toBeVisible();
    await expect.poll(()=>patient.getByTestId("local-video").evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).getVideoTracks().length)).toBe(0);
    await patient.getByRole("button",{name:"Rời cuộc gọi",exact:true}).click();
    await expect(patient.getByRole("button",{name:"Tham gia phòng chờ"})).toBeEnabled();
    await patient.getByRole("button",{name:"Tham gia phòng chờ"}).click();
    // The new patient peer asks for RECONNECTING; the doctor creates a fresh offer.
    await patient.getByRole("button",{name:"Kết nối lại",exact:true}).click();
    await expect(patient.getByTestId("call-state")).toHaveText("Đã kết nối",{timeout:30000});
    const before=await received(doctor,"audio");await expect.poll(()=>received(doctor,"audio")).toBeGreaterThan(before);
    expect(pair.errors).toEqual([]);
  } finally {await pair.doctorContext.close();await pair.patientContext.close();}
});
