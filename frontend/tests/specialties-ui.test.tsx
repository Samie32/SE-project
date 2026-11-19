import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Doctor, Specialty } from "@/core/types";
import { SpecialtiesPage } from "@/features/admin/Specialties";
import { ToastProvider } from "@/ui";

let specialties: Specialty[];
let doctors: Doctor[];
const reloadDir = vi.fn();

vi.mock("@/core/directory", () => ({
  useDirectory: () => ({
    specialties: specialties.filter(s => s.active),
    doctors,
    loading: false,
    error: "",
    reload: reloadDir,
    doctorName: (id: string) => doctors.find(d => d.id === id)?.displayName ?? "",
    doctorSpecialties: () => "",
  }),
}));

vi.mock("@/api/catalog", () => ({
  listSpecialties: vi.fn(async (includeInactive?: boolean) =>
    structuredClone(includeInactive ? specialties : specialties.filter(s => s.active)),
  ),
  createSpecialty: vi.fn(async (name: string) => {
    const created: Specialty = { id: `spec-${specialties.length + 1}`, name, active: true };
    specialties = [...specialties, created];
    return structuredClone(created);
  }),
  updateSpecialty: vi.fn(async (id: string, body: { name: string; active: boolean }) => {
    specialties = specialties.map(s => (s.id === id ? { ...s, ...body } : s));
    return structuredClone(specialties.find(s => s.id === id)!);
  }),
}));

beforeEach(() => {
  specialties = [
    { id: "s1", name: "Tim mạch", active: true },
    { id: "s2", name: "Da liễu", active: false },
  ];
  doctors = [
    { id: "d1", displayName: "BS. Minh", active: true, specialtyIds: ["s1"], userId: "u1" },
  ];
  reloadDir.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SpecialtiesPage", () => {
  it("hiển thị cả chuyên khoa ngừng hoạt động, lọc được và thêm/sửa qua modal", async () => {
    render(
      <ToastProvider>
        <SpecialtiesPage />
      </ToastProvider>,
    );

    await screen.findByText("Tim mạch");
    expect(screen.getByText("Da liễu")).toBeTruthy();
    expect(screen.getByText("BS. Minh")).toBeTruthy();
    expect(screen.getAllByText("Chưa có bác sĩ").length).toBeGreaterThanOrEqual(2);

    // Thêm chuyên khoa mới
    fireEvent.click(screen.getByRole("button", { name: "Thêm chuyên khoa" }));
    fireEvent.change(screen.getByLabelText(/Tên chuyên khoa/), { target: { value: "Nhi khoa" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => {
      expect(specialties.some(s => s.name === "Nhi khoa" && s.active)).toBe(true);
    });
    await screen.findByText("Đã thêm chuyên khoa.");

    // Sửa chuyên khoa Da liễu -> bật hoạt động lại
    const editButtons = screen.getAllByRole("button", { name: "Sửa" });
    fireEvent.click(editButtons[1]);
    fireEvent.change(screen.getByLabelText(/Tên chuyên khoa/), { target: { value: "Da liễu thẩm mỹ" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => {
      expect(specialties.find(s => s.id === "s2")).toEqual({
        id: "s2",
        name: "Da liễu thẩm mỹ",
        active: true,
      });
    });
    await screen.findByText("Đã cập nhật chuyên khoa.");
  });
});
