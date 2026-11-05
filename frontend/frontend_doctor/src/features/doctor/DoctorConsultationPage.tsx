import { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  FileText,
  Pill,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Plus,
  Trash2,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { doctorApi } from '../../services/doctorApi.ts';
import { CURRENT_DOCTOR } from '../../services/mockData.ts';
import type {
  MedicalRecord,
  Prescription,
  PrescriptionItem,
  PatientHistoryItem,
} from '../../types/doctor.ts';

export const DoctorConsultationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RECORD' | 'PRESCRIPTION' | 'HISTORY'>('RECORD');
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // New medication row state
  const [newMed, setNewMed] = useState<Partial<PrescriptionItem>>({
    medicationName: '',
    strength: '',
    dosage: '1 viên',
    frequency: '2 lần / ngày sau ăn',
    durationDays: 7,
    quantity: 14,
    unit: 'viên',
    instructions: '',
  });

  const encounterId = 'enc-01';
  const patientId = 'pat-101';

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [rec, pres, hist] = await Promise.all([
          doctorApi.getRecord(encounterId),
          doctorApi.getPrescription(encounterId),
          doctorApi.getPatientHistory(patientId),
        ]);
        setRecord(rec);
        setPrescription(pres);
        setPatientHistory(hist);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleSaveRecord = async (finalize = false) => {
    if (!record) return;

    if (finalize && (!record.diagnosis.trim() || !record.treatmentPlan.trim())) {
      setMessage({ type: 'error', text: 'Vui lòng nhập chẩn đoán và hướng điều trị trước khi hoàn tất hồ sơ.' });
      return;
    }

    try {
      const saved = await doctorApi.saveRecord(record, finalize);
      setRecord(saved);
      setMessage({
        type: 'success',
        text: finalize
          ? 'Hồ sơ bệnh án đã được CHỐT HOÀN TẤT (FINAL). Không thể chỉnh sửa trực tiếp trừ khi tạo phụ lục bổ sung!'
          : 'Đã lưu bản nháp hồ sơ bệnh án thành công.',
      });
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi lưu hồ sơ.' });
    }
  };

  const handleAddMedication = () => {
    if (!newMed.medicationName || !newMed.strength) {
      setMessage({ type: 'error', text: 'Vui lòng điền tên thuốc và hàm lượng.' });
      return;
    }

    const item: PrescriptionItem = {
      id: `p-${Date.now()}`,
      medicationName: newMed.medicationName,
      strength: newMed.strength,
      dosage: newMed.dosage || '1 viên',
      frequency: newMed.frequency || '1 lần/ngày',
      durationDays: Number(newMed.durationDays) || 7,
      quantity: Number(newMed.quantity) || 10,
      unit: newMed.unit || 'viên',
      instructions: newMed.instructions || '',
    };

    const currentItems = prescription?.items || [];
    const updatedPrescription = {
      ...prescription!,
      items: [...currentItems, item],
    };
    setPrescription(updatedPrescription);

    // Reset row form
    setNewMed({
      medicationName: '',
      strength: '',
      dosage: '1 viên',
      frequency: '2 lần / ngày sau ăn',
      durationDays: 7,
      quantity: 14,
      unit: 'viên',
      instructions: '',
    });
  };

  const handleRemoveMedication = (itemId: string) => {
    if (!prescription) return;
    setPrescription({
      ...prescription,
      items: prescription.items.filter((i) => i.id !== itemId),
    });
  };

  const handleSavePrescription = async (issue = false) => {
    if (!prescription) return;

    if (issue && prescription.items.length === 0) {
      setMessage({ type: 'error', text: 'Đơn thuốc cần có ít nhất một dòng thuốc trước khi phát hành.' });
      return;
    }

    try {
      const saved = await doctorApi.savePrescription(
        encounterId,
        prescription.items,
        prescription.notes,
        issue
      );
      setPrescription(saved);
      setMessage({
        type: 'success',
        text: issue
          ? 'Đã PHÁT HÀNH ĐƠN THUỐC (ISSUED). Bệnh nhân hiện có thể xem trên cổng cá nhân.'
          : 'Đã lưu nháp đơn thuốc thành công.',
      });
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi lưu đơn thuốc.' });
    }
  };

  if (loading || !record || !prescription) {
    return <div className="p-12 text-center text-xs text-slate-400">Đang tải hồ sơ ca khám...</div>;
  }

  const isRecordFinal = record.status === 'FINAL';
  const isPrescriptionIssued = prescription.status === 'ISSUED';

  return (
    <div className="space-y-6">
      {/* Patient Consultation Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
            MP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Trần Thị Mai Phương</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                Mã BN: pat-101 • Nữ, 38 tuổi
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  isRecordFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                Hồ sơ: {record.status} (v{record.version})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Khám trực tiếp • Lịch khám: <strong>APT-20261028-01</strong> • Bác sĩ phụ trách:{' '}
              <strong className="text-slate-700">{CURRENT_DOCTOR.name}</strong>
            </p>
          </div>
        </div>

        {/* Vital signs quick pill box */}
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-slate-500">Huyết áp:</span>
            <strong className="text-slate-800 font-mono">{record.vitalSigns?.bloodPressure}</strong>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-500">Nhịp tim:</span>
            <strong className="text-slate-800 font-mono">{record.vitalSigns?.heartRate} bpm</strong>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('RECORD')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'RECORD'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Hồ Sơ Khám Bệnh ({record.status})</span>
        </button>

        <button
          onClick={() => setActiveTab('PRESCRIPTION')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'PRESCRIPTION'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Kê Đơn Thuốc ({prescription.status} - {prescription.items.length} thuốc)</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'HISTORY'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Khám Cũ (Audit Read)</span>
        </button>
      </div>

      {/* TAB 1: MEDICAL RECORD FORM */}
      {activeTab === 'RECORD' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800">Thông tin lâm sàng & Chẩn đoán y khoa</span>
            {isRecordFinal && (
              <span className="text-[11px] bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                Hồ sơ đã khóa (FINAL). Chỉ được xem hoặc tạo bản sửa đổi bổ sung.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Triệu chứng & Lý do đến khám</label>
              <textarea
                disabled={isRecordFinal}
                rows={3}
                value={record.symptoms}
                onChange={(e) => setRecord({ ...record, symptoms: e.target.value })}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chẩn đoán xác định (ICD-10 / Mô tả)</label>
              <textarea
                disabled={isRecordFinal}
                rows={3}
                value={record.diagnosis}
                onChange={(e) => setRecord({ ...record, diagnosis: e.target.value })}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kế hoạch & Hướng điều trị</label>
            <textarea
              disabled={isRecordFinal}
              rows={3}
              value={record.treatmentPlan}
              onChange={(e) => setRecord({ ...record, treatmentPlan: e.target.value })}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Lần cập nhật cuối: {new Date(record.updatedAt).toLocaleString('vi-VN')}
            </div>

            {!isRecordFinal && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveRecord(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu bản nháp (DRAFT)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveRecord(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition hover:scale-105"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>HOÀN TẤT HỒ SƠ (FINAL)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRESCRIPTION FORM */}
      {activeTab === 'PRESCRIPTION' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800">Danh mục thuốc & Hướng dẫn sử dụng</span>
            {isPrescriptionIssued ? (
              <span className="text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đơn thuốc đã phát hành chính thức
              </span>
            ) : (
              <span className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                Đang ở dạng bản nháp
              </span>
            )}
          </div>

          {/* Prescription table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold">STT</th>
                  <th className="p-3 font-semibold">Tên thuốc & Biệt dược</th>
                  <th className="p-3 font-semibold">Hàm lượng</th>
                  <th className="p-3 font-semibold">Liều dùng</th>
                  <th className="p-3 font-semibold">Tần suất & Cách dùng</th>
                  <th className="p-3 font-semibold">Số ngày</th>
                  <th className="p-3 font-semibold">Số lượng</th>
                  {!isPrescriptionIssued && <th className="p-3 font-semibold">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescription.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      Chưa có thuốc nào trong đơn. Thêm thuốc ở bảng bên dưới.
                    </td>
                  </tr>
                ) : (
                  prescription.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{item.medicationName}</td>
                      <td className="p-3 font-mono text-slate-600">{item.strength}</td>
                      <td className="p-3">{item.dosage}</td>
                      <td className="p-3 text-slate-600">
                        {item.frequency}
                        {item.instructions && <div className="text-[10px] text-slate-400">{item.instructions}</div>}
                      </td>
                      <td className="p-3 font-mono">{item.durationDays} ngày</td>
                      <td className="p-3 font-bold text-blue-600">
                        {item.quantity} {item.unit}
                      </td>
                      {!isPrescriptionIssued && (
                        <td className="p-3">
                          <button
                            onClick={() => handleRemoveMedication(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded"
                            title="Xóa dòng thuốc"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add row form */}
          {!isPrescriptionIssued && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                Thêm dòng thuốc mới vào đơn
              </span>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 font-medium mb-1">Tên thuốc</label>
                  <input
                    type="text"
                    placeholder="VD: Amlodipine, Panadol..."
                    value={newMed.medicationName}
                    onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-medium mb-1">Hàm lượng</label>
                  <input
                    type="text"
                    placeholder="VD: 5mg, 500mg..."
                    value={newMed.strength}
                    onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-medium mb-1">Liều dùng</label>
                  <input
                    type="text"
                    placeholder="VD: 1 viên"
                    value={newMed.dosage}
                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-medium mb-1">Tần suất uống</label>
                  <input
                    type="text"
                    placeholder="VD: 2 lần/ngày sau ăn"
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <input
                  type="text"
                  placeholder="Lời dặn riêng (VD: uống trước ngủ, không uống cùng sữa...)"
                  value={newMed.instructions}
                  onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                  className="w-2/3 p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm vào đơn</span>
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            {!isPrescriptionIssued && (
              <>
                <button
                  type="button"
                  onClick={() => handleSavePrescription(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu nháp đơn thuốc</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSavePrescription(true)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                  <span>PHÁT HÀNH ĐƠN THUỐC (ISSUED)</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDITED PATIENT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Lịch sử các lần khám trước của bệnh nhân</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Theo quy định bảo mật: Mọi hành động truy xuất hồ sơ khám cũ đều được ghi nhận vào nhật ký kiểm toán (Audit Event: READ_PHI).
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono border border-emerald-200">
              Audit Verified
            </span>
          </div>

          <div className="space-y-3">
            {patientHistory.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span>{item.date}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-blue-600">{item.specialtyName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{item.doctorName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 font-mono">
                    {item.recordStatus}
                  </span>
                </div>

                <div className="text-slate-700">
                  <strong>Chẩn đoán:</strong> {item.diagnosis}
                </div>

                {item.prescriptionSummary && (
                  <div className="text-slate-500 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                    <strong>Đơn thuốc đã cấp:</strong> {item.prescriptionSummary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
