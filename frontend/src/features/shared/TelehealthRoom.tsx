import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LogIn, Mic, MicOff, PhoneOff, PlayCircle, Video } from "lucide-react";
import { endSession, getSession, joinSession, prepareSession, startSession } from "@/api/operations";
import { WebRtcCall, type CallState } from "@/core/webrtc";
import { createCallTransport } from "@/core/rtc-transport";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { ApiError, errorMessage } from "@/core/client";
import { MIN, formatTime, inJoinWindow } from "@/core/datetime";
import { SESSION_STATUS } from "@/core/labels";
import { useNow } from "@/core/useAsync";
import type { Appointment, JoinToken, TelehealthSession } from "@/core/types";
import { ConfirmDialog, Notice, PendingBackend, Pill, useToast } from "@/ui";

interface Props {
  role: "DOCTOR" | "PATIENT";
  appointment: Appointment;
  counterpartName: string;
  onSessionChange?: (s: TelehealthSession | null) => void;
}

/**
 * Phòng khám từ xa dùng chung. Vòng đời phiên chạy qua API (prepare → join → start → end).
 * Camera/micro truyền hai phía qua WebRTC; signaling/token vẫn do backend cấp.
 */
export function TelehealthRoom({ role, appointment, counterpartName, onSessionChange }: Props) {
  const toast = useToast();
  const command = useCommand();
  const now = useNow(1000).getTime();
  const enabled = config.backend.telehealth;
  const [session, setSession] = useState<TelehealthSession | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callError, setCallError] = useState("");
  const [deviceNote, setDeviceNote] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [playRequired, setPlayRequired] = useState(false);
  const [callGeneration, setCallGeneration] = useState(0);
  const call = useRef<WebRtcCall | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [token, setToken] = useState<JoinToken | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);
  const [media, setMedia] = useState<"idle" | "busy" | "ok" | "denied">("idle");
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<TelehealthSession | null>(null);
  const changeRef = useRef(onSessionChange);
  changeRef.current = onSessionChange;
  const mounted = useRef(false);
  const fetching = useRef(false);
  const setS = useCallback((s: TelehealthSession | null) => {
    if (!mounted.current) return;
    const current = sessionRef.current;
    if (s && current && (s.version < current.version || (["ENDED","CANCELLED"].includes(current.status) && s.status !== current.status))) return;
    const changed = sessionRef.current?.status !== s?.status || sessionRef.current?.version !== s?.version;
    sessionRef.current = s;
    setSession(s);
    if (changed) changeRef.current?.(s);
  }, []);
  const admissionOpen = inJoinWindow(appointment.startAt, now) || appointment.status === "IN_PROGRESS";

  const refresh = useCallback(async () => {
    if (!enabled || fetching.current || (!sessionRef.current && !admissionOpen)) return;
    fetching.current = true;
    try {
      const existing = sessionRef.current;
      const result = existing ? await getSession(existing.id) : await command(`prepare:${appointment.id}`, appointment.id, key => prepareSession(appointment.id, key));
      if (mounted.current) { setS(result); setError(""); }
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { fetching.current = false; }
  }, [appointment.id, enabled, admissionOpen, command, setS]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (!["ENDED","CANCELLED"].includes(sessionRef.current?.status ?? "")) void refresh();
    }, 5000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, [refresh]);
  useEffect(() => () => stream.current?.getTracks().forEach(t => t.stop()), []);
  useEffect(() => {
    if (["ENDED","CANCELLED"].includes(session?.status ?? "")) {
      setToken(null);
      stream.current?.getTracks().forEach(t => t.stop());
      stream.current = null;
      setMedia("idle"); setLocalStream(null);setDeviceNote("");
    }
  }, [session?.status]);
  useEffect(() => {
    if (!session?.id) return;
    let active = true;
    const engine = new WebRtcCall({role, session, transport:createCallTransport(session.id, role === "PATIENT"),
      onRemoteStream: value => {if (active && mounted.current) setRemoteStream(value);},
      onState: value => {if (active && mounted.current) setCallState(value);},
      onError: value => {if (active && mounted.current) setCallError(value);},
      onToken: value => {if (active && mounted.current) setToken(value);},
      onSession: value => {if (active && mounted.current) setS(value);},
    });
    call.current = engine;
    return () => {active=false;call.current=null;engine.close();};
    // Same room keeps its peer across token refresh and status/version changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, role, callGeneration]);
  useEffect(() => {
    if (session) call.current?.updateSession(session);
    if (token && localStream) void call.current?.admit(token, localStream).catch(() => {
      if (mounted.current) setCallError("Không khởi tạo được cuộc gọi. Kiểm tra cấu hình kết nối và thử lại.");
    });
  }, [session, token, localStream, callGeneration]);
  useEffect(() => {
    if (video.current) {
      video.current.srcObject=localStream;
      if (localStream) void video.current.play()?.catch(()=>{});
    }
  }, [localStream]);
  useEffect(() => {
    const element=remoteVideo.current;
    if (!element) return;
    element.srcObject=remoteStream;setPlayRequired(false);
    if (remoteStream) void element.play().catch(() => {if (mounted.current && element.srcObject === remoteStream) setPlayRequired(true);});
  }, [remoteStream]);
  useEffect(() => {
    const online=()=>{if (call.current && ["ACTIVE","RECONNECTING"].includes(sessionRef.current?.status ?? "")) void call.current.restart();};
    const offline=()=>{setCallError("Thiết bị đang mất mạng. Cuộc gọi sẽ thử nối lại khi có mạng.");setCallState("reconnecting");};
    window.addEventListener("online",online);window.addEventListener("offline",offline);
    return () => {window.removeEventListener("online",online);window.removeEventListener("offline",offline);};
  }, []);

  const startMedia = async (wantVideo=cam):Promise<MediaStream> => {
    if (stream.current?.getAudioTracks().some(t=>t.readyState === "live")) return stream.current;
    setMedia("busy");setCallError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("unsupported");
      let m:MediaStream;
      try {m=await navigator.mediaDevices.getUserMedia({video:wantVideo,audio:true});}
      catch (error) {
        if (!wantVideo) throw error;
        m=await navigator.mediaDevices.getUserMedia({video:false,audio:true});
        setCam(false);setDeviceNote("Không mở được camera. Đã chuyển sang cuộc gọi chỉ âm thanh.");
      }
      if (!mounted.current || ["ENDED","CANCELLED"].includes(sessionRef.current?.status ?? "")) {m.getTracks().forEach(t=>t.stop());throw Error("closed");}
      stream.current?.getTracks().filter(t=>!m.getTracks().includes(t)).forEach(t=>t.stop());
      stream.current=m;
      m.getVideoTracks().forEach(t=>{t.enabled=wantVideo;});
      m.getAudioTracks().forEach(t=>{t.enabled=mic;});
      setLocalStream(m);setMedia("ok");return m;
    } catch {
      setMedia("denied");throw Error("Không mở được micro. Hãy cấp quyền thiết bị rồi thử lại.");
    }
  };
  const toggleCam = async () => {
    if (!stream.current) {setCam(!cam);return;}
    const tracks=stream.current.getVideoTracks();
    if (tracks.length) {tracks.forEach(t=>{t.enabled=!cam;});setCam(!cam);return;}
    try {
      const camera=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      if (!mounted.current || ["ENDED","CANCELLED"].includes(sessionRef.current?.status ?? "")) {camera.getTracks().forEach(t=>t.stop());return;}
      camera.getVideoTracks().forEach(t=>stream.current!.addTrack(t));
      await call.current?.replaceLocalStream(stream.current);
      setCam(true);setCallError("");setDeviceNote("");
    } catch {setCallError("Không mở được camera. Bạn vẫn có thể tiếp tục bằng âm thanh.");}
  };
  const toggleMic = () => { const n = !mic; setMic(n); stream.current?.getAudioTracks().forEach((t) => (t.enabled = n)); };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(errorMessage(e)); if (e instanceof ApiError && e.status === 409) void refresh(); } finally { setBusy(false); }
  };
  const join = () => run(async () => {
    if (!session) return;
    await startMedia();
    setToken(await joinSession(session.id, role === "PATIENT"));
    await refresh();
    toast.success("Đã vào phòng chờ.");
  });
  const start = () => run(async () => {
    if (!session) return;
    await startMedia();
    setS(await command(`start:${session.id}`, {version:session.version}, key => startSession(session.id, session.version, key)));
    setToken(await joinSession(session.id, role === "PATIENT"));
    toast.success("Đã bắt đầu phiên khám từ xa.");
  });
  const end = () => run(async () => {
    if (!session) return;
    setS(await command(`end:${session.id}`, {version:session.version}, key => endSession(session.id, session.version, key)));
    setToken(null); setConfirmEnd(false);
    toast.success("Đã kết thúc phiên. Hãy hoàn tất hồ sơ bệnh án và lần khám.");
  });

  const leave = () => {
    call.current?.close();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    setToken(null);setLocalStream(null);setRemoteStream(null);setMedia("idle");setCallGeneration(n=>n+1);
  };
  const stateLabel:Record<CallState,string>={idle:"Chưa tham gia",connecting:"Đang kết nối cuộc gọi",connected:"Đã kết nối",reconnecting:"Đang nối lại",failed:"Chưa kết nối được",closed:"Đã rời cuộc gọi"};
  const st = session?.status;
  const sInfo = st ? SESSION_STATUS[st] : undefined;
  const startMs = Date.parse(appointment.startAt);
  const patientWindow = inJoinWindow(appointment.startAt, now);
  const doctorWindow = now >= startMs && now < startMs + 15 * MIN;
  const live = st === "ACTIVE" || st === "RECONNECTING";
  const closed = st === "ENDED" || st === "CANCELLED";
  const canPatientJoin = role === "PATIENT" && !closed && (((st === "CREATED" || st === "WAITING") && patientWindow && consent) || (live && consent));
  const canDoctorStart = role === "DOCTOR" && st === "WAITING" && doctorWindow;
  const canDoctorEnter = role === "DOCTOR" && live && !token;

  let hint = "";
  if (role === "PATIENT" && st === "CREATED" && !patientWindow) hint = `Phòng chờ mở từ ${formatTime(new Date(startMs - 10 * MIN).toISOString())} đến ${formatTime(new Date(startMs + 15 * MIN).toISOString())}.`;
  if (role === "PATIENT" && st === "WAITING") hint = "Bạn đã vào phòng chờ. Vui lòng chờ bác sĩ bắt đầu phiên khám.";
  if (role === "DOCTOR" && st === "CREATED") hint = "Chờ bệnh nhân vào phòng chờ (từ 10 phút trước giờ hẹn).";
  if (role === "DOCTOR" && st === "WAITING" && !doctorWindow) hint = `Chỉ bắt đầu trong khoảng ${formatTime(appointment.startAt)}–${formatTime(new Date(startMs + 15 * MIN).toISOString())}.`;

  return (
    <div>
      <PendingBackend feature="telehealth" />
      {error && <Notice tone="error">{error}</Notice>}
      {callError && <Notice tone="warn">{callError}</Notice>}
      {deviceNote && <Notice tone="info">{deviceNote}</Notice>}
      <div className="video-layout">
        <div>
          <div className="stage">
            <div className="tiles">
              <div className="tile">
                <video ref={remoteVideo} autoPlay playsInline aria-label="Hình ảnh người tham gia" data-testid="remote-video" />
                {!remoteStream && <div><Video size={30} aria-hidden/><p>{counterpartName}</p><small>{stateLabel[callState]}</small></div>}
                <span className="tag">{counterpartName}</span>
              </div>
              <div className={"tile" + (media === "ok" && cam ? "" : " hidden-video")}>
                <video ref={video} data-testid="local-video" autoPlay muted playsInline aria-label="Camera của bạn" />
                {(media !== "ok" || !cam) && <div><CameraOff size={30} aria-hidden /><p style={{ margin: "8px 0 0" }}>{media === "ok" ? "Camera đang tắt" : media === "denied" ? "Không mở được camera/micro" : "Chưa kiểm tra thiết bị"}</p></div>}
                <span className="tag">Bạn</span>
              </div>
            </div>
            <div className="controls">
              <button className={"control" + (!mic ? " off" : "")} onClick={toggleMic} disabled={closed || busy} aria-label={mic ? "Tắt micro" : "Bật micro"} aria-pressed={!mic}>{mic ? <Mic size={16} /> : <MicOff size={16} />}</button>
              <button className={"control" + (!cam ? " off" : "")} onClick={() => void toggleCam()} disabled={closed || busy} aria-label={cam ? "Tắt camera" : "Bật camera"} aria-pressed={!cam}>{cam ? <Camera size={16} /> : <CameraOff size={16} />}</button>
              <button className="control" onClick={() => void run(async () => {await startMedia();})} disabled={media === "busy" || closed || busy}>{media === "busy" ? "Đang kiểm tra…" : "Kiểm tra camera & micro"}</button>
              {live && token && <button className="control" onClick={() => void call.current?.restart()} disabled={busy}>Kết nối lại</button>}
              {token && !closed && <button className="control" onClick={leave} disabled={busy}>Rời cuộc gọi</button>}
              {role === "DOCTOR" && live && <button className="control end" onClick={() => setConfirmEnd(true)} disabled={busy}><PhoneOff size={16} aria-hidden /> Kết thúc phiên</button>}
            </div>
          </div>
          {playRequired && <button className="btn" onClick={() => {void remoteVideo.current?.play().then(()=>setPlayRequired(false)).catch(()=>setCallError("Hãy cho phép trình duyệt phát âm thanh."));}}>Bật âm thanh cuộc gọi</button>}
          {live && token && <p role="status" data-testid="call-state">{stateLabel[callState]}</p>}
          {media === "denied" && <div style={{ marginTop: 10 }}><Notice tone="warn">Không mở được camera hoặc micro. Hãy kiểm tra thiết bị và quyền truy cập của trình duyệt.</Notice></div>}
        </div>
        <aside className="panel">
          <h2>Phiên khám từ xa</h2>
          <p className="sub">{formatTime(appointment.startAt)}–{formatTime(appointment.endAt)} · {counterpartName}</p>
          <div className="row" style={{ margin: "10px 0" }}>Trạng thái: {sInfo ? <Pill tone={sInfo.tone}>{sInfo.label}</Pill> : <Pill>{enabled ? "Đang tải…" : "Chưa kết nối"}</Pill>}</div>
          {hint && <Notice><span>{hint}</span></Notice>}
          {!localStream && !closed && <label className="chk"><input type="checkbox" checked={!cam} onChange={e=>setCam(!e.target.checked)}/>Chỉ âm thanh</label>}
          {role === "PATIENT" && !closed && (
            <label className="chk" style={{ margin: "10px 0" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Tôi đồng ý tham gia buổi khám từ xa này.
            </label>
          )}
          {role === "PATIENT" && (
            <button className="btn primary block" disabled={!enabled || busy || !canPatientJoin || !!token} onClick={() => void join()}>
              <LogIn size={16} aria-hidden /> {token ? "Đã tham gia phòng" : "Tham gia phòng chờ"}
            </button>
          )}
          {role === "DOCTOR" && (
            <div className="stack">
              <button className="btn primary block" disabled={!enabled || busy || !canDoctorStart} onClick={() => void start()}>
                <PlayCircle size={16} aria-hidden /> Bắt đầu phiên khám
              </button>
              {canDoctorEnter && <button className="btn block" disabled={busy} onClick={() => void join()}><LogIn size={16} aria-hidden /> Vào lại phòng</button>}
            </div>
          )}
          {token && <p className="muted" style={{ marginTop: 10 }}>Quyền tham gia hết hạn lúc {formatTime(token.expiresAt)}.</p>}
          {closed && <Notice tone="ok">Phiên đã kết thúc. Kết thúc cuộc gọi không tự hoàn tất lần khám.</Notice>}
          <p className="muted" style={{ marginTop: 12 }}>Rời cuộc gọi không tự kết thúc lần khám. Việc hoàn tất bệnh án và lần khám do bác sĩ thực hiện riêng.</p>
        </aside>
      </div>
      {confirmEnd && (
        <ConfirmDialog title="Kết thúc phiên khám từ xa?" danger confirmLabel="Kết thúc phiên" busy={busy} error={error}
          message="Phòng sẽ đóng ngay và không cấp token mới. Việc hoàn tất bệnh án và lần khám vẫn cần thực hiện riêng."
          onCancel={() => setConfirmEnd(false)} onConfirm={() => void end()} />
      )}
    </div>
  );
}
