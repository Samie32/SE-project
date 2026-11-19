import { ApiError } from "./client";
import type { JoinToken, SignalMessage, TelehealthSession } from "./types";

export type CallState = "idle" | "connecting" | "connected" | "reconnecting" | "failed" | "closed";
type Connection = "ACTIVE" | "RECONNECTING";
type Kind = SignalMessage["kind"];
type Wire = {v:1; negotiationId:string; description?:RTCSessionDescriptionInit; candidate?:RTCIceCandidateInit; control?:"restart"};
export interface CallTransport {
  ice(signal:AbortSignal):Promise<RTCConfiguration>;
  join(signal:AbortSignal):Promise<JoinToken>;
  session(signal:AbortSignal):Promise<TelehealthSession>;
  poll(after:number, token:string, signal:AbortSignal):Promise<SignalMessage[]>;
  send(kind:Kind, payload:string, token:string, signal:AbortSignal):Promise<unknown>;
  connection(state:Connection, version:number, token:string, signal:AbortSignal):Promise<TelehealthSession>;
}
export interface CallOptions {
  role:"DOCTOR"|"PATIENT";
  session:TelehealthSession;
  transport:CallTransport;
  createPeer?:(configuration:RTCConfiguration) => RTCPeerConnection;
  onRemoteStream?:(stream:MediaStream|null) => void;
  onState?:(state:CallState) => void;
  onError?:(message:string) => void;
  onToken?:(token:JoinToken) => void;
  onSession?:(session:TelehealthSession) => void;
}
const running = (s:TelehealthSession) => s.status === "ACTIVE" || s.status === "RECONNECTING";
const terminal = (s:TelehealthSession) => s.status === "ENDED" || s.status === "CANCELLED";
const RECOVERY_WAIT_MS = 12000;

/** One participant/room. SDP and room credentials stay in memory. Doctor is the sole offerer. */
export class WebRtcCall {
  private session:TelehealthSession;
  private token:JoinToken|null=null;
  private stream:MediaStream|null=null;
  private remote:MediaStream|null=null;
  private pc:RTCPeerConnection|null=null;
  private stopped=false;
  private paused=false;
  private opening:Promise<void>|null=null;
  private renewing:Promise<string>|null=null;
  private polling=false;
  private restarting=false;
  private reporting:Promise<void>=Promise.resolve();
  private sendTail:Promise<unknown>=Promise.resolve();
  private negotiationTail:Promise<void>=Promise.resolve();
  private publication:{id:string; peer:RTCPeerConnection; promise:Promise<void>}|null=null;
  private readyDescription:{kind:"OFFER"|"ANSWER"; value:RTCSessionDescriptionInit; peer:RTCPeerConnection; id:string}|null=null;
  private cursor=0;
  private negotiationId="";
  private remoteNegotiationId="";
  private offerPublishedAt:number|null=null;
  private descriptionSent=false;
  private localIce:RTCIceCandidateInit[]=[];
  private earlyIce=new Map<string,RTCIceCandidateInit[]>();
  private errors=0;
  private restarts=0;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private disconnectTimer:ReturnType<typeof setTimeout>|undefined;
  private recoveryTimer:ReturnType<typeof setTimeout>|undefined;
  private requests=new Set<AbortController>();
  constructor(private readonly options:CallOptions) {this.session=options.session;}

  private state(value:CallState) {if (!this.stopped) this.options.onState?.(value);}
  private alive() {if (this.stopped) throw new DOMException("Call closed","AbortError");}
  private async request<T>(action:(signal:AbortSignal)=>Promise<T>):Promise<T> {
    this.alive();
    const controller=new AbortController();this.requests.add(controller);
    let timeout:ReturnType<typeof setTimeout>;
    const cancelled=new Promise<never>((_,reject) => {
      controller.signal.addEventListener("abort",()=>reject(new ApiError(0,"Kết nối quá hạn hoặc đã đóng.")),{once:true});
      timeout=setTimeout(()=>controller.abort(),8000);
    });
    try {const value=await Promise.race([action(controller.signal),cancelled]);this.alive();return value;}
    finally {clearTimeout(timeout!);this.requests.delete(controller);}
  }
  updateSession(next:TelehealthSession, reactToReconnect=true) {
    if (this.stopped || next.id !== this.session.id || next.version < this.session.version) return;
    const was=this.session.status;this.session=next;
    if (terminal(next)) {this.options.onSession?.(next);this.close();return;}
    if (!this.paused && running(next) && this.token && this.stream) void this.open().catch(e=>this.fault(e));
    if (reactToReconnect && next.status === "RECONNECTING" && was === "ACTIVE" && this.options.role === "DOCTOR" && this.pc && !this.restarting) void this.restart(false);
  }
  async admit(token:JoinToken, stream:MediaStream) {
    if (this.stopped || token.sessionId !== this.session.id) return;
    this.token=token;
    await this.replaceLocalStream(stream);
    if (running(this.session)) await this.open();
  }
  async replaceLocalStream(stream:MediaStream) {
    this.stream=stream;
    if (!this.pc || this.stopped) return;
    for (const transceiver of this.pc.getTransceivers()) {
      transceiver.direction="sendrecv";
      const track=stream.getTracks().find(t=>t.kind === transceiver.receiver.track.kind) ?? null;
      if (transceiver.sender.track !== track) await transceiver.sender.replaceTrack(track);
      this.alive();
    }
  }
  private async freshToken(force=false):Promise<string> {
    this.alive();
    if (!force && this.token && Date.parse(this.token.expiresAt)-Date.now()>60000) return this.token.token;
    if (this.renewing) return this.renewing;
    this.renewing=this.request(signal=>this.options.transport.join(signal)).then(token=>{
      this.alive();
      if (token.sessionId !== this.session.id || Date.parse(token.expiresAt)<=Date.now()) throw Error("Invalid room admission");
      this.token=token;this.options.onToken?.(token);return token.token;
    }).finally(()=>{this.renewing=null;});
    return this.renewing;
  }
  private open():Promise<void> {
    if (this.opening) return this.opening;
    if (this.pc || this.stopped || this.paused || !this.stream || !this.token || !running(this.session)) return Promise.resolve();
    this.opening=this.openPeer().finally(()=>{this.opening=null;});return this.opening;
  }
  private async openPeer() {
    this.paused=false;this.state("connecting");
    const configuration=await this.request(signal=>this.options.transport.ice(signal));
    this.alive();
    const peer=this.options.createPeer?.(configuration) ?? new RTCPeerConnection(configuration);
    this.pc=peer;this.remote=new MediaStream();
    peer.ontrack=event=>{
      if (this.stopped || this.pc !== peer) return;
      if (!this.remote!.getTracks().some(t=>t.id === event.track.id)) this.remote!.addTrack(event.track);
      this.options.onRemoteStream?.(this.remote);
    };
    peer.onicecandidate=event=>{
      if (!event.candidate || this.stopped || this.pc !== peer || !this.negotiationId) return;
      const candidate=event.candidate.toJSON();
      if (!this.descriptionSent) {if (this.localIce.length<128) this.localIce.push(candidate);}
      else void this.send("ICE",{candidate}).catch(e=>this.fault(e));
    };
    const connected=()=>{
      if (this.stopped || this.pc !== peer) return;
      this.confirmConnected();
    };
    peer.onconnectionstatechange=()=>{
      if (this.stopped || this.pc !== peer) return;
      clearTimeout(this.disconnectTimer);
      if (peer.connectionState === "connected") {
        connected();
      } else if (peer.connectionState === "failed") void this.restart(false);
      else if (peer.connectionState === "disconnected") {
        this.state("reconnecting");this.disconnectTimer=setTimeout(()=>void this.restart(false),2000);
      }
    };
    peer.oniceconnectionstatechange=()=>{if (["connected","completed"].includes(peer.iceConnectionState)) connected();};
    // Reserve both m-lines so audio-only users can turn their camera on without a new offer.
    for (const kind of this.options.role === "DOCTOR" ? ["audio","video"] as const : []) {
      const transceiver=peer.addTransceiver(kind,{direction:"sendrecv"});
      const track=this.stream!.getTracks().find(t=>t.kind === kind) ?? null;
      await transceiver.sender.replaceTrack(track);this.alive();
    }
    this.schedule();
    if (this.options.role === "DOCTOR") {
      try {await this.offer(false);} catch (e) {await this.fault(e);}
    }
  }
  private schedule() {
    clearTimeout(this.timer);
    if (this.stopped || this.paused) return;
    this.timer=setTimeout(async()=>{await this.pollOnce();this.schedule();}, Math.min(5000,800*2**Math.min(this.errors,3)));
  }
  private valid(peer:RTCPeerConnection, id:string) {return !this.stopped && this.pc === peer && this.negotiationId === id;}
  private confirmConnected() {
    const peer=this.pc;
    // A seamless ICE restart can keep connectionState connected throughout,
    // so no new connectionstatechange event is guaranteed after the answer.
    if (!peer || this.stopped || !this.descriptionSent || this.remoteNegotiationId !== this.negotiationId || peer.signalingState !== "stable" || peer.connectionState !== "connected" || !["connected","completed"].includes(peer.iceConnectionState)) return;
    clearTimeout(this.recoveryTimer);this.restarts=0;this.state("connected");this.options.onError?.("");
    if (this.session.status === "RECONNECTING") void this.report("ACTIVE").catch(e=>this.fault(e));
  }
  private send(kind:Kind, data:Partial<Wire>, id=this.negotiationId, peer=this.pc):Promise<unknown> {
    const wire:Wire={v:1,negotiationId:id,...data};
    const work=this.sendTail.catch(()=>{}).then(async()=>{
      if (!peer || !this.valid(peer,id)) return;
      const token=await this.freshToken();
      if (!this.valid(peer,id)) return;
      return this.request(signal=>this.options.transport.send(kind,JSON.stringify(wire),token,signal));
    });
    this.sendTail=work;return work;
  }
  private async description(kind:"OFFER"|"ANSWER", value:RTCSessionDescriptionInit) {
    const peer=this.pc!, id=this.negotiationId;this.descriptionSent=false;this.readyDescription=null;
    await peer.setLocalDescription(value);this.alive();
    if (this.valid(peer,id)) {
      const ready={kind,value:{type:value.type,sdp:peer.localDescription?.sdp ?? value.sdp},peer,id};
      this.readyDescription=ready;await this.publishDescription(kind,ready.value,peer,id);
    }
  }
  private publishDescription(kind:"OFFER"|"ANSWER", value:RTCSessionDescriptionInit, peer=this.pc!, id=this.negotiationId):Promise<void> {
    if (this.publication?.id === id && this.publication.peer === peer) return this.publication.promise;
    const entry={id,peer,promise:Promise.resolve()};
    entry.promise=this.publishNow(kind,value,peer,id).finally(()=>{if (this.publication === entry) this.publication=null;});
    this.publication=entry;return entry.promise;
  }
  private async publishNow(kind:"OFFER"|"ANSWER", value:RTCSessionDescriptionInit, peer:RTCPeerConnection, id:string) {
    if (!this.valid(peer,id)) return;
    await this.send(kind,{description:{type:value.type,sdp:value.sdp}},id,peer);this.alive();
    if (!this.valid(peer,id)) return;
    this.descriptionSent=true;
    const pending=this.localIce;this.localIce=[];
    for (const candidate of pending) {if (!this.valid(peer,id)) return;await this.send("ICE",{candidate},id,peer);}
  }
  private offer(restart:boolean):Promise<void> {
    const action=this.negotiationTail.catch(()=>{}).then(()=>this.offerNow(restart));
    this.negotiationTail=action;return action;
  }
  private async offerNow(restart:boolean) {
    if (this.publication) await this.publication.promise.catch(()=>{});
    const peer=this.pc;if (!peer || this.stopped) return;
    this.negotiationId="";this.remoteNegotiationId="";this.offerPublishedAt=null;this.readyDescription=null;this.localIce=[];this.earlyIce.clear();
    if (peer.signalingState !== "stable") await peer.setLocalDescription({type:"rollback"});
    this.alive();const id=crypto.randomUUID();this.negotiationId=id;
    const value=await peer.createOffer({iceRestart:restart});this.alive();
    await this.description("OFFER",value);
    if (this.valid(peer,id)) this.offerPublishedAt=Date.now();
  }
  private async flushIce(id:string) {
    const pending=this.earlyIce.get(id) ?? [];this.earlyIce.clear();
    for (const candidate of pending) {await this.pc!.addIceCandidate(candidate);this.alive();}
  }
  private async handle(message:SignalMessage) {
    const wire=JSON.parse(message.payload) as Wire;
    if (wire.v !== 1 || typeof wire.negotiationId !== "string" || !wire.negotiationId || wire.negotiationId.length>128) return;
    const peer=this.pc;if (!peer) return;
    if (message.kind === "ICE" && wire.control === "restart") {
      if (this.options.role === "DOCTOR") await this.restart(false);
      return;
    }
    if (message.kind === "OFFER") {
      if (this.options.role !== "PATIENT" || wire.description?.type !== "offer") return;
      if (wire.negotiationId === this.negotiationId) {
        const ready=this.readyDescription;
        if (!this.descriptionSent && ready && this.valid(ready.peer,ready.id)) await this.publishDescription(ready.kind,ready.value,ready.peer,ready.id);
        return;
      }
      this.negotiationId=wire.negotiationId;this.localIce=[];this.descriptionSent=false;this.readyDescription=null;
      await peer.setRemoteDescription(wire.description);this.alive();
      // Answerer binds tracks to the transceivers created by the incoming offer.
      // Pre-creating its own transceivers would leave the accepted m-lines recvonly.
      if (this.stream) await this.replaceLocalStream(this.stream);
      this.remoteNegotiationId=wire.negotiationId;await this.flushIce(wire.negotiationId);
      const answer=await peer.createAnswer();this.alive();await this.description("ANSWER",answer);
    } else if (message.kind === "ANSWER") {
      if (this.options.role !== "DOCTOR" || wire.negotiationId !== this.negotiationId || wire.description?.type !== "answer" || peer.signalingState !== "have-local-offer") return;
      await peer.setRemoteDescription(wire.description);this.alive();this.remoteNegotiationId=wire.negotiationId;await this.flushIce(wire.negotiationId);
    } else if (message.kind === "ICE" && wire.candidate) {
      if (wire.negotiationId === this.remoteNegotiationId && peer.remoteDescription) {await peer.addIceCandidate(wire.candidate);this.alive();}
      else if (!this.negotiationId || wire.negotiationId === this.negotiationId) {
        const queue=this.earlyIce.get(wire.negotiationId) ?? [];
        if (queue.length<128 && this.earlyIce.size<4) {queue.push(wire.candidate);this.earlyIce.set(wire.negotiationId,queue);}
      }
    }
  }
  async pollOnce() {
    if (this.stopped || this.paused || this.polling || !this.pc || !running(this.session)) return;
    this.polling=true;
    try {
      const token=await this.freshToken();
      const ready=this.readyDescription;
      if (!this.descriptionSent && ready && this.valid(ready.peer,ready.id)) {
        await this.publishDescription(ready.kind,ready.value,ready.peer,ready.id);
      }
      const rows=await this.request(signal=>this.options.transport.poll(this.cursor,token,signal));
      for (const message of rows) {
        this.alive();
        if (!Number.isSafeInteger(message.id) || message.id<=this.cursor) continue;
        try {await this.handle(message);}
        catch (e) {if (this.stopped) return;if (e instanceof ApiError) throw e;this.options.onError?.("Không xử lý được tín hiệu cuộc gọi. Có thể thử kết nối lại.");}
        this.cursor=message.id;
      }
      this.confirmConnected();
      this.errors=0;
    } catch (error) {await this.fault(error);}
    finally {this.polling=false;}
  }
  private report(state:Connection):Promise<void> {
    const action=this.reporting.catch(()=>{}).then(async()=>{
      if (this.stopped) return;
      for (let attempt=0;attempt<2;attempt++) {
        const current=await this.request(signal=>this.options.transport.session(signal));this.updateSession(current,false);this.options.onSession?.(current);
        if (this.stopped || !running(current) || current.status === state) return;
        const token=await this.freshToken();
        try {
          const result=await this.request(signal=>this.options.transport.connection(state,current.version,token,signal));
          this.updateSession(result);this.options.onSession?.(result);return;
        } catch (e) {if (!(e instanceof ApiError && e.status === 409 && attempt === 0)) throw e;}
      }
    });
    this.reporting=action;return action;
  }
  private scheduleRecovery(delay=RECOVERY_WAIT_MS) {
    clearTimeout(this.recoveryTimer);
    this.recoveryTimer=setTimeout(()=>{
      const peer=this.pc;
      if (peer?.connectionState !== "connected" || peer.signalingState !== "stable") void this.restart(false);
    },delay);
  }
  async restart(manual=true) {
    if (this.stopped || this.restarting || !running(this.session)) return;
    // Session polling and peer signaling can report the same disconnection.
    // Let the peer answer the current offer before starting another negotiation.
    if (!manual && this.options.role === "DOCTOR" && this.pc?.signalingState === "have-local-offer" && this.offerPublishedAt !== null) {
      const remaining=RECOVERY_WAIT_MS-(Date.now()-this.offerPublishedAt);
      if (remaining>0) {this.scheduleRecovery(remaining);return;}
    }
    if (manual) {this.restarts=0;this.errors=0;this.paused=false;}
    if (!manual && ++this.restarts>3) {this.fail("Không thể nối lại cuộc gọi. Kiểm tra mạng rồi bấm thử lại.");return;}
    this.restarting=true;clearTimeout(this.recoveryTimer);this.state("reconnecting");
    try {
      await this.freshToken(manual);await this.report("RECONNECTING");this.alive();
      if (!this.pc) await this.open();
      else {
        const configuration=await this.request(signal=>this.options.transport.ice(signal));
        this.pc.setConfiguration(configuration);
        if (this.options.role === "DOCTOR") await this.offer(true);
      }
      if (this.options.role === "PATIENT") {
        if (!this.negotiationId) this.negotiationId=crypto.randomUUID();
        await this.send("ICE",{control:"restart"});
      }
      this.schedule();
      this.scheduleRecovery();
    } catch (e) {await this.fault(e);}
    finally {this.restarting=false;}
  }
  private fail(message:string) {
    this.paused=true;clearTimeout(this.timer);clearTimeout(this.recoveryTimer);
    this.pc?.close();this.pc=null;this.remote?.getTracks().forEach(t=>t.stop());this.remote=null;this.earlyIce.clear();this.options.onRemoteStream?.(null);
    this.state("failed");this.options.onError?.(message);
  }
  private async fault(error:unknown) {
    if (this.stopped) return;
    this.errors++;this.options.onError?.("Mất kết nối cuộc gọi. Đang thử nối lại; bạn cũng có thể bấm thử lại.");this.state("reconnecting");
    if (error instanceof ApiError && [403,404,409].includes(error.status)) {
      try {
        const current=await this.request(signal=>this.options.transport.session(signal));this.updateSession(current);
        if (!this.stopped && error.status === 403 && this.errors<3) await this.freshToken(true);
      } catch {if (!this.stopped) this.fail("Không xác minh được quyền vào phiên. Hãy tải lại phiên khám.");}
    }
    if (!this.stopped && (this.errors>=3 || error instanceof ApiError && error.status === 401)) this.fail("Kết nối không khả dụng. Kiểm tra mạng và thử lại.");
  }
  getStats() {return this.pc?.getStats() ?? Promise.resolve(new Map() as RTCStatsReport);}
  close() {
    if (this.stopped) return;this.stopped=true;
    clearTimeout(this.timer);clearTimeout(this.disconnectTimer);clearTimeout(this.recoveryTimer);
    for (const controller of this.requests) controller.abort();this.requests.clear();
    const peer=this.pc;this.pc=null;
    if (peer) {peer.ontrack=null;peer.onicecandidate=null;peer.onconnectionstatechange=null;peer.oniceconnectionstatechange=null;peer.close();}
    this.remote?.getTracks().forEach(t=>t.stop());this.remote=null;
    this.token=null;this.localIce=[];this.earlyIce.clear();
    this.options.onRemoteStream?.(null);this.options.onState?.("closed");
  }
}
