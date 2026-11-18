import { useState, type FormEvent } from "react";
import { CalendarOff, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  createClinicHoliday,
  deleteClinicHoliday,
  getClinicHours,
  listClinicHolidays,
  updateClinicHours,
} from "@/api/clinic-hours";
import {
  CLINIC_WEEKDAYS,
  clinicDayMinutes,
  formatDurationMinutes,
  isValidClinicDay,
  type ClinicDayHours,
  type WeeklyClinicHours,
} from "@/core/clinic-hours";
import { errorMessage } from "@/core/client";
import { useAsync } from "@/core/useAsync";
import { AsyncBlock, Notice, PageHead, Panel, Pill, useToast } from "@/ui";

function holidayDayCount(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${(endDate || startDate)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function ClinicHoursPage() {
  const hours = useAsync(getClinicHours);

  return (
    <>
      <PageHead title="Giờ hoạt động" />
      <AsyncBlock loading={hours.loading} error={hours.error} onRetry={hours.reload}>
        {hours.data && <HoursWorkspace key={JSON.stringify(hours.data)} settings={hours.data} onSaved={hours.setData} />}
      </AsyncBlock>
    </>
  );
}

function HoursWorkspace({
  settings,
  onSaved,
}: {
  settings: WeeklyClinicHours;
  onSaved: (value: WeeklyClinicHours) => void;
}) {
  const [days, setDays] = useState(settings.days);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const dirty = JSON.stringify(days) !== JSON.stringify(settings.days);
  const invalidDay = days.find(day => !isValidClinicDay(day));
  const openDays = days.filter(day => day.opensAt !== null && day.closesAt !== null);
  const totalMinutes = days.reduce((sum, day) => sum + clinicDayMinutes(day), 0);

  function edit(dayOfWeek: number, change: Partial<ClinicDayHours>) {
    setDays(current => current.map(day => (day.dayOfWeek === dayOfWeek ? { ...day, ...change } : day)));
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || invalidDay || saving) return;
    setSaving(true);
    setError("");
    try {
      const saved = await updateClinicHours({ days });
      onSaved(saved);
      toast.success("Đã lưu giờ hoạt động phòng khám.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="clinic-hours-page">
      <Panel
        title="Lịch hoạt động hằng tuần"
        subtitle={`Mở ${openDays.length}/7 ngày · Tổng ${formatDurationMinutes(totalMinutes)}/tuần`}
        actions={dirty ? <Pill tone="wait">Chưa lưu</Pill> : <Pill tone="ok">Đang áp dụng</Pill>}
      >
        <form onSubmit={event => void save(event)} className="clinic-hours-form" noValidate>
          {error && <Notice tone="error">{error}</Notice>}

          <fieldset disabled={saving} className="clinic-hours-cards">
            <legend className="sr-only">Giờ mở và đóng cửa theo ngày</legend>
            {days.map(day => {
              const label = CLINIC_WEEKDAYS[day.dayOfWeek - 1];
              const open = day.opensAt !== null;
              const valid = isValidClinicDay(day);

              return (
                <div
                  key={day.dayOfWeek}
                  className={`clinic-day-card${open ? " open" : " closed"}${!valid ? " invalid" : ""}`}
                  role="group"
                  aria-label={label}
                >
                  <div className="clinic-day-card-head">
                    <strong>{label}</strong>
                    <label className="clinic-switch">
                      <span className="clinic-switch-text">{open ? "Hoạt động" : "Nghỉ"}</span>
                      <input
                        type="checkbox"
                        className="clinic-switch-input"
                        aria-label={`Mở cửa ${label}`}
                        checked={open}
                        onChange={event =>
                          edit(
                            day.dayOfWeek,
                            event.target.checked
                              ? { opensAt: "08:00", closesAt: "17:00" }
                              : { opensAt: null, closesAt: null },
                          )
                        }
                      />
                      <span className="clinic-switch-track" aria-hidden="true" />
                    </label>
                  </div>

                  {open ? (
                    <div className="clinic-day-card-times">
                      <label className="clinic-time-field">
                        <span className="muted">Mở cửa</span>
                        <input
                          type="time"
                          className="field clinic-time-input"
                          step={60}
                          aria-label={`Giờ mở cửa ${label}`}
                          value={day.opensAt ?? ""}
                          onChange={event => edit(day.dayOfWeek, { opensAt: event.target.value })}
                        />
                      </label>
                      <label className="clinic-time-field">
                        <span className="muted">Đóng cửa</span>
                        <input
                          type="time"
                          className="field clinic-time-input"
                          step={60}
                          aria-label={`Giờ đóng cửa ${label}`}
                          value={day.closesAt ?? ""}
                          onChange={event => edit(day.dayOfWeek, { closesAt: event.target.value })}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="clinic-day-card-closed muted">Phòng khám nghỉ</div>
                  )}

                  {open && !valid && (
                    <div className="field-error">Giờ đóng cửa phải sau giờ mở cửa.</div>
                  )}
                </div>
              );
            })}
          </fieldset>

          {invalidDay && (
            <Notice tone="warn">{CLINIC_WEEKDAYS[invalidDay.dayOfWeek - 1]} cần có giờ đóng cửa sau giờ mở cửa.</Notice>
          )}

          <div className="row wrap">
            <button className="btn primary" type="submit" disabled={!dirty || !!invalidDay || saving}>
              <Save size={15} aria-hidden /> {saving ? "Đang lưu…" : "Lưu giờ hoạt động"}
            </button>
            {dirty && (
              <button
                className="btn"
                type="button"
                disabled={saving}
                onClick={() => {
                  setDays(settings.days);
                  setError("");
                }}
              >
                <RotateCcw size={15} aria-hidden /> Bỏ thay đổi
              </button>
            )}
          </div>
        </form>
      </Panel>

      <HolidaysPanel />
    </div>
  );
}

function HolidaysPanel() {
  const holidayQuery = useAsync(listClinicHolidays);
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [closed, setClosed] = useState(true);
  const [opensAt, setOpensAt] = useState("08:00");
  const [closesAt, setClosesAt] = useState("12:00");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const holidays = holidayQuery.data ?? [];
  const sorted = [...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const totalHolidayDays = sorted.reduce((sum, item) => sum + holidayDayCount(item.startDate, item.endDate), 0);

  function overlapsExisting(from: string, to: string) {
    return holidays.some(item => item.startDate <= to && from <= (item.endDate || item.startDate));
  }

  async function addHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    const effectiveEnd = endDate || startDate;
    if (!startDate) return setErr("Vui lòng chọn ngày bắt đầu.");
    if (effectiveEnd < startDate) return setErr("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    if (!trimmed) return setErr("Vui lòng nhập tên dịp lễ hoặc lý do.");
    if (!closed && opensAt >= closesAt) return setErr("Giờ đóng cửa phải sau giờ mở cửa.");
    if (overlapsExisting(startDate, effectiveEnd)) return setErr("Khoảng ngày này bị trùng với lịch nghỉ đã có.");

    setBusy(true);
    setErr("");
    try {
      const created = await createClinicHoliday({
        startDate,
        endDate: effectiveEnd,
        name: trimmed,
        closed,
        opensAt: closed ? null : opensAt,
        closesAt: closed ? null : closesAt,
      });
      holidayQuery.setData([...holidays, created]);
      setStartDate("");
      setEndDate("");
      setName("");
      toast.success("Đã lưu ngày nghỉ lễ.");
    } catch (failure) {
      setErr(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function removeHoliday(id: string) {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await deleteClinicHoliday(id);
      holidayQuery.setData(holidays.filter(h => h.id !== id));
      toast.success("Đã xóa ngày nghỉ lễ.");
    } catch (failure) {
      setErr(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Ngày nghỉ lễ & lịch đặc biệt"
      actions={
        <div className="row">
          <Pill>{totalHolidayDays} ngày</Pill>
          <button type="button" className="btn sm" onClick={() => setExpanded(open => !open)}>
            <CalendarOff size={14} aria-hidden />
            {expanded ? "Thu gọn" : "Thiết lập ngày lễ"}
          </button>
        </div>
      }
    >
      <AsyncBlock loading={holidayQuery.loading} error={holidayQuery.error} onRetry={holidayQuery.reload}>
        {sorted.length === 0 ? (
          <div className="muted">Chưa có ngày nghỉ lễ nào. Nhấn “Thiết lập ngày lễ” khi cần thêm.</div>
        ) : (
          <div className="clinic-holiday-list">
            {sorted.map(item => {
              const effectiveEnd = item.endDate || item.startDate;
              const daysCount = holidayDayCount(item.startDate, effectiveEnd);
              const rangeText = effectiveEnd > item.startDate ? `${item.startDate} → ${effectiveEnd}` : item.startDate;
              return (
                <div key={item.id} className="clinic-holiday-item">
                  <div className="clinic-holiday-info">
                    <strong>{rangeText}</strong>
                    <span>{item.name}</span>
                    {daysCount > 1 && <Pill tone="info">{daysCount} ngày liên tiếp</Pill>}
                    <Pill tone={item.closed ? "bad" : "wait"}>
                      {item.closed ? "Nghỉ cả ngày" : `${item.opensAt}–${item.closesAt}`}
                    </Pill>
                  </div>
                  {expanded && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={busy}
                      aria-label={`Xóa ${item.name}`}
                      onClick={() => void removeHoliday(item.id)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AsyncBlock>

      {expanded && (
        <form onSubmit={event => void addHoliday(event)} className="clinic-holiday-form" noValidate>
          {err && <Notice tone="error">{err}</Notice>}

          <div className="clinic-holiday-inputs">
            <label className="clinic-date-field">
              <span className="muted">Từ ngày</span>
              <input
                type="date"
                className="field"
                aria-label="Từ ngày nghỉ lễ"
                disabled={busy}
                value={startDate}
                onChange={event => {
                  const next = event.target.value;
                  setStartDate(next);
                  if (endDate && endDate < next) setEndDate(next);
                  setErr("");
                }}
              />
            </label>
            <label className="clinic-date-field">
              <span className="muted">Đến ngày (nếu nhiều ngày)</span>
              <input
                type="date"
                className="field"
                aria-label="Đến ngày nghỉ lễ"
                disabled={busy}
                min={startDate || undefined}
                value={endDate}
                onChange={event => {
                  setEndDate(event.target.value);
                  setErr("");
                }}
              />
            </label>
            <input
              type="text"
              className="field grow"
              placeholder="Tên dịp lễ (vd: Nghỉ Tết Nguyên đán)"
              aria-label="Tên dịp lễ"
              disabled={busy}
              value={name}
              onChange={event => {
                setName(event.target.value);
                setErr("");
              }}
            />
            <select
              className="field"
              aria-label="Chế độ ngày lễ"
              disabled={busy}
              value={closed ? "closed" : "special"}
              onChange={event => setClosed(event.target.value === "closed")}
            >
              <option value="closed">Nghỉ cả ngày</option>
              <option value="special">Giờ đặc biệt</option>
            </select>
            {!closed && (
              <>
                <input
                  type="time"
                  className="field clinic-time-input"
                  aria-label="Giờ mở ngày lễ"
                  disabled={busy}
                  value={opensAt}
                  onChange={event => setOpensAt(event.target.value)}
                />
                <input
                  type="time"
                  className="field clinic-time-input"
                  aria-label="Giờ đóng ngày lễ"
                  disabled={busy}
                  value={closesAt}
                  onChange={event => setClosesAt(event.target.value)}
                />
              </>
            )}
            <button type="submit" className="btn primary sm" disabled={busy}>
              <Plus size={14} aria-hidden /> Thêm
            </button>
          </div>
          <div className="muted">Để trống “Đến ngày” nếu chỉ nghỉ 1 ngày. Lịch nghỉ lễ được lưu máy chủ và áp dụng tự động khi mở ca hoặc đặt lịch.</div>
        </form>
      )}
    </Panel>
  );
}
