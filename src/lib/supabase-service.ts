import { env } from "@/create-env.mjs";
import { createClient } from "@supabase/supabase-js";
import { createLazyResource } from "./utils/lazy-resource";

export const DOCUMENTS_BUCKET = "documents";

const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Service role client for admin operations (file uploads, etc.)
export const supabaseService = createLazyResource(() =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }),
);

export async function getFileBlob(url: string) {
  // if the url starts with "documents/", remove the "documents/"
  if (url.startsWith("documents/")) {
    url = url.slice(10);
  }

  const { data, error } = await supabaseService.storage
    .from(DOCUMENTS_BUCKET)
    .download(url);
  if (error) {
    console.error("Error downloading file from Supabase:", error);
    throw error;
  }
  return data;
}

export async function getUploadUrl(bucketName: string, filePath: string) {
  try {
    const { data, error } = await supabaseService.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("Error getting signed upload URL:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to get signed upload URL:", error);
    throw error;
  }
}

export async function getDownloadUrl(
  filePath: string,
  expiresIn: number = EXPIRES_IN_SECONDS,
) {
  try {
    const pathToFile = filePath.startsWith(DOCUMENTS_BUCKET)
      ? filePath.replace(DOCUMENTS_BUCKET, "")
      : filePath;
    const { data, error } = await supabaseService.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(pathToFile, expiresIn);

    if (error) {
      console.error("Error getting signed download URL:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to get signed download URL:", error);
    throw error;
  }
}

export async function uploadFile(
  filePath: string,
  file: Buffer,
  contentType?: string,
) {
  // Automatically detect content type based on file extension if not provided
  let autoContentType = contentType;

  if (!contentType) {
    if (filePath.endsWith(".pdf")) {
      autoContentType = "application/pdf";
    } else if (filePath.endsWith(".zip")) {
      autoContentType = "application/zip";
    } else if (filePath.endsWith(".docx")) {
      autoContentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (filePath.endsWith(".txt")) {
      autoContentType = "text/plain";
    }
  }

  const { data, error } = await supabaseService.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      upsert: true,
      contentType: autoContentType,
    });

  if (error) {
    console.error("Error uploading file to Supabase:", error);
    throw error;
  }

  return data;
}

export async function deleteFile(filePath: string) {
  const { data, error } = await supabaseService.storage
    .from(DOCUMENTS_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Error deleting file from Supabase:", error);
    throw error;
  }

  return data;
}
