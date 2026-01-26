import { describe, it, expect } from "vitest";
import { parseVideoUrl, getEmbedUrl, parseDescription } from "./video-embed";

describe("parseVideoUrl", () => {
  describe("YouTube URLs", () => {
    it("parses standard youtube.com/watch URLs", () => {
      const result = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    });

    it("parses youtube.com/watch URLs without www", () => {
      const result = parseVideoUrl("https://youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    });

    it("parses youtu.be short URLs", () => {
      const result = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(result).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    });

    it("parses youtube.com/embed URLs", () => {
      const result = parseVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
      expect(result).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    });

    it("parses URLs with additional query parameters", () => {
      const result = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120");
      expect(result).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    });

    it("parses URLs with list parameter", () => {
      const result = parseVideoUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
      );
      expect(result).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    });
  });

  describe("Vimeo URLs", () => {
    it("parses standard vimeo.com URLs", () => {
      const result = parseVideoUrl("https://vimeo.com/123456789");
      expect(result).toEqual({ provider: "vimeo", id: "123456789" });
    });

    it("parses vimeo.com URLs without www", () => {
      const result = parseVideoUrl("https://www.vimeo.com/123456789");
      expect(result).toEqual({ provider: "vimeo", id: "123456789" });
    });

    it("parses player.vimeo.com/video URLs", () => {
      const result = parseVideoUrl("https://player.vimeo.com/video/123456789");
      expect(result).toEqual({ provider: "vimeo", id: "123456789" });
    });

    it("parses Vimeo URLs with query parameters", () => {
      const result = parseVideoUrl("https://vimeo.com/123456789?autoplay=1");
      expect(result).toEqual({ provider: "vimeo", id: "123456789" });
    });
  });

  describe("non-video URLs", () => {
    it("returns null for non-video URLs", () => {
      expect(parseVideoUrl("https://example.com")).toBeNull();
      expect(parseVideoUrl("https://google.com/search?q=test")).toBeNull();
      expect(parseVideoUrl("https://instagram.com/video/12345")).toBeNull();
    });

    it("returns null for invalid URLs", () => {
      expect(parseVideoUrl("not a url")).toBeNull();
      expect(parseVideoUrl("")).toBeNull();
    });

    it("returns null for partial YouTube URLs", () => {
      expect(parseVideoUrl("https://youtube.com")).toBeNull();
      expect(parseVideoUrl("https://youtube.com/watch")).toBeNull();
    });
  });
});

describe("getEmbedUrl", () => {
  it("generates YouTube nocookie embed URL", () => {
    const result = getEmbedUrl({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(result).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("generates Vimeo player embed URL", () => {
    const result = getEmbedUrl({ provider: "vimeo", id: "123456789" });
    expect(result).toBe("https://player.vimeo.com/video/123456789");
  });
});

describe("parseDescription", () => {
  it("returns empty array for null input", () => {
    expect(parseDescription(null as unknown as string)).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    expect(parseDescription(undefined as unknown as string)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseDescription("")).toEqual([]);
  });

  it("returns text-only segment when no videos present", () => {
    const text = "This is a description without any videos.";
    const result = parseDescription(text);
    expect(result).toEqual([{ type: "text", content: text }]);
  });

  it("parses description with single YouTube video", () => {
    const text = "Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const result = parseDescription(text);
    expect(result).toEqual([
      { type: "text", content: "Check out this video: " },
      { type: "video", video: { provider: "youtube", id: "dQw4w9WgXcQ" } },
    ]);
  });

  it("parses description with single Vimeo video", () => {
    const text = "Watch here: https://vimeo.com/123456789";
    const result = parseDescription(text);
    expect(result).toEqual([
      { type: "text", content: "Watch here: " },
      { type: "video", video: { provider: "vimeo", id: "123456789" } },
    ]);
  });

  it("parses description with multiple videos", () => {
    const text = "YouTube: https://www.youtube.com/watch?v=abc123def45 and Vimeo: https://vimeo.com/987654321";
    const result = parseDescription(text);
    expect(result).toEqual([
      { type: "text", content: "YouTube: " },
      { type: "video", video: { provider: "youtube", id: "abc123def45" } },
      { type: "text", content: " and Vimeo: " },
      { type: "video", video: { provider: "vimeo", id: "987654321" } },
    ]);
  });

  it("preserves text before video URL", () => {
    const text = "Before text https://youtube.com/watch?v=dQw4w9WgXcQ";
    const result = parseDescription(text);
    expect(result[0]).toEqual({ type: "text", content: "Before text " });
  });

  it("preserves text after video URL", () => {
    const text = "https://youtube.com/watch?v=dQw4w9WgXcQ after text";
    const result = parseDescription(text);
    expect(result).toEqual([
      { type: "video", video: { provider: "youtube", id: "dQw4w9WgXcQ" } },
      { type: "text", content: " after text" },
    ]);
  });

  it("handles video URL at start of text", () => {
    const text = "https://vimeo.com/123456789 is a great video";
    const result = parseDescription(text);
    expect(result[0]).toEqual({ type: "video", video: { provider: "vimeo", id: "123456789" } });
    expect(result[1]).toEqual({ type: "text", content: " is a great video" });
  });

  it("handles video URL at end of text", () => {
    const text = "Check this out: https://vimeo.com/123456789";
    const result = parseDescription(text);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ type: "video", video: { provider: "vimeo", id: "123456789" } });
  });

  it("preserves line breaks in text", () => {
    const text = "First line\n\nSecond line\nhttps://youtube.com/watch?v=dQw4w9WgXcQ\nThird line";
    const result = parseDescription(text);
    expect(result).toEqual([
      { type: "text", content: "First line\n\nSecond line\n" },
      { type: "video", video: { provider: "youtube", id: "dQw4w9WgXcQ" } },
      { type: "text", content: "\nThird line" },
    ]);
  });

  it("ignores non-video URLs in text", () => {
    const text = "Visit https://example.com and watch https://youtube.com/watch?v=dQw4w9WgXcQ";
    const result = parseDescription(text);
    // The non-video URL should be part of the text segment
    expect(result).toEqual([
      { type: "text", content: "Visit https://example.com and watch " },
      { type: "video", video: { provider: "youtube", id: "dQw4w9WgXcQ" } },
    ]);
  });

  it("handles only video URL (no surrounding text)", () => {
    const text = "https://youtube.com/watch?v=dQw4w9WgXcQ";
    const result = parseDescription(text);
    expect(result).toEqual([{ type: "video", video: { provider: "youtube", id: "dQw4w9WgXcQ" } }]);
  });
});
