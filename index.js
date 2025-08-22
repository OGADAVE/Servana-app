import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBo0wT2U4eEbD8uciW9ZBhKN2gDH_846j8",
  authDomain: "servana-59172.firebaseapp.com",
  projectId: "servana-59172",
  storageBucket: "servana-59172.appspot.com",
  messagingSenderId: "371435102114",
  appId: "1:371435102114:web:42d04c1584d55b29b09cfb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loader = document.getElementById("loader");
const mainContent = document.getElementById("main-content");
const newsletterForm = document.getElementById("newsletter-form");

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "../dashboard/dashboard.html"; // ✅ Redirect to dashboard
  } else {
    loader.style.display = "none";
    mainContent.style.display = "block"; // ✅ Show Get Started section
  }
});

// ✅ Fallback in case Firebase hangs
setTimeout(() => {
  if (loader.style.display !== "none") {
    loader.style.display = "none";
    mainContent.style.display = "block";
  }
}, 5000);

if (newsletterForm) {
  newsletterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector("input");
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }

    try {
      await addDoc(collection(db, "newsletter"), {
        email,
        subscribedAt: serverTimestamp()
      });
      alert("✅ Thanks for subscribing to Servana updates!");
      emailInput.value = "";
    } catch (error) {
      console.error("Newsletter error:", error);
      alert("❌ Failed to subscribe. Please try again.");
    }
  });
}
