import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordStrengthDiv = document.getElementById("password-strength");
  const signupBtn = document.getElementById("signupBtn");

  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");

  // Password strength checker
  passwordInput.addEventListener("input", () => {
    const strength = checkPasswordStrength(passwordInput.value);
    passwordStrengthDiv.textContent = `Strength: ${strength}`;
  });

  // Form submit
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      showToast("❌ Passwords do not match.", "error");
      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = "Creating Account...";

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: fullName });

      await setDoc(doc(db, "users", user.uid), {
        name: fullName,
        phone: phone,
        email: email,
        role: "seeker",
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      await sendEmailVerification(user);

      showToast("✅ Account created! Please verify your email.", "success");

      setTimeout(() => {
        window.location.href = "verify.html";
      }, 2000);
    } catch (error) {
      console.error(error);
      showToast(`❌ ${error.message}`, "error");
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Sign Up";
    }
  });
});

function checkPasswordStrength(password) {
  let strength = "Weak";
  if (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*]/.test(password)
  ) {
    strength = "Strong";
  } else if (password.length >= 6) {
    strength = "Medium";
  }
  return strength;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
