// src/integrations/Core.js
// Real Supabase Storage implementation. Drop-in replacement for the Base44 stub.
// Keeps the same API shape: UploadFile({ file }) -> { file_url }.

import { supabase } from "@/lib/supabase";

const BUCKET = "uploads";

function safeSegment(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "file";
}

function buildObjectPath(file, folder) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 10);
  const stamp = `${now.getTime()}-${rand}`;
  const name = safeSegment(file?.name || "file");
  const base = folder ? `${safeSegment(folder)}/${y}/${m}` : `${y}/${m}`;
  return `${base}/${stamp}-${name}`;
}

/**
 * Upload a file to Supabase Storage.
 * @param {{ file: File|Blob, folder?: string, upsert?: boolean }} opts
 * @returns {Promise<{ file_url: string, path: string, name: string, size: number, type: string }>}
 */
export const UploadFile = async ({ file, folder, upsert = false } = {}) => {
  if (!file) throw new Error("UploadFile: no file provided");

  const path = buildObjectPath(file, folder);
  const contentType = file.type || "application/octet-stream";

  const { error: upErr } = await supabase
    .storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert,
      contentType,
    });

  if (upErr) {
    // eslint-disable-next-line no-console
    console.error("[UploadFile] upload failed", upErr);
    throw new Error(`File upload failed: ${upErr.message || upErr}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const file_url = pub?.publicUrl;
  if (!file_url) throw new Error("UploadFile: could not resolve public URL");

  return {
    file_url,
    path,
    name: file.name ?? path.split("/").pop(),
    size: file.size ?? 0,
    type: contentType,
  };
};

/**
 * Placeholder — Base44 used this for server-side OCR/parsing.
 * Not implemented on Supabase yet. Returns a deterministic empty result
 * so callers don't crash; log a warning so the gap is visible.
 */
export const ExtractDataFromUploadedFile = async (_args) => {
  // eslint-disable-next-line no-console
  console.warn("[Core] ExtractDataFromUploadedFile is not implemented on Supabase.");
  return { status: "noop", output: {} };
};
