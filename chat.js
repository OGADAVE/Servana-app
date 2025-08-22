import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBo0wT2U4eEbD8uciW9ZBhKN2gDH_846j8",
  authDomain: "servana-59172.firebaseapp.com",
  projectId: "servana-59172",
  storageBucket: "servana-59172.appspot.com",
  messagingSenderId: "371435102114",
  appId: "1:371435102114:web:42d04c1584d55b29b09cfb"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const typingStatus = document.getElementById("typingStatus");
const emojiPicker = document.getElementById("emojiPicker");
const receiverNameEl = document.getElementById("receiverName");
const receiverRoleEl = document.getElementById("receiverRole");
const receiverStatusEl = document.getElementById("receiverStatus");
const receiverAvatarEl = document.getElementById("receiverAvatar");
const scheduleBtn = document.getElementById("scheduleBtn");
const scheduleDate = document.getElementById("scheduleDate");
const scheduleTime = document.getElementById("scheduleTime");

const urlParams = new URLSearchParams(window.location.search);
const receiverId = urlParams.get("to") || "admin";

let currentUser;
let selectedFile = null;

// 🔍 Image preview
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

// 🔐 Auth
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await setDoc(doc(db, "users", user.uid), { status: "online" }, { merge: true });
    loadReceiverInfo();
    startChat();
  } else {
    alert("Please login to chat.");
    window.location.href = "login.html";
  }
});

// 🧑‍🤝‍🧑 Load receiver info
async function loadReceiverInfo() {
  try {
    const receiverRef = doc(db, "users", receiverId);
    const snap = await getDoc(receiverRef);
    if (snap.exists()) {
      const data = snap.data();
      receiverNameEl.textContent = `Chat with ${data.name || "User"}`;
      receiverRoleEl.textContent = `Role: ${data.role || (Array.isArray(data.roles) ? data.roles[0] : "Unknown")}`;
      receiverStatusEl.textContent = `Status: ${data.status || "offline"}`;
      receiverAvatarEl.src = data.avatar || "images/default-avatar.png";
    }
  } catch (error) {
    console.error("Error loading receiver info:", error);
  }
}

// 💬 Start chat
function startChat() {
  const messagesRef = collection(db, "messages");

  onSnapshot(query(messagesRef, orderBy("timestamp")), (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isMine = msg.senderId === currentUser.uid;

      const msgDiv = document.createElement("div");
      msgDiv.className = "message " + (isMine ? "mine" : "other");

      if (!isMine) {
        document.title = "🔔 New message!";
        setTimeout(() => (document.title = "Servana Chat"), 3000);

        if (Notification.permission !== "granted") Notification.requestPermission();
        if (Notification.permission === "granted") {
          new Notification("New message", {
            body: msg.text,
            icon: msg.avatar || "images/Servana logo.png"
          });
        }
      }

      if (msg.imageUrl) {
        const img = document.createElement("img");
        img.src = msg.imageUrl;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "200px";
        msgDiv.appendChild(img);
      }

      if (msg.text) {
        const textNode = document.createElement("div");
        textNode.textContent = msg.text;
        msgDiv.appendChild(textNode);
      }

      const timeDiv = document.createElement("div");
      timeDiv.className = "timestamp";
      timeDiv.textContent = new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString();
      msgDiv.appendChild(timeDiv);

      messagesDiv.appendChild(msgDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      if (!msg.read && msg.receiverId === currentUser.uid) {
        updateDoc(doc(db, "messages", docSnap.id), { read: true });
      }
    });
  });

  sendBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text && !selectedFile) return;

    let imageUrl = "";

    if (selectedFile) {
      const storageRef = ref(storage, `chatImages/${Date.now()}_${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    await addDoc(messagesRef, {
      senderId: currentUser.uid,
      receiverId,
      text,
      imageUrl,
      avatar: "images/Servana logo.png",
      timestamp: serverTimestamp(),
      read: false
    });

    input.value = "";
    fileInput.value = "";
    preview.src = "";
    preview.style.display = "none";
    selectedFile = null;
  };
}

// ✍️ Typing indicator
input.addEventListener("input", () => {
  typingStatus.textContent = input.value ? "You’re typing..." : "";
});

// 😊 Emoji picker
emojiPicker.addEventListener("emoji-click", event => {
  input.value += event.detail.unicode;
});

// ⏎ Enter to send
input.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendBtn.click();
  }
});

// 🌙 Dark mode toggle
window.toggleDarkMode = () => {
  document.body.classList.toggle("dark-mode");
};

// 📅 Schedule button
scheduleBtn.addEventListener("click", () => {
  scheduleDate.style.display = "inline-block";
  scheduleTime.style.display = "inline-block";
});

scheduleTime.addEventListener("change", async () => {
  const date = scheduleDate.value;
  const time = scheduleTime.value;
  if (date && time) {
    const message = `📅 Scheduled for ${date} at ${time}`;
    await addDoc(collection(db, "messages"), {
      senderId: currentUser.uid,
      receiverId,
      text: message,
      avatar: "images/Servana logo.png",
      timestamp: serverTimestamp(),
      read: false
    });
    scheduleDate.style.display = "none";
    scheduleTime.style.display = "none";
  }
});

//