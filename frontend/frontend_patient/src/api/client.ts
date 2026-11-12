let token: string | null = null;
export const setToken = (value: string) => {
  token = value;
};
export const clearToken = () => {
  token = null;
};
export const getToken = () => token;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  key?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", "Bearer " + token);
  if (key) headers.set("Idempotency-Key", key);
  let res: Response;
  try {
    res = await fetch("/api" + path, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
    );
  }
  if (!res.ok) {
    if (res.status === 401)
      window.dispatchEvent(new Event("clinic:unauthorized"));
    const messages: Record<number, string> = {
      400: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
      401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      403: "Tài khoản không có quyền thực hiện thao tác này.",
      404: "Không tìm thấy dữ liệu hoặc bạn không được phép truy cập.",
      409: "Lịch hoặc khung giờ đã thay đổi. Vui lòng kiểm tra dữ liệu mới.",
      422: "Thông tin chưa đáp ứng điều kiện nghiệp vụ.",
    };
    throw new ApiError(
      res.status,
      messages[res.status] ||
        "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.",
    );
  }
  const body = await res.text();
  return body ? (JSON.parse(body) as T) : (undefined as T);
}
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown, key?: string) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }, key),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};
