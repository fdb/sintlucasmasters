import { test, expect } from "@playwright/test";

test.describe("export status API", () => {
  test("returns 200 with expected shape for valid year and program", async ({ request }) => {
    const response = await request.get("/api/admin/export/status?year=2024-2025&program=MA_BK");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("readyForPrint");
    expect(body).toHaveProperty("students");
    expect(typeof body.total).toBe("number");
    expect(typeof body.readyForPrint).toBe("number");
    expect(Array.isArray(body.students)).toBe(true);
  });

  test("returns 400 when year or program is missing", async ({ request }) => {
    const noYear = await request.get("/api/admin/export/status?program=MA_BK");
    expect(noYear.status()).toBe(400);

    const noProgram = await request.get("/api/admin/export/status?year=2024-2025");
    expect(noProgram.status()).toBe(400);
  });
});
