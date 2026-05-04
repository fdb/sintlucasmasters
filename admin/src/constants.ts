// Public-facing URL for the R2 bucket bound as `FILES` in the Worker.
// Use this for any client-side link to an object stored in R2 (postcard
// templates, uploaded print images, etc.). The DB stores R2 keys without
// a host; the host lives here.
export const FILES_BASE_URL = "https://files.sintlucasmasters.com";
