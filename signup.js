// 🔹 Firebase SDK (v9+ modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBo0wT2U4eEbD8uciW9ZBhKN2gDH_846j8",
  authDomain: "servana-59172.firebaseapp.com",
  projectId: "servana-59172",
  storageBucket: "servana-59172.appspot.com",
  messagingSenderId: "371435102114",
  appId: "1:371435102114:web:42d04c1584d55b29b09cfb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// 🔹 Toggle password visibility
window.togglePassword = function(fieldId) {
  const input = document.getElementById(fieldId);
  input.type = input.type === "password" ? "text" : "password";
};

// 🔹 Signup form logic
const form = document.getElementById("signup-form");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullname = document.getElementById("fullname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirm-password").value.trim();

  messageDiv.innerHTML = "";

  if (password !== confirmPassword) {
    messageDiv.innerHTML = `<p class="error">Passwords do not match</p>`;
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save extra user info in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullname,
      phone,
      email,
      createdAt: new Date()
    });

    // Send email verification
    await sendEmailVerification(user);

    messageDiv.innerHTML = `<p class="success">Signup successful! Please check your email for verification.</p>`;
    form.reset();

    // Redirect after signup
    setTimeout(() => {
      window.location.href = "verify.html";
    }, 2000);

  } catch (error) {
    messageDiv.innerHTML = `<p class="error">${error.message}</p>`;
  }
});

