import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  Check,
  ChevronDown,
  Copy,
  Download,
  FilePenLine,
  Filter,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
import {
  createAuditArchiveBatch,
  exportAuditEvents,
  getAuditRetention,
  getAuditSummary,
  listAuditEvents,
  verifyAuditIntegrity,
} from "@/api/operations";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_CATEGORY_OPTIONS,
  AUDIT_RESULT_LABEL,
  AUDIT_RESULT_TONE,
  DELETION_POLICY_VI,
  INTEGRITY_REASON_VI,
  INTEGRITY_STATUS_LABEL,
  auditActionLabel,
  auditResourceContext,
  formatCompactId,
  isHighRiskAuditAction,
  matchAuditActionCodes,
  resolveAuditActionFilter,
} from "@/core/audit-labels";
import { errorMessage } from "@/core/client";
import { config } from "@/core/config";
import { addDays, formatDateTimeSec, localToIso, todayKey } from "@/core/datetime";
import { UUID_RE } from "@/core/labels";
import type {
  AuditActionCategory,
  AuditEvent,
  AuditFilterParams,
  AuditIntegrityReport,
  AuditRetentionStatus,
} from "@/core/types";
import { useAsync } from "@/core/useAsync";
import { AsyncBlock, Metric, Modal, Notice, PageHead, Panel, PendingBackend, Pill, useToast } from "@/ui";

const SIZE = 20;

type TimePreset = "ALL" | "TODAY" | "24H" | "7D" | "30D" | "CUSTOM";

interface AuditFormState {
  actorId: string;
  resourceId: string;
  correlationId: string;
  from: string;
  to: string;
  fromIsoOverride: string;
  result: string;
  action: string;
  category: AuditActionCategory | "";
  actorType: "USER" | "SYSTEM" | "";
  excludeReadNoise: boolean;
}

interface AuditCursor {
  createdAt: string;
  id: string;
}

const EMPTY_FORM: AuditFormState = {
  actorId: "",
  resourceId: "",
  correlationId: "",
  from: "",
  to: "",
  fromIsoOverride: "",
  result: "",
  action: "",
  category: "",
  actorType: "",
  excludeReadNoise: false,
};

function buildApiFilters(state: AuditFormState): AuditFilterParams {
  return {
    actorId: state.actorId || undefined,
    resourceId: state.resourceId || undefined,
    correlationId: state.correlationId || undefined,
    from: state.fromIsoOverride || (state.from ? localToIso(state.from, "00:00") : undefined),
    to: state.to ? localToIso(addDays(state.to, 1), "00:00") : undefined,
    result: state.result || undefined,
    action: resolveAuditActionFilter(state.action),
    category: state.category || undefined,
    actorType: state.actorType || undefined,
    excludeReadNoise: state.excludeReadNoise || undefined,
  };
}

function buildSummaryBaseFilters(state: AuditFormState): AuditFilterParams {
  return {
    actorId: state.actorId || undefined,
    resourceId: state.resourceId || undefined,
    correlationId: state.correlationId || undefined,
    from: state.fromIsoOverride || (state.from ? localToIso(state.from, "00:00") : undefined),
    to: state.to ? localToIso(addDays(state.to, 1), "00:00") : undefined,
    actorType: state.actorType || undefined,
    excludeReadNoise: state.excludeReadNoise || undefined,
  };
}

function downloadCsvFile(filename: string, csv: string) {
  const payload = csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv;
  const blob = new Blob([payload], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AuditPage() {
  const toast = useToast();
  const [form, setForm] = useState<AuditFormState>(EMPTY_FORM);
  const [applied, setApplied] = useState<AuditFormState>(EMPTY_FORM);
  const [preset, setPreset] = useState<TimePreset>("ALL");
  const [cursors, setCursors] = useState<(AuditCursor | null)[]>([null]);
  const [page, setPage] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errs, setErrs] = useState<{ actorId?: string; correlationId?: string; range?: string }>({});
  const [showIdFilters, setShowIdFilters] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [actionSuggestOpen, setActionSuggestOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const actionComboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toolsOpen && !actionSuggestOpen) return;
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as Node | null;
      if (toolsOpen && toolsRef.current && target && !toolsRef.current.contains(target)) {
        setToolsOpen(false);
      }
      if (actionSuggestOpen && actionComboRef.current && target && !actionComboRef.current.contains(target)) {
        setActionSuggestOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setToolsOpen(false);
        setActionSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen, actionSuggestOpen]);

  const actionSuggestions = useMemo(() => {
    const q = form.action.trim();
    if (!q) {
      const featured = [
        "RECORD_AMENDED",
        "RECORD_FINAL",
        "PRESCRIPTION_ISSUED",
        "APPOINTMENT_BOOKED",
        "APPOINTMENT_CANCELLED",
        "ROLES_CHANGED",
        "PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW",
        "TELEHEALTH_JOINED",
        "AUDIT_EXPORT",
        "AUDIT_INTEGRITY_VERIFIED",
      ];
      return featured
        .filter((code) => code in AUDIT_ACTION_LABELS)
        .map((code) => ({ code, label: AUDIT_ACTION_LABELS[code] }));
    }
    const matched = matchAuditActionCodes(q);
    return matched.slice(0, 15).map((code) => ({ code, label: AUDIT_ACTION_LABELS[code] ?? code }));
  }, [form.action]);

  const [exporting, setExporting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [integrity, setIntegrity] = useState<AuditIntegrityReport | null>(null);
  const [retentionOpen, setRetentionOpen] = useState(false);

  const currentCursor = cursors[page] ?? null;
  const apiFilters = useMemo(() => buildApiFilters(applied), [applied]);
  const summaryFilters = useMemo(() => buildSummaryBaseFilters(applied), [applied]);

  const listQuery = useAsync(async () => {
    if (!config.backend.audit) return [];
    return listAuditEvents({
      ...apiFilters,
      limit: SIZE + 1,
      offset: currentCursor ? undefined : 0,
      cursorCreatedAt: currentCursor?.createdAt,
      cursorId: currentCursor?.id,
    });
  }, [apiFilters, currentCursor, reloadTick]);

  const summaryQuery = useAsync(async () => {
    if (!config.backend.audit) return null;
    return getAuditSummary(summaryFilters);
  }, [summaryFilters, reloadTick]);

  const rawRows = listQuery.data ?? [];
  const rows = rawRows.slice(0, SIZE);
  const hasNext = rawRows.length > SIZE;
  const summary = summaryQuery.data;

  const commitFilters = (next: AuditFormState, nextPreset?: TimePreset) => {
    setForm(next);
    setApplied(next);
    if (nextPreset !== undefined) setPreset(nextPreset);
    setCursors([null]);
    setPage(0);
    setErrs({});
  };

  const apply = () => {
    const e: typeof errs = {};
    const actorTrim = form.actorId.trim();
    const corrTrim = form.correlationId.trim();
    if (actorTrim && !UUID_RE.test(actorTrim)) e.actorId = "Mã tác nhân phải là UUID hợp lệ.";
    if (corrTrim && !UUID_RE.test(corrTrim)) e.correlationId = "Correlation ID phải là UUID hợp lệ.";
    if (form.from && form.to && form.from > form.to) e.range = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
    setErrs(e);
    if (Object.keys(e).length) return;
    commitFilters(
      {
        ...form,
        actorId: actorTrim,
        resourceId: form.resourceId.trim(),
        correlationId: corrTrim,
        action: form.action.trim(),
      },
      !form.from && !form.to && !form.fromIsoOverride ? "ALL" : undefined,
    );
  };

  const reset = () => {
    setShowIdFilters(false);
    commitFilters(EMPTY_FORM, "ALL");
  };

  const applyTimePreset = (nextPreset: TimePreset) => {
    const today = todayKey();
    let patch: Partial<AuditFormState>;
    if (nextPreset === "ALL") {
      patch = { from: "", to: "", fromIsoOverride: "" };
    } else if (nextPreset === "TODAY") {
      patch = { from: today, to: today, fromIsoOverride: "" };
    } else if (nextPreset === "24H") {
      patch = { from: "", to: "", fromIsoOverride: new Date(Date.now() - 86_400_000).toISOString() };
    } else if (nextPreset === "7D") {
      patch = { from: addDays(today, -6), to: today, fromIsoOverride: "" };
    } else {
      patch = { from: addDays(today, -29), to: today, fromIsoOverride: "" };
    }
    commitFilters({ ...applied, ...patch }, nextPreset);
  };

  const toggleNoise = (checked: boolean) => {
    commitFilters({ ...applied, excludeReadNoise: checked });
  };

  const toggleSummaryFilter = (kind: "ALL" | "DENIED" | "ACCESS_CONTROL" | "RECORD_AMENDED") => {
    if (kind === "ALL") {
      commitFilters({ ...applied, result: "", category: "", action: "" });
      return;
    }
    if (kind === "DENIED") {
      const nextResult = applied.result === "DENIED" ? "" : "DENIED";
      commitFilters({ ...applied, result: nextResult, category: "", action: "" });
      return;
    }
    if (kind === "ACCESS_CONTROL") {
      const nextCat = applied.category === "ACCESS_CONTROL" ? "" : "ACCESS_CONTROL";
      commitFilters({ ...applied, result: "", category: nextCat, action: "" });
      return;
    }
    const nextAction = applied.action === "RECORD_AMENDED" ? "" : "RECORD_AMENDED";
    commitFilters({ ...applied, result: "", category: "", action: nextAction });
  };

  const pivotActor = (e: AuditEvent) => {
    if (e.actorType === "SYSTEM" || !e.actorId) {
      commitFilters({ ...applied, actorType: "SYSTEM", actorId: "" });
      toast.success("Đã lọc các sự kiện do Hệ thống thực hiện.");
      return;
    }
    commitFilters({ ...applied, actorId: e.actorId, actorType: "" });
    toast.success(`Đang truy vết tác nhân ${e.actorLabel || formatCompactId(e.actorId)}.`);
  };

  const pivotResource = (resourceId: string) => {
    commitFilters({ ...applied, resourceId });
    toast.success(`Đang truy vết đối tượng ${formatCompactId(resourceId)}.`);
  };

  const pivotCorrelation = (correlationId: string) => {
    commitFilters({ ...applied, correlationId });
    toast.success(`Đang truy vết Correlation ${correlationId.slice(0, 8)}.`);
  };

  const goNext = () => {
    if (!hasNext || rows.length === 0) return;
    const last = rows[rows.length - 1];
    const nextCursor: AuditCursor = { createdAt: last.createdAt, id: last.id };
    setCursors((prev) => {
      const copy = prev.slice(0, page + 1);
      copy.push(nextCursor);
      return copy;
    });
    setPage((p) => p + 1);
  };

  const goPrev = () => {
    if (page <= 0) return;
    setPage((p) => p - 1);
  };

  const goFirst = () => {
    setCursors([null]);
    setPage(0);
    setReloadTick((t) => t + 1);
  };

  const handleRefresh = () => {
    setReloadTick((t) => t + 1);
  };

  const handleExport = async () => {
    if (!config.backend.audit || exporting) return;
    setExporting(true);
    try {
      const res = await exportAuditEvents(apiFilters);
      downloadCsvFile(res.filename, res.csv);
      toast.success(
        res.truncated
          ? `Đã xuất ${res.rowCount.toLocaleString("vi-VN")} dòng (đạt giới hạn an toàn ${res.maxRows.toLocaleString("vi-VN")} dòng). SHA-256: ${res.contentSha256.slice(0, 12)}…`
          : `Đã xuất ${res.rowCount.toLocaleString("vi-VN")} sự kiện kiểm toán (SHA-256: ${res.contentSha256.slice(0, 12)}…).`,
      );
      setReloadTick((t) => t + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const handleVerify = async (maxEvents?: number) => {
    if (!config.backend.audit || verifying) return;
    setVerifying(true);
    try {
      const report = await verifyAuditIntegrity(maxEvents);
      setIntegrity(report);
      if (report.status === "VERIFIED" && report.truncated) {
        toast.success(
          `Đã xác minh ${report.checkedCount.toLocaleString("vi-VN")}/${report.totalChainedCount.toLocaleString("vi-VN")} sự kiện đầu chuỗi (chưa tới đỉnh #${report.headSeq}).`,
        );
      } else if (report.status === "VERIFIED") {
        toast.success(
          `Chuỗi kiểm toán nguyên vẹn: đã xác minh ${report.checkedCount.toLocaleString("vi-VN")} sự kiện nối chuỗi.`,
        );
      } else if (report.status === "LEGACY_ONLY") {
        toast.success("Chưa phát sinh sự kiện nối chuỗi mới; toàn bộ dữ liệu hiện tại thuộc giai đoạn trước V12.");
      } else {
        toast.error(
          `Phát hiện bất thường chuỗi băm tại #${report.firstBrokenSeq ?? "?"}: ${INTEGRITY_REASON_VI[report.mismatchReason ?? ""] ?? report.mismatchReason}`,
        );
      }
      setReloadTick((t) => t + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  const copyValue = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`Đã sao chép ${label}.`);
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000);
    } catch {
      toast.error("Không thể sao chép tự động.");
    }
  };

  const hasActiveFilter = Boolean(
    applied.actorId ||
      applied.resourceId ||
      applied.correlationId ||
      applied.from ||
      applied.to ||
      applied.fromIsoOverride ||
      applied.result ||
      applied.action ||
      applied.category ||
      applied.actorType ||
      applied.excludeReadNoise,
  );
  const hasDraftOrActive = Boolean(
    hasActiveFilter ||
      form.actorId ||
      form.resourceId ||
      form.correlationId ||
      form.from ||
      form.to ||
      form.result ||
      form.action ||
      form.category ||
      form.actorType ||
      form.excludeReadNoise,
  );

  const activeChips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = [];
    if (applied.actorId) {
      list.push({
        key: "actorId",
        label: `Tác nhân: ${formatCompactId(applied.actorId)}`,
        clear: () => commitFilters({ ...applied, actorId: "" }),
      });
    }
    if (applied.actorType) {
      list.push({
        key: "actorType",
        label: `Loại: ${applied.actorType === "SYSTEM" ? "Hệ thống" : "Người dùng"}`,
        clear: () => commitFilters({ ...applied, actorType: "" }),
      });
    }
    if (applied.resourceId) {
      list.push({
        key: "resourceId",
        label: `Đối tượng: ${formatCompactId(applied.resourceId)}`,
        clear: () => commitFilters({ ...applied, resourceId: "" }),
      });
    }
    if (applied.correlationId) {
      list.push({
        key: "correlationId",
        label: `Correlation: ${applied.correlationId.slice(0, 8)}`,
        clear: () => commitFilters({ ...applied, correlationId: "" }),
      });
    }
    if (applied.category) {
      const catLabel = AUDIT_CATEGORY_OPTIONS.find((c) => c.id === applied.category)?.label ?? applied.category;
      list.push({
        key: "category",
        label: `Nhóm: ${catLabel}`,
        clear: () => commitFilters({ ...applied, category: "" }),
      });
    }
    if (applied.action) {
      list.push({
        key: "action",
        label: `Hành động: ${auditActionLabel(applied.action)}`,
        clear: () => commitFilters({ ...applied, action: "" }),
      });
    }
    if (applied.result) {
      list.push({
        key: "result",
        label: `Kết quả: ${AUDIT_RESULT_LABEL[applied.result] ?? applied.result}`,
        clear: () => commitFilters({ ...applied, result: "" }),
      });
    }
    return list;
  }, [applied]);

  const summaryAllActive = !applied.result && !applied.category && !applied.action;
  const summaryDeniedActive = applied.result === "DENIED" && !applied.category && !applied.action;
  const summaryAccessActive = applied.category === "ACCESS_CONTROL" && !applied.result && !applied.action;
  const summaryAmendActive = applied.action === "RECORD_AMENDED" && !applied.result && !applied.category;

  return (
    <>
      <PageHead
        eyebrow="Kiểm toán"
        title="Nhật ký kiểm toán"
        text="Chỉ đọc (append-only), bảo vệ chuỗi băm HMAC-SHA256. Không chứa token, mật khẩu hay nội dung bệnh án."
        actions={
          <div className="audit-tools-wrap" ref={toolsRef}>
            <button
              type="button"
              className={"btn sm" + (toolsOpen ? " soft" : "")}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
              onClick={() => setToolsOpen((v) => !v)}
              disabled={!config.backend.audit}
            >
              <ShieldCheck size={15} aria-hidden /> Tiện ích kiểm toán <ChevronDown size={14} aria-hidden />
            </button>
            {toolsOpen && (
              <div className="audit-tools-menu" role="menu" aria-label="Tiện ích kiểm toán">
                <button
                  type="button"
                  role="menuitem"
                  className="audit-tools-item"
                  disabled={verifying}
                  onClick={() => {
                    setToolsOpen(false);
                    void handleVerify();
                  }}
                >
                  <ShieldCheck size={16} aria-hidden />
                  <span>
                    <b>{verifying ? "Đang kiểm chứng…" : "Kiểm chứng toàn vẹn"}</b>
                    <small>Đối chiếu chuỗi băm HMAC-SHA256 chống sửa đổi</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="audit-tools-item"
                  onClick={() => {
                    setToolsOpen(false);
                    setRetentionOpen(true);
                  }}
                >
                  <Archive size={16} aria-hidden />
                  <span>
                    <b>Chính sách lưu trữ</b>
                    <small>Chu kỳ 365/1.825 ngày &amp; niêm phong lô bất biến</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        }
      />
      <PendingBackend feature="audit" />

      {config.backend.audit && (
        <div className="metrics audit-metrics" role="group" aria-label="Tóm tắt kiểm toán">
          <button
            type="button"
            className={"metric-btn" + (summaryAllActive ? " is-active" : "")}
            aria-pressed={summaryAllActive}
            onClick={() => toggleSummaryFilter("ALL")}
          >
            <Metric
              label="Tổng sự kiện"
              value={summary ? summary.totalEvents.toLocaleString("vi-VN") : "—"}
              hint={
                summary
                  ? `${summary.chainedEvents.toLocaleString("vi-VN")} đã nối chuỗi băm`
                  : "Đang tổng hợp…"
              }
              icon={<Activity size={18} aria-hidden />}
            />
          </button>
          <button
            type="button"
            className={"metric-btn" + (summaryDeniedActive ? " is-active" : "")}
            aria-pressed={summaryDeniedActive}
            onClick={() => toggleSummaryFilter("DENIED")}
          >
            <Metric
              label="Bị từ chối (DENIED)"
              value={summary ? summary.deniedEvents.toLocaleString("vi-VN") : "—"}
              hint="Bấm để lọc truy cập bị chặn"
              tone={summary && summary.deniedEvents > 0 ? "red" : "amber"}
              icon={<ShieldAlert size={18} aria-hidden />}
            />
          </button>
          <button
            type="button"
            className={"metric-btn" + (summaryAccessActive ? " is-active" : "")}
            aria-pressed={summaryAccessActive}
            onClick={() => toggleSummaryFilter("ACCESS_CONTROL")}
          >
            <Metric
              label="Phân quyền & Tài khoản"
              value={summary ? summary.accessControlEvents.toLocaleString("vi-VN") : "—"}
              hint="Đổi quyền, nhân sự, khóa/mở BN"
              tone="purple"
              icon={<UserCog size={18} aria-hidden />}
            />
          </button>
          <button
            type="button"
            className={"metric-btn" + (summaryAmendActive ? " is-active" : "")}
            aria-pressed={summaryAmendActive}
            onClick={() => toggleSummaryFilter("RECORD_AMENDED")}
          >
            <Metric
              label="Sửa đổi bệnh án"
              value={summary ? summary.recordAmendedEvents.toLocaleString("vi-VN") : "—"}
              hint="Bản đính chính RECORD_AMENDED"
              tone="amber"
              icon={<FilePenLine size={18} aria-hidden />}
            />
          </button>
        </div>
      )}

      {integrity && (
        <div style={{ marginBottom: 14 }}>
          <Notice
            tone={
              integrity.status === "TAMPERED"
                ? "error"
                : integrity.truncated
                  ? "warn"
                  : integrity.status === "VERIFIED"
                    ? "ok"
                    : "info"
            }
            actions={
              <div className="row" style={{ gap: 6 }}>
                {integrity.truncated && integrity.checkedCount < 50_000 && (
                  <button
                    type="button"
                    className="btn sm"
                    disabled={verifying}
                    onClick={() => void handleVerify(50_000)}
                  >
                    <ShieldCheck size={14} aria-hidden /> Kiểm chứng sâu hơn (50.000)
                  </button>
                )}
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setIntegrity(null)}
                  aria-label="Đóng kết quả kiểm chứng"
                >
                  <X size={14} aria-hidden /> Đóng
                </button>
              </div>
            }
          >
            <div className="audit-integrity-line">
              <Pill
                tone={
                  integrity.truncated
                    ? "wait"
                    : (INTEGRITY_STATUS_LABEL[integrity.status]?.tone ?? "info")
                }
              >
                {integrity.truncated
                  ? "Xác minh một phần (chưa hết chuỗi)"
                  : (INTEGRITY_STATUS_LABEL[integrity.status]?.label ?? integrity.status)}
              </Pill>
              <span>
                Thuật toán <code>{integrity.algorithm}</code> · Đã kiểm chứng{" "}
                <b>{integrity.checkedCount.toLocaleString("vi-VN")}</b> /{" "}
                {integrity.totalChainedCount.toLocaleString("vi-VN")} sự kiện nối chuỗi
                {integrity.legacyUnchainedCount > 0 && (
                  <> · {integrity.legacyUnchainedCount.toLocaleString("vi-VN")} bản ghi lịch sử trước V12</>
                )}
                {integrity.headSeq > 0 && (
                  <>
                    {" "}
                    · Đỉnh chuỗi <code>#{integrity.headSeq}</code> (<code>{integrity.headHash.slice(0, 12)}…</code>)
                  </>
                )}
                {" · "}Lúc {formatDateTimeSec(integrity.verifiedAt)}.
              </span>
            </div>
            {integrity.truncated && (
              <div style={{ marginTop: 6 }}>
                <b>Lưu ý phạm vi kiểm chứng:</b> Mới đối chiếu {integrity.checkedCount.toLocaleString("vi-VN")} bản ghi
                đầu tiên, chưa chạm tới đỉnh chuỗi <code>#{integrity.headSeq}</code> nên chưa xác nhận toàn vẹn phần đuôi.
              </div>
            )}
            {integrity.mismatchReason && (
              <div style={{ marginTop: 6 }}>
                <b>Chi tiết bất thường:</b>{" "}
                {INTEGRITY_REASON_VI[integrity.mismatchReason] ?? integrity.mismatchReason}{" "}
                {integrity.firstBrokenSeq != null && <>Tại số thứ tự chuỗi <code>#{integrity.firstBrokenSeq}</code>. </>}
                {integrity.firstBrokenEventId && <>Mã sự kiện: <code>{integrity.firstBrokenEventId}</code>.</>}
              </div>
            )}
          </Notice>
        </div>
      )}

      <Panel
        className="audit-panel"
        title="Sự kiện kiểm toán (mới nhất trước)"
        subtitle="Bấm vào dòng để xem đủ UUID và mã băm; bấm vào Tác nhân, Đối tượng hoặc Correlation để truy vết nhanh."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => void handleExport()}
              disabled={!config.backend.audit || exporting}
            >
              <Download size={14} aria-hidden /> {exporting ? "Đang xuất…" : "Xuất CSV"}
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={handleRefresh}
              disabled={!config.backend.audit || listQuery.loading}
            >
              <RefreshCw size={14} aria-hidden /> Làm mới
            </button>
          </div>
        }
      >
        <div className="audit-toolbar">
          <div className="seg" role="group" aria-label="Chọn nhanh mốc thời gian">
            {(
              [
                ["ALL", "Tất cả"],
                ["TODAY", "Hôm nay"],
                ["24H", "24 giờ"],
                ["7D", "7 ngày"],
                ["30D", "30 ngày"],
              ] as [TimePreset, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={preset === id}
                className={preset === id ? "on" : ""}
                onClick={() => applyTimePreset(id)}
                disabled={!config.backend.audit}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="audit-noise-toggle">
            <input
              type="checkbox"
              checked={applied.excludeReadNoise}
              onChange={(e) => toggleNoise(e.target.checked)}
              disabled={!config.backend.audit}
            />
            <span>Ẩn sự kiện đọc thông thường (giữ lại đọc bệnh án &amp; đơn thuốc)</span>
          </label>
        </div>

        <form
          className="audit-filter-stack"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="audit-filters">
            <div className="audit-action-combo" ref={actionComboRef}>
              <input
                className="field audit-action-input"
                aria-label="Hành động (tiếng Việt hoặc mã)"
                placeholder="Hành động (VN hoặc mã, VD: bệnh án, CREATED)…"
                autoComplete="off"
                value={form.action}
                onFocus={() => setActionSuggestOpen(true)}
                onChange={(e) => {
                  setForm({ ...form, action: e.target.value });
                  setActionSuggestOpen(true);
                }}
              />
              {actionSuggestOpen && actionSuggestions.length > 0 && (
                <div className="audit-suggest-list" role="listbox" aria-label="Gợi ý hành động">
                  {actionSuggestions.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      role="option"
                      aria-selected={form.action === item.label || form.action === item.code}
                      className="audit-suggest-item"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, action: item.label });
                        setActionSuggestOpen(false);
                      }}
                    >
                      <b>{item.label}</b>
                      <small className="mono">{item.code}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              className="field"
              aria-label="Nhóm hành động"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as AuditActionCategory | "" })}
            >
              <option value="">Mọi nhóm</option>
              {AUDIT_CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              className="field"
              aria-label="Kết quả"
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
            >
              <option value="">Mọi kết quả</option>
              <option value="SUCCESS">Thành công</option>
              <option value="DENIED">Bị từ chối</option>
              <option value="FAILURE">Thất bại</option>
            </select>

            <select
              className="field"
              aria-label="Loại tác nhân"
              value={form.actorType}
              onChange={(e) => setForm({ ...form, actorType: e.target.value as "USER" | "SYSTEM" | "" })}
            >
              <option value="">Mọi tác nhân</option>
              <option value="USER">Người dùng</option>
              <option value="SYSTEM">Hệ thống</option>
            </select>

            <label className="audit-date">
              <span>Từ</span>
              <input
                className="field"
                aria-label="Từ ngày"
                type="date"
                value={form.from}
                onChange={(e) => {
                  setPreset("CUSTOM");
                  setForm({ ...form, from: e.target.value, fromIsoOverride: "" });
                }}
              />
            </label>
            <label className="audit-date">
              <span>Đến</span>
              <input
                className="field"
                aria-label="Đến ngày"
                type="date"
                value={form.to}
                onChange={(e) => {
                  setPreset("CUSTOM");
                  setForm({ ...form, to: e.target.value, fromIsoOverride: "" });
                }}
              />
            </label>

            <button className="btn sm primary" type="submit" disabled={!config.backend.audit}>
              <Search size={14} aria-hidden /> Lọc
            </button>
            {(() => {
              const idCount = [form.actorId, form.resourceId, form.correlationId].filter((v) => v.trim()).length;
              const idOpen = showIdFilters || idCount > 0 || Boolean(errs.actorId || errs.correlationId);
              return (
                <button
                  type="button"
                  className={"btn sm" + (idOpen ? " soft" : "")}
                  aria-expanded={idOpen}
                  onClick={() => setShowIdFilters((v) => !v)}
                >
                  <Filter size={13} aria-hidden /> Lọc theo mã{idCount > 0 ? ` (${idCount})` : ""}
                </button>
              );
            })()}
            {hasDraftOrActive && (
              <button className="btn sm" type="button" onClick={reset} title="Xóa toàn bộ bộ lọc">
                <RotateCcw size={14} aria-hidden /> Đặt lại
              </button>
            )}
          </div>

          {(showIdFilters ||
            Boolean(form.actorId.trim() || form.resourceId.trim() || form.correlationId.trim()) ||
            Boolean(errs.actorId || errs.correlationId)) && (
            <div className="audit-id-filters">
              <input
                className="field"
                aria-label="Mã tác nhân (UUID)"
                placeholder="Mã tác nhân (UUID 36 ký tự)…"
                value={form.actorId}
                onChange={(e) => setForm({ ...form, actorId: e.target.value })}
              />
              <input
                className="field"
                aria-label="Mã đối tượng"
                placeholder="Mã đối tượng (UUID hoặc tài nguyên)…"
                value={form.resourceId}
                onChange={(e) => setForm({ ...form, resourceId: e.target.value })}
              />
              <input
                className="field"
                aria-label="Correlation ID (UUID)"
                placeholder="Correlation ID (UUID)…"
                value={form.correlationId}
                onChange={(e) => setForm({ ...form, correlationId: e.target.value })}
              />
            </div>
          )}
        </form>

        {activeChips.length > 0 && (
          <div className="audit-active-chips" aria-label="Bộ lọc đang áp dụng">
            <span className="muted" style={{ fontSize: 12.5 }}>
              <Filter size={12} aria-hidden style={{ verticalAlign: "-1px" }} /> Đang lọc:
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="audit-chip"
                onClick={chip.clear}
                title="Bấm để bỏ điều kiện này"
              >
                <span>{chip.label}</span>
                <X size={12} aria-hidden />
              </button>
            ))}
          </div>
        )}

        {(errs.actorId || errs.correlationId || errs.range) && (
          <div style={{ marginBottom: 10 }}>
            <Notice tone="error">{errs.actorId || errs.correlationId || errs.range}</Notice>
          </div>
        )}

        <AsyncBlock
          loading={listQuery.loading && config.backend.audit}
          error={listQuery.error}
          onRetry={handleRefresh}
          empty={config.backend.audit && rows.length === 0}
          emptyTitle="Không có sự kiện phù hợp"
          emptyText={
            hasActiveFilter
              ? "Thử nới rộng khoảng thời gian, bỏ ẩn sự kiện đọc hoặc đặt lại bộ lọc."
              : "Chưa ghi nhận sự kiện kiểm toán nào."
          }
        >
          <div className="tablewrap table-scroll" tabIndex={0} role="region" aria-label="Bảng sự kiện kiểm toán">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Tác nhân</th>
                  <th>Đối tượng</th>
                  <th>Kết quả</th>
                  <th>Correlation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const isSystem = e.actorType === "SYSTEM" || !e.actorId;
                  const highRisk = isHighRiskAuditAction(e.action, e.result);
                  const resCtx = auditResourceContext(e.action, e.resourceId, e.actorId);
                  const isSelf = Boolean(e.actorId && e.resourceId === e.actorId);
                  return (
                    <tr
                      key={e.id}
                      className={"audit-row-clickable" + (e.result === "DENIED" ? " audit-row-warn" : "")}
                      title="Bấm vào dòng để xem chi tiết sự kiện"
                      onClick={() => {
                        if (window.getSelection()?.toString()) return;
                        setDetail(e);
                      }}
                    >
                      <td className="nowrap">
                        <div>{formatDateTimeSec(e.createdAt)}</div>
                        {e.chainSeq != null && (
                          <div className="audit-sub mono" title={`Chuỗi băm #${e.chainSeq}`}>
                            <Lock size={10} aria-hidden /> #{e.chainSeq}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={"audit-action-trigger" + (highRisk ? " is-high" : "")}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDetail(e);
                          }}
                          aria-label={`Xem chi tiết sự kiện ${auditActionLabel(e.action, e.result)}`}
                        >
                          {auditActionLabel(e.action, e.result)}
                        </button>
                        <div className="audit-sub mono">{e.action}</div>
                      </td>
                      <td className="nowrap">
                        <button
                          type="button"
                          className="audit-pivot"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            pivotActor(e);
                          }}
                          title={
                            isSystem
                              ? `Bấm để lọc tác nhân Hệ thống (${e.actorLabel ?? "clinic-background-worker"})`
                              : `Bấm để truy vết tác nhân · UUID: ${e.actorId}`
                          }
                          aria-label={
                            isSystem
                              ? "Lọc theo tác nhân Hệ thống"
                              : `Truy vết tác nhân ${e.actorLabel ?? e.actorId}`
                          }
                        >
                          <span className="audit-actor-top">
                            {isSystem ? (
                              <span className="audit-ctx-tag is-system">Hệ thống</span>
                            ) : (
                              <strong>{e.actorLabel || "Người dùng"}</strong>
                            )}
                          </span>
                          <span className="audit-sub mono">
                            {isSystem ? e.actorLabel || "clinic-background-worker" : formatCompactId(e.actorId)}
                          </span>
                        </button>
                      </td>
                      <td className="nowrap">
                        <button
                          type="button"
                          className="audit-pivot"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            pivotResource(e.resourceId);
                          }}
                          title={`Bấm để truy vết đối tượng · Mã đầy đủ: ${e.resourceId}`}
                          aria-label={`Truy vết đối tượng ${resCtx} ${e.resourceId}`}
                        >
                          <span className={"audit-ctx-tag" + (isSelf ? " is-self" : "")}>{resCtx}</span>
                          <span className="audit-sub mono">{formatCompactId(e.resourceId)}</span>
                        </button>
                      </td>
                      <td className="nowrap">
                        <Pill tone={AUDIT_RESULT_TONE[e.result] ?? "info"}>
                          {AUDIT_RESULT_LABEL[e.result] ?? e.result}
                        </Pill>
                      </td>
                      <td className="nowrap">
                        <button
                          type="button"
                          className="audit-corr-btn mono"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            pivotCorrelation(e.correlationId);
                          }}
                          title={`Bấm để truy vết Correlation ID đầy đủ: ${e.correlationId}`}
                          aria-label={`Truy vết Correlation ID ${e.correlationId.slice(0, 8)}`}
                        >
                          {e.correlationId.slice(0, 8)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row between wrap" style={{ marginTop: 14, gap: 10 }}>
            <span className="muted">
              Hiển thị {rows.length} sự kiện · Trang {page + 1}
              {summary && summaryAllActive ? ` · Tổng ${summary.totalEvents.toLocaleString("vi-VN")} sự kiện` : ""}
              {" · Phân trang con trỏ (ổn định khi tra cứu)"}
            </span>
            <div className="row" style={{ gap: 8 }}>
              {page > 0 && (
                <button type="button" className="btn sm" onClick={goFirst}>
                  Trang đầu
                </button>
              )}
              <button type="button" className="btn sm" disabled={page <= 0} onClick={goPrev}>
                ← Trước
              </button>
              <button type="button" className="btn sm" disabled={!hasNext} onClick={goNext}>
                Sau →
              </button>
            </div>
          </div>
        </AsyncBlock>
      </Panel>

      {detail && (
        <Modal
          title="Chi tiết sự kiện kiểm toán"
          wide
          onClose={() => setDetail(null)}
          footer={
            <button type="button" className="btn" onClick={() => setDetail(null)}>
              Đóng
            </button>
          }
        >
          <dl className="detail audit-detail-list">
            <div>
              <dt>Thời gian</dt>
              <dd>
                <div>{formatDateTimeSec(detail.createdAt)} (Asia/Ho_Chi_Minh)</div>
                <div className="muted mono" style={{ fontSize: 12 }}>
                  UTC: {detail.createdAt}
                </div>
              </dd>
            </div>
            <div>
              <dt>Hành động</dt>
              <dd>
                <div>
                  <b>{auditActionLabel(detail.action, detail.result)}</b>
                </div>
                <div className="muted mono" style={{ fontSize: 12 }}>
                  Mã chuẩn: {detail.action}
                </div>
              </dd>
            </div>
            <div>
              <dt>Kết quả</dt>
              <dd>
                <Pill tone={AUDIT_RESULT_TONE[detail.result] ?? "info"}>
                  {AUDIT_RESULT_LABEL[detail.result] ?? detail.result}
                </Pill>
              </dd>
            </div>
            <div>
              <dt>Mã sự kiện</dt>
              <dd className="audit-copy-row">
                <span className="mono wrap-anywhere">{detail.id}</span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void copyValue("eventId", detail.id, "mã sự kiện")}
                >
                  {copiedKey === "eventId" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                  {copiedKey === "eventId" ? "Đã chép" : "Sao chép"}
                </button>
              </dd>
            </div>
            <div>
              <dt>Tác nhân</dt>
              <dd>
                <div style={{ marginBottom: 4 }}>
                  <Pill tone={detail.actorType === "SYSTEM" || !detail.actorId ? "info" : ""}>
                    {detail.actorType === "SYSTEM" || !detail.actorId ? "Hệ thống" : "Người dùng"}
                  </Pill>{" "}
                  <b>{detail.actorLabel || (detail.actorId ? "—" : "clinic-background-worker")}</b>
                </div>
                {detail.actorId && (
                  <div className="audit-copy-row">
                    <span className="mono wrap-anywhere">{detail.actorId}</span>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => void copyValue("actorId", detail.actorId!, "mã tác nhân")}
                    >
                      {copiedKey === "actorId" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copiedKey === "actorId" ? "Đã chép" : "Sao chép"}
                    </button>
                    <button
                      type="button"
                      className="btn sm soft"
                      onClick={() => {
                        pivotActor(detail);
                        setDetail(null);
                      }}
                    >
                      Truy vết
                    </button>
                  </div>
                )}
              </dd>
            </div>
            <div>
              <dt>Đối tượng</dt>
              <dd>
                <div style={{ marginBottom: 4 }}>
                  <span className="audit-ctx-tag">
                    {auditResourceContext(detail.action, detail.resourceId, detail.actorId)}
                  </span>
                </div>
                <div className="audit-copy-row">
                  <span className="mono wrap-anywhere">{detail.resourceId}</span>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => void copyValue("resourceId", detail.resourceId, "mã đối tượng")}
                  >
                    {copiedKey === "resourceId" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                    {copiedKey === "resourceId" ? "Đã chép" : "Sao chép"}
                  </button>
                  <button
                    type="button"
                    className="btn sm soft"
                    onClick={() => {
                      pivotResource(detail.resourceId);
                      setDetail(null);
                    }}
                  >
                    Truy vết
                  </button>
                </div>
              </dd>
            </div>
            <div>
              <dt>Correlation ID</dt>
              <dd className="audit-copy-row">
                <span className="mono wrap-anywhere">{detail.correlationId}</span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void copyValue("corrId", detail.correlationId, "Correlation ID")}
                >
                  {copiedKey === "corrId" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                  {copiedKey === "corrId" ? "Đã chép" : "Sao chép"}
                </button>
                <button
                  type="button"
                  className="btn sm soft"
                  onClick={() => {
                    pivotCorrelation(detail.correlationId);
                    setDetail(null);
                  }}
                >
                  Truy vết
                </button>
              </dd>
            </div>
            <div>
              <dt>Chuỗi băm toàn vẹn</dt>
              <dd>
                {detail.chainSeq != null && detail.eventHash ? (
                  <div className="stack" style={{ gap: 6 }}>
                    <div>
                      <Pill tone="ok">STT chuỗi #{detail.chainSeq}</Pill>{" "}
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        HMAC-SHA256-CHAIN-V1
                      </span>
                    </div>
                    <div className="audit-copy-row">
                      <span className="muted" style={{ fontSize: 12 }}>
                        event_hash:
                      </span>
                      <span className="mono wrap-anywhere" style={{ fontSize: 12 }}>
                        {detail.eventHash}
                      </span>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => void copyValue("eventHash", detail.eventHash!, "mã băm sự kiện")}
                      >
                        {copiedKey === "eventHash" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                        {copiedKey === "eventHash" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                    {detail.prevHash && (
                      <div className="audit-copy-row">
                        <span className="muted" style={{ fontSize: 12 }}>
                          prev_hash:
                        </span>
                        <span className="mono wrap-anywhere" style={{ fontSize: 12 }}>
                          {detail.prevHash}
                        </span>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => void copyValue("prevHash", detail.prevHash!, "mã băm liền trước")}
                        >
                          {copiedKey === "prevHash" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                          {copiedKey === "prevHash" ? "Đã chép" : "Sao chép"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="muted">Bản ghi lịch sử phát sinh trước khi kích hoạt chuỗi băm (V12).</span>
                )}
              </dd>
            </div>
          </dl>
        </Modal>
      )}

      {retentionOpen && (
        <RetentionModal
          onClose={() => setRetentionOpen(false)}
          onArchived={() => setReloadTick((t) => t + 1)}
        />
      )}
    </>
  );
}

function RetentionModal({ onClose, onArchived }: { onClose: () => void; onArchived: () => void }) {
  const toast = useToast();
  const q = useAsync(getAuditRetention, []);
  const [beforeDate, setBeforeDate] = useState(todayKey());
  const [notes, setNotes] = useState("");
  const [sealing, setSealing] = useState(false);
  const [sealErr, setSealErr] = useState("");
  const [copiedBatch, setCopiedBatch] = useState<string | null>(null);

  const data: AuditRetentionStatus | null = q.data ?? null;

  const copyBatchHash = async (batchId: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedBatch(batchId);
      toast.success("Đã sao chép mã băm lô lưu trữ.");
      window.setTimeout(() => setCopiedBatch((cur) => (cur === batchId ? null : cur)), 2000);
    } catch {
      toast.error("Không thể sao chép tự động.");
    }
  };

  const handleSeal = async () => {
    setSealing(true);
    setSealErr("");
    try {
      const beforeIso = beforeDate ? localToIso(beforeDate, "00:00") : undefined;
      const batch = await createAuditArchiveBatch({
        before: beforeIso,
        notes: notes.trim() || undefined,
      });
      toast.success(
        `Đã niêm phong lô ${batch.eventCount.toLocaleString("vi-VN")} sự kiện (batch_hash: ${batch.batchHash.slice(0, 12)}…).`,
      );
      setNotes("");
      q.reload();
      onArchived();
    } catch (e) {
      setSealErr(errorMessage(e));
    } finally {
      setSealing(false);
    }
  };

  return (
    <Modal
      title="Chính sách lưu trữ & Niêm phong kiểm toán"
      wide
      onClose={onClose}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <AsyncBlock loading={q.loading} error={q.error} onRetry={q.reload}>
        {data && (
          <div className="stack" style={{ gap: 14 }}>
            <Notice tone="info">
              <b>Chính sách lưu trữ áp dụng:</b>{" "}
              {DELETION_POLICY_VI[data.deletionPolicy] ?? data.deletionPolicy}
            </Notice>

            <dl className="detail">
              <div>
                <dt>Lưu trữ trực tuyến (Hot)</dt>
                <dd>
                  <b>{data.hotRetentionDays} ngày</b> (mốc cắt lưu trữ hiện hành: {formatDateTimeSec(data.archiveCutoffAt)})
                </dd>
              </div>
              <div>
                <dt>Lưu trữ dài hạn (Archive)</dt>
                <dd>
                  <b>{data.archiveRetentionDays.toLocaleString("vi-VN")} ngày</b> (~
                  {Math.round(data.archiveRetentionDays / 365)} năm) · Giới hạn xuất CSV:{" "}
                  <b>{data.exportMaxRows.toLocaleString("vi-VN")} dòng/lần</b>
                </dd>
              </div>
              <div>
                <dt>Phạm vi dữ liệu hiện có</dt>
                <dd>
                  <b>{data.totalEvents.toLocaleString("vi-VN")} sự kiện</b>
                  {data.oldestEventAt && data.newestEventAt && (
                    <>
                      {" "}
                      · Từ {formatDateTimeSec(data.oldestEventAt)} đến {formatDateTimeSec(data.newestEventAt)}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Đủ điều kiện đóng gói lưu trữ</dt>
                <dd>
                  <Pill tone={data.eligibleForArchiveCount > 0 ? "wait" : "ok"}>
                    {data.eligibleForArchiveCount.toLocaleString("vi-VN")} sự kiện quá hạn {data.hotRetentionDays} ngày chưa niêm phong
                  </Pill>
                </dd>
              </div>
            </dl>

            <div className="audit-archive-box">
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Niêm phong lô lưu trữ kiểm toán</h3>
              <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
                Tạo bản ghi <code>audit_archive_batch</code> bất biến kèm mã băm <code>batch_hash</code> cho toàn bộ sự kiện chưa niêm phong trước mốc ngày đã chọn (không xóa dữ liệu trong <code>audit_event</code>).
              </p>
              <div className="audit-archive-form">
                <label className="audit-date">
                  <span>Trước 00:00 ngày</span>
                  <input
                    className="field"
                    type="date"
                    aria-label="Mốc ngày niêm phong"
                    max={todayKey()}
                    value={beforeDate}
                    onChange={(e) => setBeforeDate(e.target.value)}
                  />
                </label>
                <input
                  className="field grow"
                  aria-label="Ghi chú lô lưu trữ"
                  placeholder="Ghi chú kỳ lưu trữ (VD: Chốt kỳ kiểm toán tháng 11/2026)…"
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={sealing}
                  onClick={() => void handleSeal()}
                >
                  <Archive size={14} aria-hidden /> {sealing ? "Đang niêm phong…" : "Niêm phong lô"}
                </button>
              </div>
              {sealErr && (
                <div style={{ marginTop: 8 }}>
                  <Notice tone="error">{sealErr}</Notice>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
                Các lô đã niêm phong gần đây ({data.archiveBatchCount})
              </h3>
              {data.recentBatches.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                  Chưa có lô lưu trữ nào được niêm phong.
                </p>
              ) : (
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thời điểm niêm phong</th>
                        <th>Khoảng dữ liệu</th>
                        <th>Số sự kiện</th>
                        <th>Chuỗi #</th>
                        <th>Mã băm lô</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentBatches.map((b) => (
                        <tr key={b.id}>
                          <td className="nowrap">{formatDateTimeSec(b.createdAt)}</td>
                          <td className="nowrap">
                            {formatDateTimeSec(b.fromCreatedAt)} → {formatDateTimeSec(b.toCreatedAt)}
                          </td>
                          <td className="nowrap">{b.eventCount.toLocaleString("vi-VN")}</td>
                          <td className="mono nowrap">
                            {b.firstChainSeq != null && b.lastChainSeq != null
                              ? `#${b.firstChainSeq}–#${b.lastChainSeq}`
                              : "Lịch sử"}
                          </td>
                          <td className="mono nowrap" title={b.batchHash}>
                            <span style={{ marginRight: 6 }}>{b.batchHash.slice(0, 12)}…</span>
                            <button
                              type="button"
                              className="btn sm"
                              style={{ minHeight: 26, padding: "2px 7px", fontSize: 12 }}
                              onClick={() => void copyBatchHash(b.id, b.batchHash)}
                              aria-label={`Sao chép mã băm lô ${b.id.slice(0, 8)}`}
                            >
                              {copiedBatch === b.id ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                            </button>
                          </td>
                          <td>{b.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </AsyncBlock>
    </Modal>
  );
}
