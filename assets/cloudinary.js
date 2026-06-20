// ═══════════════════════════════════════════════════════
// SERVANA — Cloudinary Upload Utility
// Replaces Firebase Storage across all pages
//
// SETUP (one-time in your Cloudinary dashboard):
//   1. Go to Settings → Upload → Upload Presets
//   2. Create a new preset, set Signing Mode = "Unsigned"
//   3. Copy the preset name into UPLOAD_PRESET below
//   4. Copy your Cloud Name from the Dashboard
// ═══════════════════════════════════════════════════════

// ── ✏️  CONFIGURE THESE TWO VALUES ──────────────────────
const CLOUD_NAME    = "your_cloud_name";        // e.g. "servana-app"
const UPLOAD_PRESET = "your_unsigned_preset";   // e.g. "servana_uploads"
// ────────────────────────────────────────────────────────

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload a single file to Cloudinary
 *
 * @param {File}   file          - File object from <input type="file">
 * @param {object} options       - Optional config
 * @param {string} options.folder        - Cloudinary folder (e.g. "users/uid123")
 * @param {string} options.transformation- Transformation string (e.g. "w_400,h_400,c_fill,q_auto")
 * @param {Function} options.onProgress  - Progress callback: (percent: number) => void
 * @returns {Promise<string>}    - Resolves to the secure HTTPS URL
 */
export async function uploadToCloudinary(file, options = {}) {
  if (!file) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported.");
  if (file.size > 10 * 1024 * 1024) throw new Error("File size must be under 10MB.");

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

  // Use XMLHttpRequest for progress tracking
  if (options.onProgress) {
    return uploadWithProgress(formData, options.onProgress);
  }

  // Simple fetch for uploads without progress
  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body:   formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Upload failed.");
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Upload with progress tracking via XMLHttpRequest
 */
function uploadWithProgress(formData, onProgress) {
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

    xhr.addEventListener("error",  () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort",  () => reject(new Error("Upload was cancelled.")));

    xhr.open("POST", CLOUDINARY_URL);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files (e.g. portfolio photos)
 *
 * @param {FileList|File[]} files
 * @param {object}          options   - Same as uploadToCloudinary options
 * @param {Function}        onEach    - Called after each upload: (url, index) => void
 * @returns {Promise<string[]>}       - Array of secure URLs
 */
export async function uploadMultiple(files, options = {}, onEach) {
  const fileArray = Array.from(files);
  const urls      = [];

  for (let i = 0; i < fileArray.length; i++) {
    const url = await uploadToCloudinary(fileArray[i], options);
    urls.push(url);
    if (onEach) onEach(url, i);
  }

  return urls;
}

/**
 * Build an optimised Cloudinary URL from an existing URL
 * (adds transformations: resize, format, quality)
 *
 * @param {string} url           - Existing Cloudinary URL
 * @param {object} transforms    - Transformation options
 * @param {number} transforms.width
 * @param {number} transforms.height
 * @param {string} transforms.crop  - "fill", "thumb", "fit", "scale", "crop"
 * @param {number} transforms.quality - 1–100 or "auto"
 * @returns {string}
 */
export function optimiseUrl(url, transforms = {}) {
  if (!url || !url.includes("cloudinary.com")) return url;

  const { width = 400, height = 400, crop = "fill", quality = "auto" } = transforms;
  const t = `w_${width},h_${height},c_${crop},q_${quality},f_auto`;

  // Insert transformation string into URL path
  return url.replace("/upload/", `/upload/${t}/`);
}

/**
 * Get a thumbnail URL (small, fast-loading preview)
 * @param {string} url  - Full Cloudinary URL
 * @param {number} size - Thumbnail size in px (default 100)
 */
export function thumbnailUrl(url, size = 100) {
  return optimiseUrl(url, { width: size, height: size, crop: "thumb", quality: "auto" });
}

/**
 * Get a profile avatar URL (square, face-cropped)
 * @param {string} url  - Full Cloudinary URL
 */
export function avatarUrl(url) {
  return optimiseUrl(url, { width: 200, height: 200, crop: "thumb", quality: "auto" });
}

// ── Validation helpers ───────────────────────────────────

/**
 * Validate a file before uploading
 * @param {File}   file
 * @param {object} options
 * @param {number} options.maxSizeMB  - Max size in MB (default: 5)
 * @param {string[]} options.types    - Allowed MIME types (default: image/*)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file, options = {}) {
  const { maxSizeMB = 5, types = ["image/jpeg", "image/png", "image/webp", "image/gif"] } = options;

  if (!file) return { valid: false, error: "No file selected." };

  if (!types.some(t => t.endsWith("*") ? file.type.startsWith(t.split("*")[0]) : file.type === t)) {
    return { valid: false, error: `Invalid file type. Allowed: ${types.join(", ")}` };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File must be under ${maxSizeMB}MB. Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB.` };
  }

  return { valid: true };
}

// ── Usage examples (remove in production) ────────────────
/*

BASIC UPLOAD:
  import { uploadToCloudinary } from "./assets/cloudinary.js";
  const url = await uploadToCloudinary(file, { folder: `users/${uid}` });

WITH PROGRESS:
  const url = await uploadToCloudinary(file, {
    folder: `providers/${uid}/portfolio`,
    onProgress: (pct) => console.log(`${pct}%`)
  });

MULTIPLE FILES:
  import { uploadMultiple } from "./assets/cloudinary.js";
  const urls = await uploadMultiple(fileList, { folder: "portfolio" });

OPTIMISE EXISTING URL:
  import { avatarUrl, thumbnailUrl } from "./assets/cloudinary.js";
  img.src = avatarUrl(user.photoURL);

REPLACE Firebase Storage uploadBytes / getDownloadURL with:
  const url = await uploadToCloudinary(file, { folder: `users/${uid}` });
  await updateDoc(doc(db, "users", uid), { photoURL: url });

*/
