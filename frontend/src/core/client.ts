import { config, type BackendFeature, FEATURE_LABEL } from "./config";

// Access token chỉ sống trong bộ nhớ. Vai trò không bao giờ đọc từ storage.
let tokenGetter: () => string | null = () => null;
export const setTokenGetter = (fn: () => string | null) => {
  tokenGetter = fn;
};

// Cho phép bộ kiểm thử và chế độ dev:mock thay thế fetch.
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
  "Self role changes are not allowed": "Không thể tự thay đổi vai trò của chính mình.",
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
export function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? "?" + s : "";
}
