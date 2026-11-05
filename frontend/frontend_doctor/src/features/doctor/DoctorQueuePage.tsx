import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Volume2,
  SkipForward,
  PlayCircle,
  Clock,
  CheckCircle,
  ArrowRight,
  Phone,
  Sparkles,
} from 'lucide-react';
import { doctorApi } from '../../services/doctorApi.ts';
import { CURRENT_DOCTOR } from '../../services/mockData.ts';
import type { QueueTicket } from '../../types/doctor.ts';

export const DoctorQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [callingState, setCallingState] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await doctorApi.getQueue(CURRENT_DOCTOR.id);
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const currentCalled = queue.find((q) => q.status === 'CALLED' || q.status === 'IN_SERVICE');
  const waitingTickets = queue.filter((q) => q.status === 'WAITING');
  const pastTickets = queue.filter((q) => q.status === 'DONE' || q.status === 'SKIPPED');

  const handleCallNext = async () => {
    setCallingState('Đang gọi số...');
    try {
      const called = await doctorApi.callNextTicket(CURRENT_DOCTOR.id);
      if (called) {
        setCallingState(`Đang mời số ${called.ticketNumber} - ${called.patientName} vào phòng`);
        setTimeout(() => setCallingState(null), 3000);
      }
      fetchQueue();
    } catch {
      setCallingState('Lỗi khi gọi số.');
      setTimeout(() => setCallingState(null), 2000);
    }
  };

  const handleSkip = async (ticketId: string) => {
    if (!window.confirm('Chuyển lượt khám này về cuối hàng đợi?')) return;
    try {
      await doctorApi.skipTicket(ticketId);
      fetchQueue();
    } catch {
      alert('Không thể bỏ qua lượt.');
    }
  };

  const handleStartConsultation = () => {
    navigate('/doctor/consultation');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Hàng Đợi Tiếp Đón & Điều Phối Lượt Khám</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              Tuần 5 (UC-20)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống sắp xếp phiếu theo thứ tự FIFO (First In, First Out). Bác sĩ gọi số lượt và tiếp nhận bệnh nhân vào phòng khám.
          </p>
        </div>

        <div>
          <button
            onClick={handleCallNext}
            disabled={waitingTickets.length === 0}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition hover:scale-105"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>GỌI LƯỢT TIẾP THEO (FIFO)</span>
          </button>
        </div>
      </div>

      {callingState && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-semibold flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>{callingState}</span>
        </div>
      )}

      {/* Primary Calling Display (Màn hình gọi hiện tại) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-900">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            Số thứ tự đang phục vụ tại phòng khám
          </span>
          <span className="bg-indigo-900/60 border border-indigo-700/60 px-3 py-1 rounded-full text-indigo-200 text-xs">
            {CURRENT_DOCTOR.roomNumber}
          </span>
        </div>

        {currentCalled ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-indigo-600/30 border-2 border-indigo-400 flex flex-col items-center justify-center text-white shadow-lg">
                <span className="text-xs uppercase text-indigo-200">Số</span>
                <span className="text-4xl font-extrabold font-mono">{currentCalled.ticketNumber.toString().padStart(2, '0')}</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{currentCalled.patientName}</h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {currentCalled.status === 'IN_SERVICE' ? 'Đang trong phòng khám' : 'Đang gọi vào phòng'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Check-in lúc {currentCalled.checkInTime}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentCalled.patientPhone}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSkip(currentCalled.id)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
              >
                <SkipForward className="w-4 h-4" />
                <span>Vắng mặt / Bỏ lượt</span>
              </button>

              <button
                onClick={handleStartConsultation}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition hover:scale-105"
              >
                <PlayCircle className="w-4 h-4 text-slate-950" />
                <span>BẮT ĐẦU KHÁM BỆNH</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Hiện chưa có bệnh nhân nào được gọi vào phòng. Bấm <strong>"Gọi lượt tiếp theo"</strong> để tiếp nhận bệnh nhân chờ.
          </div>
        )}
      </div>

      {/* Grid: Waiting Queue vs Past Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting column (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Danh sách bệnh nhân đang đợi ({waitingTickets.length})
            </span>
            <span className="text-slate-400 text-[11px]">Thứ tự tiếp đón tự động</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Đang tải hàng đợi...</div>
          ) : waitingTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Không còn bệnh nhân nào đang đợi trong hàng.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {waitingTickets.map((ticket, idx) => (
                <div
                  key={ticket.id}
                  className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold font-mono text-sm flex items-center justify-center border border-blue-100">
                      #{ticket.ticketNumber.toString().padStart(2, '0')}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{ticket.patientName}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> Check-in: {ticket.checkInTime}
                        </span>
                        <span>•</span>
                        <span>SĐT: {ticket.patientPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Vị trí: #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleSkip(ticket.id)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-xs"
                      title="Chuyển xuống cuối hàng"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History / Done column (1/3 width) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 text-xs font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Lượt đã xử lý hôm nay</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {pastTickets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Chưa có lượt nào hoàn tất</div>
            ) : (
              pastTickets.map((t) => (
                <div key={t.id} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-700">
                      #{t.ticketNumber} - {t.patientName}
                    </span>
                    <div className="text-[10px] text-slate-400">Gọi lúc {t.calledAt || t.checkInTime}</div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      t.status === 'DONE' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {t.status === 'DONE' ? 'Đã khám' : 'Bỏ lượt'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
