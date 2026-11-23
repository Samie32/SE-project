import { config, type BackendFeature, FEATURE_LABEL } from "./config";

// Access token chỉ sống trong bộ nhớ. Vai trò không bao giờ đọc từ storage.
let tokenGetter: () => string | null = () => null;
export const setTokenGetter = (fn: () => string | null) => {
  tokenGetter = fn;
};

// Cho phép chế độ giả lập thay thế fetch (chỉ được nạp khi VITE_MOCK=true).
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
let fetchImpl: FetchLike = (input, init) => fetch(input, init);
export const setFetchImpl = (fn: FetchLike) => {
  fetchImpl = fn;
};

export const UNAUTHORIZED_EVENT = "clinic:unauthorized";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
  /** Kết quả không xác định (mất mạng / 5xx): có thể gửi lại CÙNG Idempotency-Key. */
  get uncertain() {
    return this.status === 0 || this.status >= 500;
  }
}

/** Ném thay vì gọi endpoint mà backend chưa có. */
export class BackendNotAvailableError extends Error {
  constructor(public feature: BackendFeature) {
    super(
      `Backend chưa triển khai API cho “${FEATURE_LABEL[feature]}”. Giao diện đã sẵn sàng và sẽ hoạt động khi API được bổ sung.`,
    );
    this.name = "BackendNotAvailableError";
  }
}
export function requireBackend(feature: BackendFeature) {
  if (!config.backend[feature]) throw new BackendNotAvailableError(feature);
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Tài khoản không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu (mã không tồn tại hoặc không có quyền truy cập).",
  409: "Dữ liệu đã thay đổi hoặc xung đột. Vui lòng tải lại rồi thử lại.",
  422: "Thông tin chưa đáp ứng điều kiện nghiệp vụ.",
  503: "Dịch vụ lưu trữ tạm thời không khả dụng. Vui lòng thử lại sau.",
};

// ProblemDetail.detail của backend → tiếng Việt.
const DETAIL_MESSAGES: Record<string, string> = {
  "Appointment cannot receive a delay notice": "Lịch hẹn đã qua thời hạn báo chậm hoặc không còn chờ khám.",
  "Invalid estimated appointment time": "Chọn giờ dự kiến sau giờ hiện tại và giờ hẹn, trong cùng ngày.",
  "Delay notice already queued": "Đã có thông báo chậm giờ cho phiên bản lịch hẹn này. Xem trạng thái gửi trong mục Thông báo.",
  "Invalid clinic hours": "Giờ đóng cửa phải sau giờ mở cửa trong cùng ngày.",
  "Clinic hours require seven distinct days": "Cần cung cấp giờ hoạt động cho cả bảy ngày trong tuần.",
  "Clinic hours conflict with an existing shift":
    "Có ca đang diễn ra hoặc sắp tới nằm ngoài giờ hoạt động mới. Hãy xem lịch làm việc bác sĩ trước khi lưu.",
  "Invalid clinic holiday": "Thông tin ngày nghỉ lễ chưa hợp lệ. Hãy kiểm tra tên và khoảng ngày.",
  "Clinic holiday overlaps an existing holiday": "Khoảng ngày nghỉ lễ bị trùng với lịch nghỉ đã có.",
  "Clinic holiday conflicts with an existing shift":
    "Đã có ca làm việc của bác sĩ nằm trong khoảng ngày nghỉ lễ này. Hãy điều chỉnh lịch bác sĩ trước.",
  "Outside clinic hours": "Thời gian đã chọn nằm ngoài giờ hoạt động của phòng khám.",
  "Overlapping time off": "Khoảng nghỉ bị trùng hoặc chồng giờ với lịch nghỉ đã có.",
  "Time off conflicts with appointments":
    "Không thể nghỉ trong khoảng đã có lịch hẹn còn hiệu lực. Hãy xử lý các lịch hẹn bị ảnh hưởng trước.",
  "Time off must be in the future": "Thời gian nghỉ phải bắt đầu ở trong tương lai.",
  "Overlapping availability": "Ca làm việc bị trùng giờ với một ca khác của bác sĩ.",
  "Availability must be in the future": "Ca làm việc phải bắt đầu ở trong tương lai.",
  "Past schedules are retained": "Lịch đã bắt đầu hoặc đã qua, hệ thống giữ lại lịch sử và không cho xóa.",
  "Availability with appointment history cannot be deleted":
    "Không thể xóa ca đã từng có lịch hẹn (kể cả lịch đã hủy).",
  "Doctor inactive": "Bác sĩ hiện đang tạm ngừng nhận lịch.",
  "Slot is no longer in the future": "Khung giờ này đã qua. Vui lòng chọn khung giờ khác.",
  "Slot is outside availability": "Khung giờ không còn thuộc ca làm việc của bác sĩ.",
  "Doctor is unavailable": "Bác sĩ có lịch nghỉ trong khung giờ này. Vui lòng chọn giờ khác.",
  "Appointment is not CONFIRMED": "Lịch hẹn không còn ở trạng thái Đã xác nhận nên không thể thay đổi.",
  "Cancellation reason required": "Vui lòng nhập lý do hủy lịch.",
  "Appointment already uses this slot":
    "Lịch hẹn hiện đã ở đúng khung giờ này. Hãy chọn khung giờ khác để đổi lịch.",
  "Finish the active remote session first":
    "Bạn đang có phiên khám từ xa hoạt động. Hãy kết thúc phiên hiện tại trước khi bắt đầu ca khác.",
  "Finish the active in-person consultation first":
    "Bạn đang có ca khám trực tiếp đang phục vụ. Hãy hoàn tất ca trực tiếp trước khi bắt đầu phiên từ xa.",
  "Finish or skip the current ticket first":
    "Cần hoàn tất hoặc bỏ lượt bệnh nhân đang gọi/đang khám trước khi gọi người tiếp theo.",
  "End the remote session first": "Cần kết thúc phiên khám từ xa trước khi hoàn tất ca khám.",
  "Finalize the medical record first": "Cần hoàn tất hồ sơ bệnh án (FINAL) trước khi hoàn tất ca khám.",
  "Stale appointment version": "Lịch hẹn vừa thay đổi. Vui lòng tải lại rồi thử lại.",
  "Changes require at least two hours notice": "Chỉ được đổi hoặc hủy lịch trước giờ hẹn ít nhất 2 giờ.",
  "Doctor or patient already booked": "Khung giờ đã có người đặt hoặc trùng với lịch hẹn khác của bạn.",
  "Encounter is complete": "Ca khám đã hoàn tất, không thể chỉnh sửa thêm.",
  "Self role changes are not allowed": "Không thể tự thay đổi vai trò của chính mình.",
  "Cannot disable your own account": "Không thể vô hiệu hóa tài khoản của chính mình.",
  "Patient account cannot be enrolled as staff": "Tài khoản này đã thuộc cổng bệnh nhân. Hãy dùng tài khoản nhân sự do phòng khám cấp.",
  "Pause doctor scheduling first": "Hãy ngừng nhận lịch cho bác sĩ ở Danh mục bác sĩ trước khi vô hiệu hóa tài khoản hoặc thu hồi vai trò.",
  "Doctor account must be active and have the doctor role": "Cần kích hoạt tài khoản và cấp vai trò Bác sĩ trước khi bật nhận lịch.",
  "Doctor specialties required": "Chọn ít nhất một chuyên khoa cho bác sĩ.",
  "Staff username or email already exists": "Username hoặc email đã được sử dụng trong Keycloak.",
  "Staff identity details rejected": "Keycloak từ chối thông tin tài khoản. Kiểm tra email và chính sách mật khẩu.",
  "Staff provisioning is not configured": "Máy chủ chưa được cấu hình để tạo tài khoản Keycloak.",
  "Staff identity provider unavailable": "Tạm thời không kết nối được dịch vụ tạo tài khoản. Hãy kiểm tra lại trước khi gửi lại.",
  "Staff identity needs reconciliation": "Việc tạo tài khoản chưa hoàn tất. Quản trị hạ tầng cần kiểm tra Keycloak trước khi thử lại.",
  "Create doctor profile first":
    "Cần tạo hồ sơ bác sĩ cho tài khoản này trước khi gán vai trò DOCTOR.",
  "Invalid roles": "Danh sách vai trò không hợp lệ.",
  "Doctor has active appointments":
    "Bác sĩ còn lịch hẹn hiệu lực nên chưa thể ngừng nhận lịch.",
  "Constraint conflict":
    "Dữ liệu bị trùng hoặc vi phạm ràng buộc (ví dụ: tên chuyên khoa đã tồn tại, tài khoản đã là bác sĩ).",
  "Account disabled": "Tài khoản đã bị vô hiệu hóa.",
  "Insufficient permission": "Tài khoản không có quyền thực hiện thao tác này.",
  "Doctor assignment required": "Bạn không phải bác sĩ phụ trách của dữ liệu này.",
  "Resource not found": "Không tìm thấy dữ liệu (mã không tồn tại hoặc không có quyền truy cập).",
  "Invalid request": "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
  "Invalid pagination": "Tham số phân trang không hợp lệ.",
  "Invalid time range": "Khoảng thời gian không hợp lệ (ngày bắt đầu phải trước ngày kết thúc và không vượt quá hiện tại).",
  "Invalid audit filter": "Bộ lọc kiểm toán chưa hợp lệ. Vui lòng kiểm tra lại.",
  "Invalid export limit": "Giới hạn số dòng xuất CSV không hợp lệ.",
  "No unarchived audit events in selected period": "Không có sự kiện kiểm toán mới nào chưa niêm phong trong giai đoạn đã chọn.",
  "Concurrent modification; retry request": "Dữ liệu vừa được người khác thay đổi. Vui lòng tải lại rồi thử lại.",
  "Storage or audit temporarily unavailable":
    "Dịch vụ lưu trữ/kiểm toán tạm thời không khả dụng. Vui lòng thử lại sau.",
};

async function readDetail(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : undefined;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  idempotencyKey?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  const token = tokenGetter();
  if (token) headers.set("Authorization", "Bearer " + token);
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  let res: Response;
  try {
    res = await fetchImpl("/api" + path, { ...options, headers });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra mạng/backend rồi thử lại.");
  }
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const detail = await readDetail(res);
    const message =
      (detail && DETAIL_MESSAGES[detail]) ||
      STATUS_MESSAGES[res.status] ||
      "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.";
    throw new ApiError(res.status, message, detail);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown, key?: string) =>
    apiFetch<T>(
      path,
      { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) },
      key,
    ),
  put: <T>(path: string, body?: unknown, key?: string) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }, key),
  delete: <T = void>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Mỗi form giữ một runner; timeout/5xx giữ key để gửi lại cùng nội dung. */
export function createCommandRunner() {
  const pending = new Map<string, {fingerprint:string; key:string}>();
  return async function run<T>(operation: string, input: unknown, action: (key:string) => Promise<T>): Promise<T> {
    const fingerprint = JSON.stringify(input);
    let entry = pending.get(operation);
    if (!entry || entry.fingerprint !== fingerprint) {
      entry = {fingerprint, key:newIdempotencyKey()};
      pending.set(operation, entry);
    }
    try {
      const result = await action(entry.key);
      if (pending.get(operation) === entry) pending.delete(operation);
      return result;
    } catch (error) {
      if (!(error instanceof ApiError && error.uncertain) && pending.get(operation) === entry) pending.delete(operation);
      throw error;
    }
  };
}

/**
 * Giữ nguyên khóa cho lần gửi lại GIỐNG HỆT sau lỗi mạng/5xx (không tạo bản ghi mới);
 * đổi nội dung thì sinh khóa mới. Dùng cho đặt/đổi/hủy lịch.
 */
export function mutationKey(
  ref: { current: { fingerprint: string; key: string } | null },
  fingerprint: string,
) {
  if (ref.current?.fingerprint !== fingerprint)
    ref.current = { fingerprint, key: newIdempotencyKey() };
  return ref.current.key;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Đã xảy ra lỗi không xác định.";
}

/** Gắn query string, bỏ giá trị rỗng. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? "?" + s : "";
}
