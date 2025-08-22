// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

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

// Export everything needed
export { auth, db, storage, doc, getDoc, onAuthStateChanged };
