import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as module from "@/core/webrtc";

class Stream {
  tracks: any[] = [];
  getTracks() {return this.tracks;}
  getAudioTracks() {return this.tracks.filter(t => t.kind === "audio");}
  getVideoTracks() {return this.tracks.filter(t => t.kind === "video");}
  addTrack(track:any) {this.tracks.push(track);}
}
class Peer {
  connectionState="new"; iceConnectionState="new"; signalingState="stable"; remoteDescription:any=null; localDescription:any=null;
  onicecandidate:any; ontrack:any; onconnectionstatechange:any; oniceconnectionstatechange:any;
  transceivers:any[]=[];
  addTransceiver(kind:string) {const t={receiver:{track:{kind}},sender:{track:null,replaceTrack:vi.fn(async (track:any) => {t.sender.track=track;})}};this.transceivers.push(t);return t;}
  getTransceivers() {return this.transceivers;}
  setConfiguration=vi.fn();
  createOffer=vi.fn(async (options:any) => ({type:"offer",sdp:options?.iceRestart ? "restart" : "offer"}));
  createAnswer=vi.fn(async () => ({type:"answer",sdp:"answer"}));
  setLocalDescription=vi.fn(async (description:any) => {
    this.localDescription=description;this.signalingState=description.type === "offer" ? "have-local-offer" : "stable";
    this.onicecandidate?.({candidate:{toJSON:() => ({candidate:"candidate:synthetic",sdpMid:"0",sdpMLineIndex:0})}});
  });
  setRemoteDescription=vi.fn(async (description:any) => {
    this.remoteDescription=description;this.signalingState=description.type === "offer" ? "have-remote-offer" : "stable";
    if (description.type === "offer" && this.transceivers.length === 0) {this.addTransceiver("audio");this.addTransceiver("video");}
  });
  addIceCandidate=vi.fn(async () => {if (!this.remoteDescription) throw Error("remoteDescription required");});
  close=vi.fn(() => {this.connectionState="closed";});
}
const active={id:"room",appointmentId:"appt",version:2,status:"ACTIVE"};
let peers:Peer[], messages:any[], sent:any[], transport:any, local:Stream;
const envelope=(id:string,extra:any) => JSON.stringify({v:1,negotiationId:id,...extra});
beforeEach(() => {
  vi.useFakeTimers();vi.setSystemTime(new Date("2030-01-08T02:00:00Z"));
  peers=[];messages=[];sent=[];local=new Stream();local.addTrack({kind:"audio",enabled:true});local.addTrack({kind:"video",enabled:true});
  vi.stubGlobal("MediaStream",Stream);
  transport={
    ice:vi.fn(async () => ({iceServers:[]})),
    join:vi.fn(async () => ({sessionId:"room",token:"renewed",expiresAt:new Date(Date.now()+300000).toISOString()})),
    poll:vi.fn(async () => messages),
    send:vi.fn(async (kind:string,payload:string,token:string) => {sent.push({kind,...JSON.parse(payload),token});}),
    session:vi.fn(async () => ({...active})),
    connection:vi.fn(async (state:string,version:number) => ({...active,status:state,version:version+1})),
  };
});
afterEach(() => {vi.useRealTimers();vi.unstubAllGlobals();});
function create(role="DOCTOR", callbacks:any={}) {
  const Type=(module as any).WebRtcCall;
  expect(Type).toBeTypeOf("function");
  return new Type({role,session:active,transport,createPeer:() => {const p=new Peer();peers.push(p);return p;},...callbacks});
}
const token=() => ({sessionId:"room",token:"initial",expiresAt:new Date(Date.now()+300000).toISOString()});
const drain=async () => {for(let i=0;i<20;i++) await Promise.resolve();};

describe("WebRTC protocol", () => {
  it("poll không gửi SDP cũ khi setLocalDescription của restart còn pending", async () => {
    const call=create();await call.admit(token(),local);await drain();
    let finish:any;
    peers[0].setLocalDescription.mockImplementationOnce((value:any)=>new Promise<void>(resolve=>{
      finish=()=>{peers[0].localDescription=value;peers[0].signalingState="have-local-offer";resolve();};
    }));
    // Avoid rollback so the deferred operation is the new offer application.
    peers[0].signalingState="stable";
    const restart=call.restart();await drain();await drain();
    expect(finish).toBeTypeOf("function");await call.pollOnce();
    expect(sent.filter(x=>x.kind === "OFFER")).toHaveLength(1);
    finish();await restart;await drain();
    const offers=sent.filter(x=>x.kind === "OFFER");expect(offers).toHaveLength(2);
    expect(offers[1].description.sdp).toBe("restart");call.close();
  });
  it("ICE restart liên tục vẫn xác nhận kết nối khi browser không phát event connected mới", async () => {
    const state=vi.fn();const call=create("DOCTOR",{onState:state});await call.admit(token(),local);
    peers[0].connectionState="connected";peers[0].iceConnectionState="connected";
    await call.restart();
    const id=sent.filter(x=>x.kind === "OFFER").at(-1).negotiationId;
    messages=[{id:1,kind:"ANSWER",payload:envelope(id,{description:{type:"answer",sdp:"restart-answer"}})}];
    await call.pollOnce();expect(state).toHaveBeenLastCalledWith("connected");call.close();
  });
  it("bác sĩ gửi OFFER trước ICE, bệnh nhân không tạo OFFER", async () => {
    const doctor=create();await doctor.admit(token(),local);await drain();
    expect(sent[0].kind).toBe("OFFER");expect(sent[1].kind).toBe("ICE");
    expect(sent[0].negotiationId).toBe(sent[1].negotiationId);doctor.close();
    sent=[];const patient=create("PATIENT");await patient.admit(token(),local);await drain();
    expect(sent).toEqual([]);patient.close();
  });
  it("đệm ICE trước OFFER, không xử lý lại message/cursor đã nhận", async () => {
    const call=create("PATIENT");await call.admit(token(),local);
    messages=[{id:1,kind:"ICE",payload:envelope("n",{candidate:{candidate:"x"}})},{id:2,kind:"OFFER",payload:envelope("n",{description:{type:"offer",sdp:"sdp"}})}];
    await call.pollOnce();await call.pollOnce();
    expect(peers[0].addIceCandidate).toHaveBeenCalledTimes(1);
    expect(sent.filter(x=>x.kind === "ANSWER")).toHaveLength(1);
    expect(transport.poll.mock.calls.at(-1)[0]).toBe(2);call.close();
  });
  it("renew token trước hết hạn, mọi signaling sau đó dùng token mới", async () => {
    const call=create("PATIENT");await call.admit(token(),local);
    vi.setSystemTime(new Date(Date.now()+250000));
    await call.pollOnce();
    expect(transport.join).toHaveBeenCalledTimes(1);
    expect(transport.poll.mock.calls.at(-1)[1]).toBe("renewed");call.close();
  });
  it("bỏ ANSWER của negotiation cũ sau restart ICE", async () => {
    const call=create();await call.admit(token(),local);await drain();
    const old=sent[0].negotiationId;
    await call.restart();await drain();
    const latest=sent.filter(x=>x.kind === "OFFER").at(-1);
    expect(latest.negotiationId).not.toBe(old);
    messages=[{id:1,kind:"ANSWER",payload:envelope(old,{description:{type:"answer",sdp:"old"}})}];
    await call.pollOnce();expect(peers[0].setRemoteDescription).not.toHaveBeenCalled();call.close();
  });
  it("ENDED đóng peer và không nhận tín hiệu đến trễ hoặc poll tiếp", async () => {
    const call=create("PATIENT");await call.admit(token(),local);
    let finish:any;transport.poll.mockImplementationOnce(() => new Promise(resolve=>{finish=resolve;}));
    const pending=call.pollOnce();await drain();
    call.updateSession({...active,status:"ENDED",version:3});
    finish([{id:1,kind:"OFFER",payload:envelope("late",{description:{type:"offer",sdp:"late"}})}]);
    await pending;await vi.advanceTimersByTimeAsync(5000);
    expect(peers[0].close).toHaveBeenCalledTimes(1);
    expect(peers[0].setRemoteDescription).not.toHaveBeenCalled();
  });
  it("mất signaling được báo trong tối đa 8 giây, không treo vô hạn", async () => {
    const error=vi.fn();const call=create("PATIENT",{onError:error});await call.admit(token(),local);
    transport.poll.mockImplementation(() => new Promise(()=>{}));
    const pending=call.pollOnce();await vi.advanceTimersByTimeAsync(8001);await pending;
    expect(error).toHaveBeenCalled();call.close();
  });
  it("ICE của lần restart phải chờ ANSWER mới dù remoteDescription cũ còn tồn tại", async () => {
    const call=create();await call.admit(token(),local);await drain();
    const old=sent[0].negotiationId;
    messages=[{id:1,kind:"ANSWER",payload:envelope(old,{description:{type:"answer",sdp:"first"}})}];await call.pollOnce();
    await call.restart();const id=sent.filter(x=>x.kind === "OFFER").at(-1).negotiationId;
    messages=[{id:2,kind:"ICE",payload:envelope(id,{candidate:{candidate:"new-generation"}})},{id:3,kind:"ANSWER",payload:envelope(id,{description:{type:"answer",sdp:"new"}})}];
    await call.pollOnce();
    expect(peers[0].setRemoteDescription.mock.invocationCallOrder.at(-1)).toBeLessThan(peers[0].addIceCandidate.mock.invocationCallOrder.at(-1)!);call.close();
  });
  it("poll trạng thái không tự mở lại peer đã thất bại sau giới hạn retry", async () => {
    const call=create("PATIENT");await call.admit(token(),local);
    transport.poll.mockRejectedValue(new Error("offline"));
    await call.pollOnce();await call.pollOnce();await call.pollOnce();
    call.updateSession({...active,version:3});await drain();
    expect(peers).toHaveLength(1);call.close();
  });
  it("bệnh nhân yêu cầu offer mới dù session đã ở RECONNECTING", async () => {
    const call=create("PATIENT");await call.admit(token(),local);
    call.updateSession({...active,status:"RECONNECTING",version:3});
    transport.session.mockResolvedValue({...active,status:"RECONNECTING",version:3});
    await call.restart();await drain();
    expect(sent.some(x=>x.kind === "ICE" && x.control === "restart")).toBe(true);call.close();
  });
  it("restart chờ SDP cũ gửi xong, không cho publication đến trễ sửa ICE thế hệ mới", async () => {
    let finish:any;
    transport.send.mockImplementationOnce((_kind:string,payload:string,token:string)=>{
      sent.push({kind:"OFFER",...JSON.parse(payload),token});return new Promise(resolve=>{finish=resolve;});
    });
    const call=create();const initial=call.admit(token(),local);await drain();await drain();
    expect(finish).toBeTypeOf("function");
    const restarting=call.restart();await drain();
    expect(peers[0].createOffer).toHaveBeenCalledTimes(1);
    finish({accepted:true});await initial;await restarting;await drain();
    const offers=sent.filter(x=>x.kind === "OFFER");expect(offers).toHaveLength(2);
    const newId=offers[1].negotiationId;
    const descriptionIndex=sent.findIndex(x=>x.kind === "OFFER" && x.negotiationId === newId);
    const candidateIndex=sent.findIndex(x=>x.kind === "ICE" && x.negotiationId === newId);
    expect(candidateIndex).toBeGreaterThan(descriptionIndex);call.close();
  });
});
