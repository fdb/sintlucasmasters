import { describe, expect, it } from "vitest";
import { buildTrajectory, printImagesArchiveBase, buildImageLinkUri } from "./admin-api";

describe("buildImageLinkUri", () => {
  // Regression: commit fbdbb3a stripped the `file:` scheme, emitting bare
  // relative paths. InDesign cannot construct a Link resource from a
  // scheme-less URI, so the Links panel comes up empty and no image is
  // placed. Every URI must carry the `file:` scheme.
  it("prefixes the default folder-relative path with file:", () => {
    expect(buildImageLinkUri("print-images-25-26-BA_FO", "amelie-meurrens.jpg")).toBe(
      "file:print-images-25-26-BA_FO/amelie-meurrens.jpg"
    );
  });

  it("prefixes a flat (no basePath) filename with file:", () => {
    expect(buildImageLinkUri("", "amelie-meurrens.jpg")).toBe("file:amelie-meurrens.jpg");
  });

  it("passes an explicit file: basePath through without double-prefixing", () => {
    expect(buildImageLinkUri("file:/Volumes/werkmapServer/Links", "jan.jpg")).toBe(
      "file:/Volumes/werkmapServer/Links/jan.jpg"
    );
  });
});

describe("printImagesArchiveBase", () => {
  // The postcards-images.idml default basePath and the print-images.zip
  // filename both derive from this — they must never drift per year/program.
  it("matches the ZIP filename stem for year/program", () => {
    expect(printImagesArchiveBase("25-26", "BA_FO")).toBe("print-images-25-26-BA_FO");
    expect(printImagesArchiveBase("24-25", "PREMA_BK")).toBe("print-images-24-25-PREMA_BK");
  });
});

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
