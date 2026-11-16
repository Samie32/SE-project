import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LogIn, Mic, MicOff, PhoneOff, PlayCircle, Video } from "lucide-react";
import { endSession, getSession, joinSession, prepareSession, startSession } from "@/api/operations";
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
 * Vòng đời và token nối API hiện có; camera/micro là xem trước cục bộ.
 * RTCPeerConnection/media hai phía chưa được tích hợp.
 */
export function TelehealthRoom({ role, appointment, counterpartName, onSessionChange }: Props) {
  const toast = useToast();
  const command = useCommand();
  const now = useNow(1000).getTime();
  const enabled = config.backend.telehealth;
  const [session, setSession] = useState<TelehealthSession | null>(null);
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
      setMedia("idle");
    }
  }, [session?.status]);
  useEffect(() => { if (token && Date.parse(token.expiresAt) <= now) setToken(null); }, [token, now]);

  const startMedia = async () => {
    setMedia("busy");
    stream.current?.getTracks().forEach((t) => t.stop());
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const m = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mounted.current || ["ENDED","CANCELLED"].includes(sessionRef.current?.status ?? "")) { m.getTracks().forEach(t => t.stop()); return; }
      stream.current = m;
      m.getVideoTracks().forEach((t) => (t.enabled = cam));
      m.getAudioTracks().forEach((t) => (t.enabled = mic));
      if (video.current) video.current.srcObject = m;
      setMedia("ok");
    } catch { setMedia("denied"); }
  };
  const toggleCam = () => { const n = !cam; setCam(n); stream.current?.getVideoTracks().forEach((t) => (t.enabled = n)); };
  const toggleMic = () => { const n = !mic; setMic(n); stream.current?.getAudioTracks().forEach((t) => (t.enabled = n)); };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(errorMessage(e)); if (e instanceof ApiError && e.status === 409) void refresh(); } finally { setBusy(false); }
  };
  const join = () => run(async () => {
    if (!session) return;
    setToken(await joinSession(session.id, role === "PATIENT"));
    await refresh();
    toast.success("Đã vào phòng chờ.");
  });
  const start = () => run(async () => {
    if (!session) return;
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
      <div className="video-layout">
        <div>
          <div className="stage">
            <div className="tiles">
              <div className="tile">
                <div><Video size={30} aria-hidden /><p style={{ margin: "8px 0 0" }}>{counterpartName}</p>
                  <small>{token ? "Đã vào phiên khám. Cuộc gọi âm thanh/hình ảnh hai phía chưa được tích hợp." : live ? "Chưa vào phòng." : "Chưa bắt đầu."}</small></div>
              </div>
              <div className={"tile" + (media === "ok" && cam ? "" : " hidden-video")}>
                <video ref={video} autoPlay muted playsInline aria-label="Camera của bạn" />
                {(media !== "ok" || !cam) && <div><CameraOff size={30} aria-hidden /><p style={{ margin: "8px 0 0" }}>{media === "ok" ? "Camera đang tắt" : media === "denied" ? "Không mở được camera/micro" : "Chưa kiểm tra thiết bị"}</p></div>}
                <span className="tag">Bạn</span>
              </div>
            </div>
            <div className="controls">
              <button className={"control" + (!mic ? " off" : "")} onClick={toggleMic} aria-label={mic ? "Tắt micro" : "Bật micro"} aria-pressed={!mic}>{mic ? <Mic size={16} /> : <MicOff size={16} />}</button>
              <button className={"control" + (!cam ? " off" : "")} onClick={toggleCam} aria-label={cam ? "Tắt camera" : "Bật camera"} aria-pressed={!cam}>{cam ? <Camera size={16} /> : <CameraOff size={16} />}</button>
              <button className="control" onClick={() => void startMedia()} disabled={media === "busy"}>{media === "busy" ? "Đang kiểm tra…" : "Kiểm tra camera & micro"}</button>
              {role === "DOCTOR" && live && <button className="control end" onClick={() => setConfirmEnd(true)} disabled={busy}><PhoneOff size={16} aria-hidden /> Kết thúc phiên</button>}
            </div>
          </div>
          {media === "denied" && <div style={{ marginTop: 10 }}><Notice tone="warn">Không mở được camera hoặc micro. Hãy kiểm tra thiết bị và quyền truy cập của trình duyệt.</Notice></div>}
        </div>
        <aside className="panel">
          <h2>Phiên khám từ xa</h2>
          <p className="sub">{formatTime(appointment.startAt)}–{formatTime(appointment.endAt)} · {counterpartName}</p>
          <div className="row" style={{ margin: "10px 0" }}>Trạng thái: {sInfo ? <Pill tone={sInfo.tone}>{sInfo.label}</Pill> : <Pill>{enabled ? "Đang tải…" : "Chưa kết nối"}</Pill>}</div>
          {hint && <Notice><span>{hint}</span></Notice>}
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
