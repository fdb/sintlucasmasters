import type { FC } from "hono/jsx";

export type VideoProvider = "youtube" | "vimeo";

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
}

export type DescriptionSegment = { type: "text"; content: string } | { type: "video"; video: ParsedVideo };

/**
 * Parse a URL and extract video provider and ID if it's a YouTube or Vimeo URL
 */
export function parseVideoUrl(url: string): ParsedVideo | null {
  // Trim whitespace
  url = url.trim();

  // YouTube patterns
  // youtube.com/watch?v=ID
  // youtu.be/ID
  // youtube.com/embed/ID
  const youtubePatterns = [/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: "youtube", id: match[1] };
    }
  }

  // Vimeo patterns
  // vimeo.com/ID
  // player.vimeo.com/video/ID
  const vimeoPatterns = [/vimeo\.com\/(\d+)/, /player\.vimeo\.com\/video\/(\d+)/];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: "vimeo", id: match[1] };
    }
  }

  return null;
}

/**
 * Generate an embed URL for a parsed video
 * Uses youtube-nocookie.com for YouTube for privacy
 */
export function getEmbedUrl(video: ParsedVideo): string {
  switch (video.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${video.id}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${video.id}`;
  }
}

/**
 * URL regex pattern for finding URLs in text
 */
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

/**
 * Parse description text and split into segments of text and videos
 */
export function parseDescription(text: string): DescriptionSegment[] {
  if (!text) {
    return [];
  }

  const segments: DescriptionSegment[] = [];
  let lastIndex = 0;

  // Find all URLs in the text
  const matches = text.matchAll(URL_PATTERN);

  for (const match of matches) {
    const url = match[0];
    const startIndex = match.index!;

    // Check if this URL is a video
    const video = parseVideoUrl(url);

    if (video) {
      // Add text before this video URL (if any)
      if (startIndex > lastIndex) {
        const textContent = text.slice(lastIndex, startIndex);
        if (textContent) {
          segments.push({ type: "text", content: textContent });
        }
      }

      // Add the video
      segments.push({ type: "video", video });

      lastIndex = startIndex + url.length;
    }
  }

  // Add remaining text after last video (or all text if no videos)
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex);
    if (textContent) {
      segments.push({ type: "text", content: textContent });
    }
  }

  // If no segments were added (empty text or only whitespace), return empty array
  if (segments.length === 0 && text.trim()) {
    return [{ type: "text", content: text }];
  }

  return segments;
}

/**
 * Video embed component
 */
const VideoEmbed: FC<{ video: ParsedVideo }> = ({ video }) => {
  const embedUrl = getEmbedUrl(video);
  const title = video.provider === "youtube" ? "YouTube video player" : "Vimeo video player";

  return (
    <div class="video-embed" data-provider={video.provider}>
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  );
};

/**
 * Rich description component that renders text with embedded videos
 */
export const RichDescription: FC<{ text: string | null | undefined }> = ({ text }) => {
  if (!text) {
    return null;
  }

  const segments = parseDescription(text);

  if (segments.length === 0) {
    return null;
  }

  // If only one text segment with no videos, render as simple paragraph
  if (segments.length === 1 && segments[0].type === "text") {
    return <p class="description">{segments[0].content}</p>;
  }

  return (
    <div class="rich-description">
      {segments.map((segment, index) => {
        if (segment.type === "video") {
          return <VideoEmbed key={index} video={segment.video} />;
        }
        // Render text segments - preserve whitespace with pre-wrap styling
        return <span key={index}>{segment.content}</span>;
      })}
    </div>
  );
};
