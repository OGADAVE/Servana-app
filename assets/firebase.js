// ═══════════════════════════════════════════════════════
// SERVANA — Shared Firebase Config & Utilities
// ═══════════════════════════════════════════════════════

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ── Firebase init ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBo0wT2U4eEbD8uciW9ZBhKN2gDH_846j8",
  authDomain:        "servana-59172.firebaseapp.com",
  projectId:         "servana-59172",
  storageBucket:     "servana-59172.appspot.com",
  messagingSenderId: "371435102114",
  appId:             "1:371435102114:web:42d04c1584d55b29b09cfb"
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export { app };

// ── Toast ────────────────────────────────────────────────
const ICONS = { success:"✅", error:"❌", warning:"⚠️", info:"ℹ️" };

export function toast(msg, type = "info", ms = 4000) {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${ICONS[type] ?? "ℹ️"}</span><span>${esc(String(msg))}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade-out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, ms);
}

// ── Spinner ──────────────────────────────────────────────
export const showSpinner = () => document.getElementById("spinner-overlay")?.classList.add("active");
export const hideSpinner = () => document.getElementById("spinner-overlay")?.classList.remove("active");

// ── HTML escape ──────────────────────────────────────────
export function esc(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

// ── Format currency ──────────────────────────────────────
export function formatNGN(val) {
  const n = parseFloat(val);
  return isNaN(n) ? "₦0" : "₦" + n.toLocaleString("en-NG");
}

// ── Star rating HTML ─────────────────────────────────────
export function starsHtml(rating) {
  const r = Math.min(5, Math.round(parseFloat(rating || 0)));
  return `<span style="color:${r >= 4 ? "#F59E0B" : "#CBD5E1"};letter-spacing:1px">${"★".repeat(r)}${"☆".repeat(5 - r)}</span>`;
}

// ── Initials from name ───────────────────────────────────
export function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Time-based greeting ──────────────────────────────────
export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ── Generate booking reference ───────────────────────────
export function genRef(prefix = "SRV") {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ── Firebase error → friendly message ───────────────────
export function friendlyError(code) {
  const map = {
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password.",
    "auth/invalid-credential":     "Incorrect email or password.",
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/weak-password":          "Password must be at least 8 characters.",
    "auth/too-many-requests":      "Too many attempts. Please wait a few minutes.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-closed-by-user":   "Sign-in was cancelled.",
    "auth/cancelled-popup-request":null,
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

// ── Button loading state ─────────────────────────────────
export function setLoading(btn, on) {
  btn.disabled = on;
  btn.classList.toggle("loading", on);
}

// ── Valid email check ────────────────────────────────────
export function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}

// ── City list ────────────────────────────────────────────
export const CITIES = [
  "Abuja", "Lagos", "Port Harcourt", "Ibadan",
  "Kano",  "Enugu", "Benin City",    "Kaduna", "Owerri", "Warri"
];

// ── Profile dropdown helper (call after DOM ready) ───────
export function initProfileDropdown() {
  const wrap    = document.getElementById("profileWrap");
  const trigger = document.getElementById("profileTrigger");
  if (!wrap || !trigger) return;

  trigger.addEventListener("click", e => {
    e.stopPropagation();
    const open = wrap.classList.toggle("open");
    trigger.setAttribute("aria-expanded", open);
  });
  document.addEventListener("click", e => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
  trigger.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger.click(); }
    if (e.key === "Escape") { wrap.classList.remove("open"); }
  });
}

// ── Debounce ─────────────────────────────────────────────
export function debounce(fn, ms = 380) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ═══════════════════════════════════════════════════════
// DEFAULT CATEGORIES — 30 services, auto-seeded
// ═══════════════════════════════════════════════════════
import { collection, doc, getDocs, writeBatch, serverTimestamp as _sts }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const DEFAULT_CATEGORIES = [
  { name: "Plumbers",           icon: "🔧", description: "Pipe repairs, installations, leaks"         },
  { name: "Electricians",       icon: "⚡", description: "Wiring, installations, repairs"              },
  { name: "Barbers",            icon: "✂️", description: "Haircuts, shaving, grooming"                 },
  { name: "Hair Stylists",      icon: "💇", description: "Braiding, weaving, styling"                  },
  { name: "Tailors",            icon: "🧵", description: "Sewing, alterations, fashion"                },
  { name: "Dispatch Riders",    icon: "🚴", description: "Package and document delivery"               },
  { name: "Taxi Drivers",       icon: "🚗", description: "Car hire and transport services"             },
  { name: "Home Tutors",        icon: "📚", description: "Lessons for all subjects and ages"           },
  { name: "Cleaners",           icon: "🧹", description: "Home, office and deep cleaning"              },
  { name: "Mechanics",          icon: "🔩", description: "Car repairs and servicing"                   },
  { name: "Painters",           icon: "🎨", description: "Interior and exterior painting"              },
  { name: "Carpenters",         icon: "🪚", description: "Furniture, doors, woodwork"                  },
  { name: "AC Technicians",     icon: "❄️", description: "AC installation, service and repair"         },
  { name: "Makeup Artists",     icon: "💄", description: "Bridal, events and everyday makeup"          },
  { name: "Web Designers",      icon: "💻", description: "Websites, apps and digital services"         },
  { name: "Phone Repair",       icon: "📱", description: "Screen, battery and software fixes"          },
  { name: "Photographers",      icon: "📸", description: "Events, portraits and commercial shoots"     },
  { name: "Event Planners",     icon: "🎉", description: "Weddings, parties, corporate events"         },
  { name: "Caterers",           icon: "🍽️", description: "Food for events, parties and offices"        },
  { name: "Security Guards",    icon: "🛡️", description: "Residential and commercial security"         },
  { name: "Laundry Services",   icon: "👔", description: "Washing, ironing and dry cleaning"           },
  { name: "Interior Designers", icon: "🏠", description: "Home and office decoration"                  },
  { name: "Welders",            icon: "🔥", description: "Metal fabrication and welding"               },
  { name: "Generator Repair",   icon: "⚙️", description: "Generator servicing and repairs"             },
  { name: "Fumigation",         icon: "🌿", description: "Pest control and fumigation"                 },
  { name: "Movers & Packers",   icon: "📦", description: "Relocation and moving services"              },
  { name: "Shoe Repair",        icon: "👞", description: "Cobbling, cleaning and restoration"          },
  { name: "Nurses",             icon: "💊", description: "Home nursing and medical care"               },
  { name: "Music Teachers",     icon: "🎵", description: "Instruments, vocals and music theory"        },
  { name: "Fitness Trainers",   icon: "💪", description: "Personal training and fitness coaching"      },
];

/** Convert category name to a clean Firestore document ID */
export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Seed all default categories into Firestore.
 * Safe to run multiple times — skips existing categories.
 * Uses a batch write so it's a single Firestore operation.
 *
 * @returns {Promise<{ added: number, skipped: number }>}
 */
export async function seedDefaultCategories() {
  // Fetch existing category IDs
  const snap     = await getDocs(collection(db, "category"));
  const existing = new Set(snap.docs.map(d => d.id));

  const toAdd = DEFAULT_CATEGORIES.filter(c => !existing.has(slugify(c.name)));

  if (!toAdd.length) {
    return { added: 0, skipped: existing.size };
  }

  // Batch write — all 30 in one round trip
  const batch = writeBatch(db);
  toAdd.forEach(c => {
    batch.set(doc(db, "category", slugify(c.name)), {
      name:        c.name,
      icon:        c.icon,
      description: c.description || "",
      createdAt:   _sts()
    });
  });

  await batch.commit();
  console.log(`[Servana] Seeded ${toAdd.length} categories. Skipped ${existing.size} existing.`);
  return { added: toAdd.length, skipped: existing.size };
}

/**
 * Ensure a single category exists — called when a provider saves their profile.
 * Creates the category doc only if it doesn't already exist.
 *
 * @param {string} categoryName
 */
export async function ensureCategoryExists(categoryName) {
  if (!categoryName) return;
  const id   = slugify(categoryName);
  const ref  = doc(db, "category", id);
  const snap = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    .then(m => m.getDoc(ref));

  if (!snap.exists()) {
    // Find matching icon from defaults or use generic
    const match = DEFAULT_CATEGORIES.find(
      c => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
      .then(m => m.setDoc(ref, {
        name:        categoryName,
        icon:        match?.icon || "📂",
        description: match?.description || "",
        createdAt:   _sts()
      }));
    console.log(`[Servana] Auto-created category: ${categoryName}`);
  }
}
