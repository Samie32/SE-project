import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  RotateCw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  User,
  Settings,
  MessageSquare,
} from 'lucide-react';
import type { TelehealthStatus } from '../../types/doctor.ts';

interface CallingRoomProps {
  sessionId: string;
  role: 'DOCTOR' | 'PATIENT';
  participantName: string;
  participantTitle?: string;
  initialStatus?: TelehealthStatus;
  onEndCall: () => void;
  onStatusChange?: (status: TelehealthStatus) => void;
}

export const CallingRoom: FC<CallingRoomProps> = ({
  sessionId,
  role,
  participantName,
  participantTitle = role === 'DOCTOR' ? 'Bệnh nhân' : 'Bác sĩ phụ trách',
  initialStatus = 'ACTIVE',
  onEndCall,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<TelehealthStatus>(initialStatus);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Hệ thống',
      text: 'Phiên khám từ xa bảo mật đã được kết nối và mã hóa E2E.',
      time: '08:00',
    },
  ]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Timer effect
  useEffect(() => {
    let timer: any;
    if (status === 'ACTIVE') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMic = () => {
    setIsMicOn((prev) => !prev);
  };

  const handleToggleVideo = () => {
    setIsVideoOn((prev) => !prev);
  };

  const handleReconnect = () => {
    setIsReconnecting(true);
    setStatus('RECONNECTING');
    onStatusChange?.('RECONNECTING');

    setTimeout(() => {
      setIsReconnecting(false);
      setStatus('ACTIVE');
      onStatusChange?.('ACTIVE');
    }, 1500);
  };

  const handleConfirmEndCall = () => {
    setShowEndConfirm(false);
    setStatus('ENDED');
    onStatusChange?.('ENDED');
    onEndCall();
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      sender: role === 'DOCTOR' ? 'Bác sĩ' : 'Bệnh nhân',
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewMessage('');
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950/80 backdrop-blur border-b border-slate-800 text-white z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {status === 'ACTIVE' && 'Đang khám từ xa'}
            {status === 'RECONNECTING' && 'Đang kết nối lại...'}
            {status === 'ENDED' && 'Phiên đã kết thúc'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{formatDuration(callDuration)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 border-l border-slate-800 pl-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mã hóa E2E (WebRTC)</span>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Mã phiên: <span className="font-mono text-slate-300">{sessionId}</span>
        </div>
      </div>

      {/* Main Calling Stage */}
      <div className="flex-1 relative flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Remote Participant Video (Primary Window) */}
        <div className="flex-1 relative bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
          {status === 'RECONNECTING' ? (
            <div className="text-center p-6">
              <RotateCw className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Đang khôi phục kết nối luồng trực tiếp...</p>
              <p className="text-xs text-slate-400 mt-1">Hệ thống đang kết nối lại với phòng khám của bạn</p>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              {/* Simulation of Remote Stream */}
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-indigo-500/50 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/10">
                  <User className="w-12 h-12 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-white">{participantName}</h3>
                <p className="text-xs text-indigo-400">{participantTitle}</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full max-w-fit mx-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Tín hiệu âm thanh & hình ảnh ổn định
                </div>
              </div>

              {/* Remote audio visualizer mock */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-white">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span>{participantName}</span>
              </div>
            </div>
          )}

          {/* Local User Self-Preview (PIP Box in lower right corner) */}
          <div className="absolute top-4 right-4 w-40 h-28 md:w-52 md:h-36 bg-slate-900 border-2 border-indigo-500/40 rounded-xl overflow-hidden shadow-2xl z-10 flex items-center justify-center">
            {isVideoOn ? (
              <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-slate-900 flex flex-col items-center justify-center text-slate-300 relative">
                <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-400 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-300" />
                </div>
                <span className="text-[11px] font-medium text-slate-300 mt-1">Bạn ({role === 'DOCTOR' ? 'Bác sĩ' : 'Bệnh nhân'})</span>
                <span className="absolute bottom-1 right-2 text-[10px] text-emerald-400 font-mono">HD 720p</span>
              </div>
            ) : (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="w-6 h-6 mb-1 text-red-400" />
                <span className="text-[10px]">Camera đang tắt</span>
              </div>
            )}

            {!isMicOn && (
              <div className="absolute bottom-2 left-2 bg-red-600/90 text-white p-1 rounded-md text-[10px] flex items-center gap-1">
                <MicOff className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Side Chat / Notes Panel (Toggleable) */}
        {showChat && (
          <div className="w-full md:w-80 bg-slate-950 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-white text-xs font-semibold">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Tin nhắn nhanh trong phiên
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg ${
                    msg.sender === 'Hệ thống'
                      ? 'bg-slate-900/60 border border-slate-800 text-slate-400 italic text-[11px]'
                      : msg.sender.includes('Bác sĩ')
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 ml-4'
                      : 'bg-slate-800 text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
              >
                Gửi
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mandatory Regulatory Warning Bar (From screen-specifications.md) */}
      <div className="px-6 py-2 bg-amber-500/10 border-t border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Lưu ý:</strong> Thao tác <em>Kết thúc cuộc gọi</em> chỉ đóng luồng truyền thông, <strong>chưa đồng nghĩa với việc hoàn tất hồ sơ khám bệnh</strong>. Bác sĩ cần lưu và xác nhận bệnh án ở biểu mẫu bên cạnh.
          </span>
        </div>
      </div>

      {/* Bottom Floating Controls Bar */}
      <div className="px-6 py-4 bg-slate-950 flex items-center justify-between gap-4">
        {/* Left utility buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3 rounded-full border transition ${
              showChat
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Mở tin nhắn"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="p-3 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
            title="Thử kết nối lại"
          >
            <RotateCw className={`w-5 h-5 ${isReconnecting ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Center Primary Call Actions */}
        <div className="flex items-center gap-3">
          {/* Mic Toggle */}
          <button
            onClick={handleToggleMic}
            className={`p-3.5 rounded-full font-medium transition shadow-lg ${
              isMicOn
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-600/30'
            }`}
            title={isMicOn ? 'Tắt mic' : 'Bật mic'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={handleToggleVideo}
            className={`p-3.5 rounded-full font-medium transition shadow-lg ${
              isVideoOn
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-600/30'
            }`}
            title={isVideoOn ? 'Tắt camera' : 'Bật camera'}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-5 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 shadow-lg shadow-red-600/30 transition hover:scale-105"
            title="Kết thúc phiên gọi"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-sm font-semibold">Kết thúc phiên</span>
          </button>
        </div>

        {/* Right Settings */}
        <div className="flex items-center gap-2">
          <button
            className="p-3 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Cài đặt thiết bị"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Ending Call */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Xác nhận kết thúc phiên gọi từ xa?</h3>
            <p className="text-sm text-slate-300 mt-2">
              Phiên gọi truyền thông sẽ kết thúc và chuyển trạng thái sang <span className="font-mono text-red-400">ENDED</span>.
            </p>
            <div className="mt-3 p-3 bg-slate-800/80 rounded-xl text-xs text-slate-400 border border-slate-700">
              💡 Bác sĩ vẫn có thể tiếp tục hoàn thiện và phát hành hồ sơ bệnh án hoặc đơn thuốc sau khi kết thúc cuộc gọi.
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmEndCall}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition shadow-lg shadow-red-600/30"
              >
                Đồng ý kết thúc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
