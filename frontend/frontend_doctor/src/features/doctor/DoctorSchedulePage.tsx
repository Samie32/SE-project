import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Video,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  CalendarDays,
  Coffee,
} from 'lucide-react';
import { doctorApi } from '../../services/doctorApi.ts';
import { CURRENT_DOCTOR } from '../../services/mockData.ts';
import type {
  Availability,
  AvailabilityInput,
  TimeOff,
  TimeOffInput,
  ConsultationMode,
} from '../../types/doctor.ts';

export const DoctorSchedulePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AVAILABILITY' | 'TIMEOFF'>('AVAILABILITY');
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showAddAvailabilityModal, setShowAddAvailabilityModal] = useState<boolean>(false);
  const [showAddTimeOffModal, setShowAddTimeOffModal] = useState<boolean>(false);

  // Availability form state
  const [avForm, setAvForm] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    slotMinutes: number;
    mode: ConsultationMode;
    repeatWeekly: boolean;
  }>({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '11:30',
    slotMinutes: 20,
    mode: 'IN_PERSON',
    repeatWeekly: false,
  });

  // TimeOff form state
  const [toForm, setToForm] = useState<{
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    reason: string;
  }>({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '17:00',
    reason: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [avs, tos] = await Promise.all([
        doctorApi.getAvailabilities(CURRENT_DOCTOR.id),
        doctorApi.getTimeOffs(CURRENT_DOCTOR.id),
      ]);
      setAvailabilities(avs);
      setTimeOffs(tos);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu lịch làm việc.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startAt = `${avForm.date}T${avForm.startTime}:00`;
      const endAt = `${avForm.date}T${avForm.endTime}:00`;

      if (new Date(startAt) >= new Date(endAt)) {
        setMessage({ type: 'error', text: 'Giờ bắt đầu phải trước giờ kết thúc.' });
        return;
      }

      const input: AvailabilityInput = {
        startAt,
        endAt,
        slotMinutes: Number(avForm.slotMinutes),
        mode: avForm.mode,
        repeatWeekly: avForm.repeatWeekly,
      };

      await doctorApi.createAvailability(CURRENT_DOCTOR.id, input);
      setMessage({ type: 'success', text: 'Đã thêm ca khám thành công!' });
      setShowAddAvailabilityModal(false);
      loadData();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi lưu ca làm việc.' });
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy ca làm việc này?')) return;
    try {
      await doctorApi.deleteAvailability(id);
      setMessage({ type: 'success', text: 'Đã xóa ca khám.' });
      loadData();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi xóa ca khám.' });
    }
  };

  const handleCreateTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startAt = `${toForm.startDate}T${toForm.startTime}:00`;
      const endAt = `${toForm.endDate}T${toForm.endTime}:00`;

      if (new Date(startAt) >= new Date(endAt)) {
        setMessage({ type: 'error', text: 'Thời gian bắt đầu nghỉ phải trước thời gian kết thúc.' });
        return;
      }

      const input: TimeOffInput = {
        startAt,
        endAt,
        reason: toForm.reason || 'Bác sĩ có việc cá nhân',
      };

      await doctorApi.createTimeOff(CURRENT_DOCTOR.id, input);
      setMessage({ type: 'success', text: 'Đăng ký lịch nghỉ phép thành công!' });
      setShowAddTimeOffModal(false);
      loadData();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi đăng ký lịch nghỉ.' });
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch nghỉ này?')) return;
    try {
      await doctorApi.deleteTimeOff(id);
      setMessage({ type: 'success', text: 'Đã hủy lịch nghỉ.' });
      loadData();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi hủy lịch nghỉ.' });
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Quản Lý Lịch Làm Việc & Nghỉ Phép</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              Tuần 3 - Nhiệm vụ trọng tâm
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bác sĩ chủ động thiết lập khung giờ nhận khám (trực tiếp & từ xa) và khai báo lịch nghỉ theo đúng quy tắc nghiệp vụ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'AVAILABILITY' ? (
            <button
              onClick={() => setShowAddAvailabilityModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm ca khám mới</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddTimeOffModal(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-amber-500/20 transition hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng ký nghỉ phép</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">{availabilities.length}</div>
            <div className="text-[11px] text-slate-500">Ca làm việc đã kích hoạt</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">
              {availabilities.filter((a) => a.mode === 'IN_PERSON').length} trực tiếp /{' '}
              {availabilities.filter((a) => a.mode === 'TELEHEALTH').length} từ xa
            </div>
            <div className="text-[11px] text-slate-500">Phân bố hình thức khám</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">{timeOffs.length}</div>
            <div className="text-[11px] text-slate-500">Lịch nghỉ phép đã đăng ký</div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('AVAILABILITY')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'AVAILABILITY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Ca làm việc & Khung giờ nhận khám ({availabilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TIMEOFF')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'TIMEOFF'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Lịch nghỉ phép & Vắng mặt ({timeOffs.length})</span>
        </button>
      </div>

      {/* Tab 1: Availability List */}
      {activeTab === 'AVAILABILITY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">Danh sách các ca trực và khung giờ khả dụng</span>
            <div className="flex items-center gap-1 text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Khung giờ trống sẽ tự động được mở trên cổng đặt lịch của bệnh nhân</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Đang tải lịch làm việc...</div>
          ) : availabilities.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Bác sĩ chưa thiết lập ca làm việc nào.</p>
              <button
                onClick={() => setShowAddAvailabilityModal(true)}
                className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
              >
                + Thêm ca làm việc đầu tiên
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {availabilities.map((av) => {
                const start = formatDateTime(av.startAt);
                const end = formatDateTime(av.endAt);
                return (
                  <div key={av.id} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          av.mode === 'IN_PERSON'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        }`}
                      >
                        {av.mode === 'IN_PERSON' ? <UserCheck className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{start.date}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              av.mode === 'IN_PERSON'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {av.mode === 'IN_PERSON' ? 'Khám trực tiếp' : 'Khám từ xa (Video)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {start.time} — {end.time}
                          </span>
                          <span>•</span>
                          <span>Thời lượng mỗi slot: <strong>{av.slotMinutes} phút</strong></span>
                          {av.repeatWeekly && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">Lặp lại hàng tuần</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAvailability(av.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hủy ca khám"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Time-Off List */}
      {activeTab === 'TIMEOFF' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">Lịch đăng ký nghỉ phép & vắng mặt (Time-Off)</span>
            <div className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Theo BR-02: Không thể đăng ký nghỉ trùng với lịch khám đã có bệnh nhân mà chưa xử lý</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách nghỉ...</div>
          ) : timeOffs.length === 0 ? (
            <div className="p-12 text-center">
              <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Bác sĩ hiện không có lịch nghỉ nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {timeOffs.map((to) => {
                const start = formatDateTime(to.startAt);
                const end = formatDateTime(to.endAt);
                return (
                  <div key={to.id} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                        <Coffee className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {start.date} ({start.time}) — {end.date} ({end.time})
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Đã phê duyệt
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Lý do: <span className="font-medium">{to.reason || 'Nghỉ cá nhân'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTimeOff(to.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hủy lịch nghỉ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Thêm ca làm việc */}
      {showAddAvailabilityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">Thêm Ca Làm Việc Mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Khung giờ này sẽ được hệ thống tự động sinh các slot để bệnh nhân đăng ký.
            </p>

            <form onSubmit={handleCreateAvailability} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ngày làm việc</label>
                <input
                  type="date"
                  required
                  value={avForm.date}
                  onChange={(e) => setAvForm({ ...avForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    required
                    value={avForm.startTime}
                    onChange={(e) => setAvForm({ ...avForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    required
                    value={avForm.endTime}
                    onChange={(e) => setAvForm({ ...avForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hình thức khám</label>
                  <select
                    value={avForm.mode}
                    onChange={(e) => setAvForm({ ...avForm, mode: e.target.value as ConsultationMode })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="IN_PERSON">🏥 Trực tiếp tại phòng</option>
                    <option value="TELEHEALTH">📹 Khám từ xa (Video)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thời lượng mỗi lượt</label>
                  <select
                    value={avForm.slotMinutes}
                    onChange={(e) => setAvForm({ ...avForm, slotMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value={15}>15 phút</option>
                    <option value={20}>20 phút (chuẩn)</option>
                    <option value={30}>30 phút (tư vấn sâu)</option>
                    <option value={45}>45 phút</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="repeatWeekly"
                  checked={avForm.repeatWeekly}
                  onChange={(e) => setAvForm({ ...avForm, repeatWeekly: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="repeatWeekly" className="text-slate-700">
                  Lặp lại ca này vào mỗi tuần tiếp theo
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAvailabilityModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  Lưu ca làm việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đăng ký nghỉ phép (TimeOff) */}
      {showAddTimeOffModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">Đăng Ký Lịch Nghỉ Phép (Time-Off)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Trong thời gian này, hệ thống sẽ tự động khóa các khung giờ đặt lịch của bác sĩ.
            </p>

            <form onSubmit={handleCreateTimeOff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={toForm.startDate}
                    onChange={(e) => setToForm({ ...toForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    required
                    value={toForm.startTime}
                    onChange={(e) => setToForm({ ...toForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    required
                    value={toForm.endDate}
                    onChange={(e) => setToForm({ ...toForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    required
                    value={toForm.endTime}
                    onChange={(e) => setToForm({ ...toForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lý do nghỉ</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Tham gia hội thảo chuyên khoa, việc gia đình..."
                  value={toForm.reason}
                  onChange={(e) => setToForm({ ...toForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Nếu khoảng thời gian này đã có bệnh nhân đặt lịch hẹn, hệ thống sẽ yêu cầu kiểm tra và điều chuyển lịch trước khi phê duyệt đơn nghỉ.
                </span>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTimeOffModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                >
                  Xác nhận đăng ký nghỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
