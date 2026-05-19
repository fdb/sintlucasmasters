import { describe, expect, it } from "vitest";
import { buildTrajectory } from "./admin-api";

describe("buildTrajectory", () => {
  // BA Photography / BA Visual Arts have no context taxonomy — the schema's
  // `context` column is NULL for them. The postcard trajectory must be the
  // bilingual programme label only (mirroring getProjectMetaLabel).
  it("uses the programme label only for BA_FO with no context", () => {
    expect(buildTrajectory("BA_FO", null)).toBe(
      "Professionele bachelor fotografie / Professional Bachelor Photography"
    );
  });

  it("uses the programme label only for BA_BK with no context", () => {
    expect(buildTrajectory("BA_BK", null)).toBe(
      "Professionele bachelor beeldende kunsten / Professional Bachelor Visual Arts"
    );
  });

  // Regression: existing MA/PREMA postcards keep the capitalised-NL
  // "Programme Context / Context" print convention.
  it("keeps the Master + context format for MA_BK", () => {
    expect(buildTrajectory("MA_BK", "autonomous")).toBe("Master Autonome Context / Autonomous Context");
  });

  it("keeps the Premaster + context format for PREMA_BK", () => {
    expect(buildTrajectory("PREMA_BK", "jewelry")).toBe("Premaster Juwelencontext / Jewelry Context");
  });
});
