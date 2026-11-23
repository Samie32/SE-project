import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileHeart, Filter, Pill as PillIcon, Printer } from "lucide-react";
import { listEncounterPrescriptions, listPatientPrescriptionsPage, listPatientRecordsPage } from "@/api/operations";
import { errorMessage } from "@/core/client";
import { config } from "@/core/config";
import { useDirectory } from "@/core/directory";
import { dayKey, formatDate, formatDateTime } from "@/core/datetime";
import { apptCode, MODE_LABEL } from "@/core/labels";
import { parseContent, recordSummary, type RecordContent } from "@/core/record-content";
import type { Appointment, MedicalRecord, Prescription } from "@/core/types";
import { AsyncBlock, Empty, Notice, PageHead, Pager, Panel, PendingBackend, Pill, SearchBox } from "@/ui";
import { PrescriptionView, RecordView } from "@/features/shared/RecordView";
import { usePatient } from "./PatientContext";

const BATCH_SIZE = 100;
const PAGE_SIZE = 8;

interface EncounterGroup {
  encounterId: string;
  latest: MedicalRecord;
  versions: MedicalRecord[];
  appointment?: Appointment;
  when: string;
  dateKey: string;
  year: string;
  monthKey: string;
  doctorId?: string;
  doctorName: string;
  hasAmendment: boolean;
}

function monthHeading(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return "Khác";
  return `Tháng ${Number(monthKey.slice(5, 7))}/${monthKey.slice(0, 4)}`;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export function PatientRecordsPage() {
  const { patientId, appointments } = usePatient();
  const dir = useDirectory();
  const [params] = useSearchParams();
  const enabled = config.backend.clinical;
  const detailRef = useRef<HTMLDivElement>(null);
  const loadGen = useRef(0);

  const [rawRecords, setRawRecords] = useState<MedicalRecord[]>([]);
  const [rawRx, setRawRx] = useState<Prescription[]>([]);
  const [extraRxByEncounter, setExtraRxByEncounter] = useState<Record<string, Prescription[]>>({});
  const [loadedRecordCount, setLoadedRecordCount] = useState(0);
  const [loadedRxCount, setLoadedRxCount] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const [hasMoreRx, setHasMoreRx] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [onlyWithRx, setOnlyWithRx] = useState(false);
  const [page, setPage] = useState(0);
  const [selEncounterId, setSelEncounterId] = useState("");
  const [selRecordId, setSelRecordId] = useState("");

  const reload = useCallback(async () => {
    const id = ++loadGen.current;
    if (!enabled || !patientId) {
      setRawRecords([]);
      setRawRx([]);
      setExtraRxByEncounter({});
      setLoadedRecordCount(0);
      setLoadedRxCount(0);
      setHasMoreRecords(false);
      setHasMoreRx(false);
      setError("");
      setLoadMoreError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setLoadMoreError("");
    try {
      const [recRows, rxRows] = await Promise.all([
        listPatientRecordsPage(patientId, BATCH_SIZE, 0),
        listPatientPrescriptionsPage(patientId, BATCH_SIZE, 0),
      ]);
      if (id !== loadGen.current) return;
      setRawRecords(recRows);
      setRawRx(rxRows);
      setExtraRxByEncounter({});
      setLoadedRecordCount(recRows.length);
      setLoadedRxCount(rxRows.length);
      setHasMoreRecords(recRows.length === BATCH_SIZE);
      setHasMoreRx(rxRows.length === BATCH_SIZE);
    } catch (e) {
      if (id === loadGen.current) setError(errorMessage(e));
    } finally {
      if (id === loadGen.current) setLoading(false);
    }
  }, [enabled, patientId]);

  useEffect(() => {
    void reload();
    return () => {
      loadGen.current++;
    };
  }, [reload]);

  const loadMore = async () => {
    if (!enabled || !patientId || loadingMore || !hasMoreRecords) return;
    const id = loadGen.current;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const [nextRecs, nextRx] = await Promise.all([
        listPatientRecordsPage(patientId, BATCH_SIZE, loadedRecordCount),
        hasMoreRx
          ? listPatientPrescriptionsPage(patientId, BATCH_SIZE, loadedRxCount)
          : Promise.resolve([] as Prescription[]),
      ]);
      if (id !== loadGen.current) return;
      setRawRecords((prev) => dedupeById([...prev, ...nextRecs]));
      setLoadedRecordCount((prev) => prev + nextRecs.length);
      setHasMoreRecords(nextRecs.length === BATCH_SIZE);
      if (hasMoreRx) {
        setRawRx((prev) => dedupeById([...prev, ...nextRx]));
        setLoadedRxCount((prev) => prev + nextRx.length);
        setHasMoreRx(nextRx.length === BATCH_SIZE);
      }
    } catch (e) {
      if (id === loadGen.current) setLoadMoreError(errorMessage(e));
    } finally {
      if (id === loadGen.current) setLoadingMore(false);
    }
  };

  const finalRecords = useMemo(
    () => rawRecords.filter((r) => r.status === "FINAL"),
    [rawRecords],
  );

  const parsedById = useMemo(() => {
    const m = new Map<string, RecordContent>();
    for (const r of finalRecords) m.set(r.id, parseContent(r.content));
    return m;
  }, [finalRecords]);

  const apptMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const a of appointments) {
      map.set(`id:${a.id}`, a);
      if (a.encounterId) map.set(`enc:${a.encounterId}`, a);
    }
    return map;
  }, [appointments]);

  const rxByEncounter = useMemo(() => {
    const m = new Map<string, Prescription[]>();
    for (const item of rawRx) {
      if (item.status !== "ISSUED") continue;
      const list = m.get(item.encounterId) ?? [];
      list.push(item);
      m.set(item.encounterId, list);
    }
    for (const [encId, items] of Object.entries(extraRxByEncounter)) {
      if (!m.has(encId) && items.length > 0) m.set(encId, items);
    }
    return m;
  }, [rawRx, extraRxByEncounter]);

  const groups = useMemo<EncounterGroup[]>(() => {
    const byEncounter = new Map<string, MedicalRecord[]>();
    for (const r of finalRecords) {
      const list = byEncounter.get(r.encounterId) ?? [];
      list.push(r);
      byEncounter.set(r.encounterId, list);
    }

    const out: EncounterGroup[] = [];
    for (const [encounterId, items] of byEncounter.entries()) {
      const versions = [...items].sort((a, b) => {
        if (b.version !== a.version) return b.version - a.version;
        const u = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
        return u !== 0 ? u : (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
      const latest = versions[0];
      const appointment =
        apptMap.get(`enc:${encounterId}`) ??
        (latest.appointmentId ? apptMap.get(`id:${latest.appointmentId}`) : undefined);
      const when =
        appointment?.startAt ??
        latest.startAt ??
        latest.createdAt ??
        latest.updatedAt ??
        "";
      const dateKey = when ? dayKey(when) : "";
      const year = dateKey ? dateKey.slice(0, 4) : "";
      const monthKey = dateKey ? dateKey.slice(0, 7) : "";
      const doctorId = appointment?.doctorId ?? latest.doctorId;
      out.push({
        encounterId,
        latest,
        versions,
        appointment,
        when,
        dateKey,
        year,
        monthKey,
        doctorId,
        doctorName: dir.doctorName(doctorId),
        hasAmendment: versions.length > 1 || Boolean(latest.supersedesId),
      });
    }

    return out.sort(
      (a, b) => b.when.localeCompare(a.when) || b.encounterId.localeCompare(a.encounterId),
    );
  }, [finalRecords, apptMap, dir]);

  const years = useMemo(
    () => [...new Set(groups.map((g) => g.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [groups],
  );

  const doctors = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      if (g.doctorId && !map.has(g.doctorId)) map.set(g.doctorId, g.doctorName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [groups]);

  const hasAnyRx = rxByEncounter.size > 0;
  const hasActiveFilters = Boolean(
    search.trim() || yearFilter !== "ALL" || doctorFilter !== "ALL" || onlyWithRx,
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("vi");
    return groups.filter((g) => {
      if (yearFilter !== "ALL" && g.year !== yearFilter) return false;
      if (doctorFilter !== "ALL" && g.doctorId !== doctorFilter) return false;
      const encRx = rxByEncounter.get(g.encounterId) ?? [];
      if (onlyWithRx && encRx.length === 0) return false;
      if (!q) return true;
      const contentStrings = g.versions.flatMap((v) => {
        const c = parsedById.get(v.id);
        return c ? [c.diagnosis, c.symptoms, c.plan, c.notes] : [];
      });
      const medicines = encRx.flatMap((p) => p.items.map((i) => i.medicineName));
      return [
        g.doctorName,
        g.appointment ? apptCode(g.appointment.id) : "",
        ...contentStrings,
        ...medicines,
      ]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(q);
    });
  }, [groups, yearFilter, doctorFilter, onlyWithRx, search, rxByEncounter, parsedById]);

  const targetEnc = params.get("encounterId");
  const targetAppt = params.get("appointmentId");
  const filteredKey = filteredGroups.map((g) => g.encounterId).join(",");

  useEffect(() => {
    if (!filteredGroups.length) {
      if (selEncounterId) setSelEncounterId("");
      if (selRecordId) setSelRecordId("");
      return;
    }
    const stillValid = filteredGroups.find((g) => g.encounterId === selEncounterId);
    if (stillValid) {
      if (!stillValid.versions.some((v) => v.id === selRecordId)) {
        setSelRecordId(stillValid.latest.id);
      }
      return;
    }
    let idx = -1;
    if (!hasActiveFilters && (targetEnc || targetAppt)) {
      idx = filteredGroups.findIndex(
        (g) =>
          (targetEnc && g.encounterId === targetEnc) ||
          (targetAppt &&
            (g.appointment?.id === targetAppt ||
              g.versions.some((v) => v.appointmentId === targetAppt))),
      );
    }
    if (idx < 0) idx = 0;
    const chosen = filteredGroups[idx];
    setSelEncounterId(chosen.encounterId);
    setSelRecordId(chosen.latest.id);
    setPage(Math.floor(idx / PAGE_SIZE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey, selEncounterId, hasActiveFilters, targetEnc, targetAppt]);

  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedGroups = filteredGroups.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const selectedGroup = filteredGroups.find((g) => g.encounterId === selEncounterId);
  const selectedRecord =
    selectedGroup?.versions.find((v) => v.id === selRecordId) ?? selectedGroup?.latest;

  useEffect(() => {
    if (!enabled || !hasMoreRx || !selectedGroup) return;
    const encId = selectedGroup.encounterId;
    if (
      rxByEncounter.has(encId) ||
      Object.prototype.hasOwnProperty.call(extraRxByEncounter, encId)
    ) {
      return;
    }
    let cancelled = false;
    listEncounterPrescriptions(encId)
      .then((rows) => {
        if (!cancelled) {
          setExtraRxByEncounter((prev) => ({
            ...prev,
            [encId]: rows.filter((x) => x.status === "ISSUED"),
          }));
        }
      })
      .catch(() => {
        /* giữ rỗng nếu chưa tải được */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, hasMoreRx, selectedGroup, rxByEncounter, extraRxByEncounter]);

  const selectGroup = (g: EncounterGroup) => {
    setSelEncounterId(g.encounterId);
    setSelRecordId(g.latest.id);
    if (typeof window !== "undefined" && window.innerWidth <= 1100) {
      detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setYearFilter("ALL");
    setDoctorFilter("ALL");
    setOnlyWithRx(false);
    setPage(0);
  };

  const rx = selectedGroup ? (rxByEncounter.get(selectedGroup.encounterId) ?? []) : [];
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const showFilterBar = groups.length >= 2 && (years.length > 1 || doctors.length > 1 || hasAnyRx);

  return (
    <>
      <PageHead
        eyebrow="Hồ sơ sức khỏe"
        title="Hồ sơ & đơn thuốc"
        text="Chỉ hiển thị bệnh án đã hoàn tất và đơn thuốc đã phát hành."
      />
      <PendingBackend feature="clinical" />
      {!enabled ? (
        <Panel title="Lịch sử khám" subtitle={`${completed.length} lần khám đã hoàn tất`}>
          {completed.length ? (
            completed.map((a) => (
              <div className="doctor-card" key={a.id}>
                <span className="docavatar">
                  <FileHeart size={20} aria-hidden />
                </span>
                <div className="docmeta">
                  <b>{dir.doctorName(a.doctorId)}</b>
                  <small>{formatDateTime(a.startAt)}</small>
                </div>
                <Pill tone="ok">Hoàn tất</Pill>
              </div>
            ))
          ) : (
            <Empty title="Chưa có lần khám hoàn tất" />
          )}
        </Panel>
      ) : (
        <div className="split">
          <Panel
            className="no-print"
            title="Lịch sử khám"
            subtitle={
              hasActiveFilters
                ? `${filteredGroups.length}/${groups.length} lần khám phù hợp`
                : `${groups.length} lần khám`
            }
          >
            <div style={{ marginBottom: 10 }}>
              <SearchBox
                label="Tìm hồ sơ bệnh án"
                placeholder="Tìm bác sĩ, chẩn đoán, tên thuốc…"
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(0);
                }}
              />
            </div>

            {showFilterBar && (
              <div className="records-filters" role="group" aria-label="Bộ lọc hồ sơ khám">
                {years.length > 1 && (
                  <select
                    className="field"
                    aria-label="Lọc theo năm"
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="ALL">Tất cả năm</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                )}
                {doctors.length > 1 && (
                  <select
                    className="field"
                    aria-label="Lọc theo bác sĩ"
                    value={doctorFilter}
                    onChange={(e) => {
                      setDoctorFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="ALL">Tất cả bác sĩ</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                {hasAnyRx && (
                  <button
                    type="button"
                    className={"records-filter-chip" + (onlyWithRx ? " on" : "")}
                    aria-pressed={onlyWithRx}
                    onClick={() => {
                      setOnlyWithRx((v) => !v);
                      setPage(0);
                    }}
                  >
                    <PillIcon size={13} aria-hidden /> Chỉ có đơn thuốc
                  </button>
                )}
                {hasActiveFilters && (
                  <button type="button" className="btn sm ghost" onClick={resetFilters}>
                    <Filter size={13} aria-hidden /> Xóa lọc
                  </button>
                )}
              </div>
            )}

            <AsyncBlock
              loading={loading}
              error={error}
              onRetry={() => void reload()}
              empty={filteredGroups.length === 0}
              emptyTitle={groups.length === 0 ? "Chưa có bệnh án hoàn tất" : "Không tìm thấy bệnh án phù hợp"}
              emptyText={
                groups.length === 0 ? (
                  "Bệnh án xuất hiện sau khi bác sĩ hoàn tất."
                ) : (
                  <button type="button" className="btn sm" onClick={resetFilters}>
                    Xóa bộ lọc
                  </button>
                )
              }
            >
              <div className="records-list-scroll">
                {pagedGroups.map((g, index) => {
                  const prevMonth = index > 0 ? pagedGroups[index - 1].monthKey : "";
                  const showMonthHeader = g.monthKey && g.monthKey !== prevMonth;
                  const hasRx = (rxByEncounter.get(g.encounterId)?.length ?? 0) > 0;
                  const active = g.encounterId === selEncounterId;
                  return (
                    <div key={g.encounterId}>
                      {showMonthHeader && (
                        <div className="records-month-label">{monthHeading(g.monthKey)}</div>
                      )}
                      <button
                        type="button"
                        className={"listbtn" + (active ? " on" : "")}
                        aria-pressed={active}
                        onClick={() => selectGroup(g)}
                      >
                        <span className="d">
                          <b>{g.dateKey ? g.dateKey.slice(8, 10) : "—"}</b>
                          <small>{g.dateKey ? `T${g.dateKey.slice(5, 7)}` : "—"}</small>
                        </span>
                        <span className="grow">
                          <b>{g.doctorName}</b>
                          <small>{recordSummary(g.latest)}</small>
                          {(g.hasAmendment || hasRx) && (
                            <span className="record-tags">
                              {g.hasAmendment && (
                                <span className="mini-tag warn">
                                  Đã bổ sung (v{g.latest.version})
                                </span>
                              )}
                              {hasRx && <span className="mini-tag ok">Có đơn thuốc</span>}
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredGroups.length > PAGE_SIZE && (
                <Pager
                  page={safePage}
                  pageCount={pageCount}
                  total={filteredGroups.length}
                  onPage={setPage}
                />
              )}

              {hasMoreRecords && (
                <div style={{ marginTop: 12 }}>
                  {loadMoreError && <Notice tone="error">{loadMoreError}</Notice>}
                  <button
                    type="button"
                    className="btn sm block"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? "Đang tải thêm…" : "Tải thêm bệnh án cũ hơn"}
                  </button>
                </div>
              )}
            </AsyncBlock>
          </Panel>

          <div className="records-detail-col" ref={detailRef}>
            {selectedGroup && selectedRecord ? (
              <>
                <Panel
                  title={selectedGroup.doctorName}
                  subtitle={
                    [
                      selectedGroup.when ? `Lần khám ngày ${formatDate(selectedGroup.when)}` : null,
                      selectedGroup.appointment ? MODE_LABEL[selectedGroup.appointment.mode] : null,
                      selectedGroup.appointment ? apptCode(selectedGroup.appointment.id) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  actions={
                    <div className="row">
                      <Pill tone="ok">Đã hoàn tất</Pill>
                      <button type="button" className="btn sm no-print" onClick={() => window.print()}>
                        <Printer size={14} aria-hidden /> In hồ sơ
                      </button>
                    </div>
                  }
                >
                  {selectedGroup.versions.length > 1 && (
                    <div
                      className="records-versions no-print"
                      role="group"
                      aria-label="Phiên bản bệnh án"
                    >
                      {selectedGroup.versions.map((v, idx) => {
                        const isLatest = idx === 0;
                        const label = isLatest
                          ? `Bản mới nhất (v${v.version})`
                          : idx === selectedGroup.versions.length - 1
                            ? `Bản gốc (v${v.version})`
                            : `Phiên bản v${v.version}`;
                        const active = selectedRecord.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            className={"records-filter-chip" + (active ? " on" : "")}
                            aria-pressed={active}
                            onClick={() => setSelRecordId(v.id)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedRecord.id !== selectedGroup.latest.id && (
                    <div className="no-print" style={{ marginBottom: 12 }}>
                      <Notice
                        tone="warn"
                        actions={
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setSelRecordId(selectedGroup.latest.id)}
                          >
                            Xem bản mới nhất
                          </button>
                        }
                      >
                        Bạn đang xem phiên bản cũ hơn (v{selectedRecord.version}). Đã có bản chỉnh sửa bổ sung mới hơn.
                      </Notice>
                    </div>
                  )}

                  <RecordView record={selectedRecord} />
                </Panel>
                <Panel
                  title="Đơn thuốc điện tử"
                  subtitle={
                    rx[0]?.issuedAt
                      ? `Phát hành lúc ${formatDateTime(rx[0].issuedAt)}`
                      : "Chỉ hiển thị đơn đã phát hành"
                  }
                >
                  {rx.length ? (
                    rx.map((x) => <PrescriptionView key={x.id} rx={x} />)
                  ) : (
                    <Empty title="Không có đơn thuốc cho lần khám này" />
                  )}
                </Panel>
              </>
            ) : (
              <Panel>
                <Empty title="Chọn một lần khám để xem chi tiết" />
              </Panel>
            )}
          </div>
        </div>
      )}
    </>
  );
}
