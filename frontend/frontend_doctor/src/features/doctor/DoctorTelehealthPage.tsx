import { useState } from 'react';
import { CallingRoom } from '../../components/common/CallingRoom.tsx';
import { FileText, Save, CheckCircle2 } from 'lucide-react';
import type { TelehealthStatus } from '../../types/doctor.ts';

export const DoctorTelehealthPage: React.FC = () => {
  const [telehealthStatus, setTelehealthStatus] = useState<TelehealthStatus>('ACTIVE');
  const [notes, setNotes] = useState<string>(
    'Bệnh nhân tham gia phiên khám từ xa đúng giờ. Tinh thần tỉnh táo, tiếp xúc tốt. Bệnh nhân phản ánh chỉ số mỡ máu Triglyceride gần đây tăng cao (3.2 mmol/L).'
  );
  const [advice, setAdvice] = useState<string>(
    'Tư vấn giảm tinh bột nhanh, kiêng bia rượu và tăng cường đi bộ 45 phút/ngày. Cấp đơn thuốc hạ mỡ máu Lipitor 10mg trong 30 ngày.'
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleEndCall = () => {
    setTelehealthStatus('ENDED');
  };

  const handleSaveNotes = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Phòng Khám & Tư Vấn Y Khoa Từ Xa</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              Tuần 6 (UC-22, UC-23, UC-24)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Giao diện tích hợp thành phần phòng gọi dùng chung (CallingRoom Component) do <strong>Nguyễn Huỳnh Anh Kiệt</strong> chủ trì.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl font-mono text-slate-700">
            Trạng thái phiên: <strong>{telehealthStatus}</strong>
          </div>
        </div>
      </div>

      {/* Main Calling Grid (Video Call + Live Doctor Notes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left: Video Calling Room (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <CallingRoom
            sessionId="sess-tel-05"
            role="DOCTOR"
            participantName="Võ Minh Trí"
            participantTitle="Bệnh nhân khám từ xa"
            initialStatus={telehealthStatus}
            onEndCall={handleEndCall}
            onStatusChange={(newStatus) => setTelehealthStatus(newStatus)}
          />
        </div>

        {/* Right: Live Medical Notes & Quick Diagnosis (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Ghi chú lâm sàng trực tiếp trong phiên
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">
                Đồng bộ tự động
              </span>
            </div>

            {/* Patient Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-800">Võ Minh Trí (Nam, 42 tuổi)</div>
              <div className="text-slate-500 text-[11px]">SĐT: 0903 555 999 • Mã lịch: APT-20261028-05</div>
              <div className="text-slate-600 text-[11px]">
                <strong>Lý do:</strong> Tư vấn kết quả xét nghiệm máu và mỡ máu từ xa
              </div>
            </div>

            {/* Quick Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diễn biến tư vấn</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Advice Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kết luận & Lời dặn</label>
              <textarea
                rows={3}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            {savedSuccess && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Đã đồng bộ ghi chú vào hồ sơ nháp!
              </div>
            )}

            <button
              onClick={handleSaveNotes}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>Lưu ghi chú vào bệnh án</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
