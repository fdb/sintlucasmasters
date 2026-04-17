export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_DIMENSION_PX = 12_000;

/**
 * Rewrite raw Cloudflare/server error messages into user-friendly upload errors.
 */
export function formatUploadError(fileName: string, serverMessage: string, statusCode: number): string {
  if (statusCode === 413 || serverMessage.toLowerCase().includes("too large")) {
    return `"${fileName}" is too large. Maximum file size is ${MAX_FILE_SIZE_MB}MB.`;
  }
  if (serverMessage.includes("dimension") || serverMessage.includes(String(MAX_DIMENSION_PX))) {
    return `"${fileName}" exceeds maximum dimensions (${MAX_DIMENSION_PX.toLocaleString()}px on longest side).`;
  }
  return serverMessage;
}
