import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";

// Quét từng trang theo vai trò ở chế độ giả lập: lỗi console/JS, tiêu đề, tràn ngang mobile, axe, chặn route trái quyền.
const ROLES: Record<string, { name: string; routes: string[] }> = {
  patient: { name: "Lê Thu Hà", routes: ["/patient", "/patient/booking", "/patient/appointments", "/patient/records", "/patient/telehealth", "/account"] },
  doctor: { name: "Nguyễn Minh Khoa", routes: ["/doctor", "/doctor/schedule", "/doctor/appointments", "/doctor/queue", "/doctor/consultation", "/doctor/telehealth", "/account"] },
  receptionist: { name: "Phạm Lan Anh", routes: ["/staff", "/staff/reception", "/staff/queue", "/staff/notifications", "/account"] },
  admin: { name: "Trần Quản Trị", routes: ["/staff", "/admin/doctors", "/admin/specialties", "/admin/schedules", "/admin/permissions", "/staff/notifications", "/account"] },
  auditor: { name: "Đặng Kiểm Toán", routes: ["/audit", "/account"] },
};
const ALL = ["/patient", "/doctor", "/staff/reception", "/admin/doctors", "/admin/permissions", "/audit"];
const report: Record<string, unknown>[] = [];

async function loginAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.locator("main#main-content")).toBeVisible();
}

for (const [role, cfg] of Object.entries(ROLES)) {
  test.describe(role, () => {
    test(`quét trang: ${role}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
      await loginAs(page, cfg.name);
      for (const route of cfg.routes) {
        for (const vp of [{ width: 1280, height: 800 }, { width: 375, height: 800 }]) {
          errors.length = 0;
          await page.setViewportSize(vp);
          await page.goto(route);
          await page.waitForLoadState("networkidle");
          await expect(page.locator("main#main-content")).toBeVisible();
          const h1 = await page.locator("main h1").first().textContent().catch(() => null);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          const failedAsync = await page.locator(".errbox,[role=alert]").allTextContents();
          const axe = vp.width === 1280 ? await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze() : null;
          report.push({
            role, route, viewport: vp.width, h1, overflowPx: overflow, errors: [...errors], alerts: failedAsync.map((s) => s.trim().slice(0, 120)),
            axe: axe?.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") })) ?? [],
          });
        }
      }
      mkdirSync("test-results", { recursive: true });
      writeFileSync(`test-results/scan-${role}.json`, JSON.stringify(report.filter((r) => r.role === role), null, 1));
    });

    test(`chặn route trái quyền: ${role}`, async ({ page }) => {
      await loginAs(page, cfg.name);
      const denied: string[] = [];
      for (const route of ALL.filter((r) => !cfg.routes.some((c) => c.startsWith(r)))) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        const text = (await page.locator("main#main-content").textContent()) ?? "";
        const sidebar = await page.locator("aside nav").textContent();
        if (!/không có quyền|Không tìm thấy|403|không được phép/i.test(text)) denied.push(`${role} thấy nội dung ${route}: ${text.slice(0, 60)}`);
        void sidebar;
      }
      expect(denied, denied.join("\n")).toEqual([]);
    });
  });
}
