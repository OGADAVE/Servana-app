// ═══════════════════════════════════════════════════════
// SERVANA — Cloudinary Upload Utility v2.0
// ═══════════════════════════════════════════════════════

const CLOUD_NAME    = "pgstcx8v";      
const UPLOAD_PRESET = "Servana";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// ── Config validation ─────────────────────────────────
function _checkConfig() {
  if (CLOUD_NAME === "your_cloud_name" || !CLOUD_NAME) {
    throw new Error(
      "CLOUDINARY_NOT_CONFIGURED: Open assets/cloudinary.js and set your CLOUD_NAME. " +
      "Sign up free at cloudinary.com — takes 5 minutes."
    );
  }
}

/**
 * Upload a single file to Cloudinary
 *
 * @param {File}   file
 * @param {object} options
 * @param {string} options.folder          - e.g. "servana/users/uid123"
 * @param {string} options.transformation  - e.g. "w_400,h_400,c_fill,q_auto"
 * @param {Function} options.onProgress    - (percent) => void
 * @returns {Promise<string>}              - secure URL
 */
export async function uploadToCloudinary(file, options = {}) {
  _checkConfig();

  if (!file) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB.");

  const formData = new FormData();
  formData.append("file",           file);
  formData.append("upload_preset",  UPLOAD_PRESET);
  formData.append("resource_type",  "image");

  if (options.folder) {
    formData.append("folder", options.folder);
  }
  if (options.transformation) {
    formData.append("transformation", options.transformation);
  }

  if (options.onProgress) {
    return _uploadWithProgress(formData, options.onProgress);
  }

  const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = err.error?.message || `HTTP ${response.status}`;
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  const data = await response.json();
  return data.secure_url;
}

function _uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || "Upload failed."));
        } catch {
          reject(new Error("Upload failed."));
        }
      }
    });
    xhr.addEventListener("error",  () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort",  () => reject(new Error("Upload was cancelled.")));
    xhr.open("POST", CLOUDINARY_URL);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files (e.g. portfolio)
 */
export async function uploadMultiple(files, options = {}, onEach) {
  const fileArray = Array.from(files);
  const urls = [];
  for (let i = 0; i < fileArray.length; i++) {
    const url = await uploadToCloudinary(fileArray[i], options);
    urls.push(url);
    if (onEach) onEach(url, i);
  }
  return urls;
}

/**
 * Optimise an existing Cloudinary URL with transformations
 */
export function optimiseUrl(url, transforms = {}) {
  if (!url || !url.includes("cloudinary.com")) return url;
  const { width = 400, height = 400, crop = "fill", quality = "auto" } = transforms;
  return url.replace("/upload/", `/upload/w_${width},h_${height},c_${crop},q_${quality},f_auto/`);
}

export const avatarUrl    = url => optimiseUrl(url, { width: 200, height: 200, crop: "thumb" });
export const thumbnailUrl = (url, size = 100) => optimiseUrl(url, { width: size, height: size, crop: "thumb" });

/**
 * Check if Cloudinary is configured
 * Use this to show a helpful message instead of a generic error
 */
export function isCloudinaryConfigured() {
  return CLOUD_NAME !== "your_cloud_name" && !!CLOUD_NAME && !!UPLOAD_PRESET;
}

/**
 * Validate a file before uploading
 */
export function validateFile(file, options = {}) {
  const { maxSizeMB = 5, types = ["image/jpeg","image/png","image/webp","image/gif"] } = options;
  if (!file) return { valid: false, error: "No file selected." };
  if (!types.some(t => t.endsWith("*") ? file.type.startsWith(t.split("*")[0]) : file.type === t)) {
    return { valid: false, error: "Invalid file type. Please select a JPG, PNG, or WebP image." };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image must be under ${maxSizeMB}MB. Yours is ${(file.size/1024/1024).toFixed(1)}MB.` };
  }
  return { valid: true };
}