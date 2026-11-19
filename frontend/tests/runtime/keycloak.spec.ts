import { expect, test } from "@playwright/test";

const accounts = {
  patient: "PATIENT",
  doctor: "DOCTOR",
  receptionist: "RECEPTIONIST",
  auditor: "AUDITOR",
  admin: "ADMINISTRATOR",
};

for (const [username, role] of Object.entries(accounts)) {
  test(`đăng nhập Keycloak thật với vai trò ${role}`, async ({ page }) => {
    const password = process.env.CLINIC_QA_DEMO_PASSWORD;
    if (!password) throw new Error("Set CLINIC_QA_DEMO_PASSWORD for the test stack.");

    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
    const [authorize] = await Promise.all([
      page.waitForRequest((request) => new URL(request.url()).pathname.endsWith("/openid-connect/auth")),
      page.goto("/", { waitUntil: "domcontentloaded" }),
    ]);
    const params = new URL(authorize.url()).searchParams;
    expect(params.get("response_type")).toBe("code");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBeTruthy();

    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    const [profile] = await Promise.all([
      page.waitForResponse((response) => new URL(response.url()).pathname === "/api/me/profile"),
      page.locator("#kc-login").click(),
    ]);
    expect(profile.status()).toBe(200);
    expect((await profile.json()).roles).toContain(role);
    await expect(page.locator("main#main-content")).toBeVisible();
  });
}
