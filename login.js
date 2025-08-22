import { auth, db } from './firebase.js';
import {
  sendEmailVerification,
  signOut,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// DOM Elements
const form = document.getElementById('login-form');
const loginLoader = document.getElementById('login-loader');
const loginBtn = document.getElementById('login-btn');
const errorMessage = document.getElementById('login-error');
const successMessage = document.getElementById('login-success');
const resendBtn = document.getElementById('resend-verification'); // 👈 NEW

// Helper: Show error
function showError(message) {
  if (errorMessage) {
    errorMessage.innerText = message;
    errorMessage.style.display = "block";
  } else {
    alert(message);
  }
}

// Helper: Clear error
function clearError() {
  if (errorMessage) {
    errorMessage.innerText = "";
    errorMessage.style.display = "none";
  }
}

// Helper: Show success toast
function showSuccess(message) {
  if (successMessage) {
    successMessage.innerText = message;
    successMessage.style.display = "block";
  }
}

// Submit Handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  loginLoader.style.display = "block";
  loginBtn.disabled = true;
  resendBtn.style.display = "none"; // 👈 Hide resend button at login start

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await sendEmailVerification(user)
        .then(() => {
          showError("Your email is not verified. A new verification link has been sent.");
        })
        .catch((error) => {
          console.error("Resend error:", error);
          showError("Could not resend verification email.");
        });

      await signOut(auth);

      // 👉 Show the resend button
      resendBtn.style.display = "inline-block";

      loginLoader.style.display = "none";
      loginBtn.disabled = false;
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      showError("User record not found. Please contact support.");
      loginLoader.style.display = "none";
      loginBtn.disabled = false;
      return;
    }

    const userData = userDoc.data();

    if (!userData.role) {
      showError("No role assigned. Please contact support.");
      loginLoader.style.display = "none";
      loginBtn.disabled = false;
      return;
    }

    // Redirect based on role
    const role = userData.role.toLowerCase();
    let redirectURL;

    if (role === "seeker") {
      redirectURL = "seeker-dashboard.html";
    } else if (role === "provider") {
      redirectURL = "provider.html";
    } else {
      showError("Unknown role. Please contact support.");
      loginLoader.style.display = "none";
      loginBtn.disabled = false;
      return;
    }

    // Success transition
    showSuccess("Login successful! Redirecting...");
    resendBtn.style.display = "none"; // 👈 Hide resend again, just in case
    setTimeout(() => {
      window.location.href = redirectURL;
    }, 1200);

  } catch (error) {
    console.error("Login error:", error.code);
    switch (error.code) {
      case 'auth/user-not-found':
        showError("User not found. Please check your email.");
        break;
      case 'auth/wrong-password':
        showError("Incorrect password.");
        break;
      case 'auth/too-many-requests':
        showError("Too many attempts. Please try again later.");
        break;
      default:
        showError("Login failed: " + error.message);
        break;
    }
    loginLoader.style.display = "none";
    loginBtn.disabled = false;
  }
});

// 👇 Event listener for resend button
resendBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    try {
      await sendEmailVerification(user);
      showError("Verification email sent again. Please check your inbox.");
    } catch (error) {
      console.error("Manual resend error:", error);
      showError("Resend failed. Try logging in again.");
    }
  } else {
    showError("You're either already verified or not signed in.");
  }
});
