import { describe, expect, it } from "vitest";
import { app } from "./index";

const hasInvalidEscape = (sql: string) => {
  const escapeMatches = [...sql.matchAll(/ESCAPE\s+'([^']*)'/g)];
  return escapeMatches.some(([, escapeValue]) => escapeValue.length !== 1);
};

describe("GET /api/search", () => {
  it("returns JSON results for query terms without triggering D1 ESCAPE errors", async () => {
    const env = {
      DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async all() {
                  if (hasInvalidEscape(sql)) {
                    throw new Error("D1_ERROR: ESCAPE expression must be a single character: SQLITE_ERROR");
                  }
                  return { results: [] };
                },
              };
            },
          };
        },
      },
    };

    const response = await app.request("/api/search?query=ma", {}, env as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      query: "ma",
      results: [],
    });
  });
});
