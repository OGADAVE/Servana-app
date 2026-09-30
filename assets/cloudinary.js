// ═══════════════════════════════════════════════════════
// SERVANA — Cloudinary Upload Utility v2.1
// ═══════════════════════════════════════════════════════

const CLOUD_NAME    = "pgstcx8v";
const UPLOAD_PRESET = "Servana";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload a single file to Cloudinary.
 * Returns the raw secure URL — apply display transforms via optimiseUrl().
 *
 * @param {File}     file
 * @param {object}   options
 * @param {string}   options.folder       - e.g. "servana/users/uid123"
 * @param {Function} options.onProgress   - (percent: number) => void
 * @returns {Promise<string>}             - secure_url from Cloudinary
 */
export async function uploadToCloudinary(file, options = {}) {
  if (!file) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB.");

  const formData = new FormData();
  formData.append("file",          file);
  formData.append("upload_preset", UPLOAD_PRESET);
  // NOTE: Do NOT append "transformation" here.
  // Unsigned presets reject it with HTTP 400.
  // Use optimiseUrl() on the returned URL instead.

  if (options.folder) {
    formData.append("folder", options.folder);
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

/**
 * Upload with XMLHttpRequest for progress tracking
 * @private
 */
function _uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
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

    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled.")));

    xhr.open("POST", CLOUDINARY_URL);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files (e.g. portfolio images)
 *
 * @param {FileList|File[]} files
 * @param {object}          options  - same as uploadToCloudinary
 * @param {Function}        onEach   - called after each: (url, index) => void
 * @returns {Promise<string[]>}
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
 * Optimise a Cloudinary URL with display transforms.
 * @param {string} url        - Raw Cloudinary URL from upload
 * @param {object} transforms
 * @returns {string}          - Optimised URL
 *
 * @example
 * const displayUrl = optimiseUrl(rawUrl, { width: 400, height: 400, crop: "fill" });
 */
export function optimiseUrl(url, transforms = {}) {
  if (!url || !url.includes("cloudinary.com")) return url;
  const {
    width   = 400,
    height  = 400,
    crop    = "fill",
    quality = "auto",
    format  = "auto"
  } = transforms;
  const t = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  return url.replace("/upload/", `/upload/${t}/`);
}

/**
 * Get an avatar-sized URL (200×200, face-cropped)
 */
export function avatarUrl(url) {
  return optimiseUrl(url, { width: 200, height: 200, crop: "thumb", quality: "auto" });
}

/**
 * Get a thumbnail URL
 */
export function thumbnailUrl(url, size = 100) {
  return optimiseUrl(url, { width: size, height: size, crop: "thumb", quality: "auto" });
}

/**
 * Optimized image URL for service/provider listing images
 */
export const serviceImageUrl = (url, width = 800, height = 600) => {
  return optimiseUrl(url, {
    width,
    height,
    crop: "fill"
  });
};

/**
 * Validate a file before uploading
 */
export function validateFile(file, options = {}) {
  const {
    maxSizeMB = 5,
    types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  } = options;

  if (!file) return { valid: false, error: "No file selected." };

  if (!types.some(t =>
    t.endsWith("*")
      ? file.type.startsWith(t.split("*")[0])
      : file.type === t
  )) {
    return { valid: false, error: "Invalid file type. Please select a JPG, PNG, or WebP image." };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `Image must be under ${maxSizeMB}MB. Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB.`
    };
  }

  return { valid: true };
}