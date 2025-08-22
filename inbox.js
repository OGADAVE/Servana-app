import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase config
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

let currentUser;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadInbox();
  } else {
    alert("Please login to view your inbox.");
    window.location.href = "login.html";
  }
});

async function loadInbox() {
  const messagesRef = collection(db, "messages");
  const q = query(messagesRef, orderBy("timestamp"));
  const snapshot = await getDocs(q);

  const inboxMap = new Map();

  snapshot.forEach(docSnap => {
    const msg = docSnap.data();
    const otherUser = msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId;

    const time = msg.timestamp?.seconds
      ? new Date(msg.timestamp.seconds * 1000).toLocaleString()
      : "Unknown time";

    if (!inboxMap.has(otherUser)) {
      inboxMap.set(otherUser, {
        unread: 0,
        lastMessage: msg.text || "📷 Image",
        timestamp: time
      });
    }

    // Update if newer message
    const existing = inboxMap.get(otherUser);
    const existingTime = new Date(existing.timestamp).getTime();
    const msgTime = msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : 0;

    if (msgTime > existingTime) {
      existing.lastMessage = msg.text || "📷 Image";
      existing.timestamp = time;
    }

    if (!msg.read && msg.receiverId === currentUser.uid) {
      existing.unread += 1;
    }
  });

  renderInbox(inboxMap);
}

function renderInbox(inboxMap) {
  const inboxDiv = document.getElementById("inbox");
  inboxDiv.innerHTML = "";

  inboxMap.forEach((data, userId) => {
    const item = document.createElement("div");
    item.className = "inbox-item";
    item.innerHTML = `
      <strong>${userId}</strong><br>
      ${data.lastMessage}<br>
      <small>${data.timestamp}</small><br>
      <span class="unread-count">${data.unread} unread</span>
    `;
    item.onclick = () => {
      window.location.href = `chat.html?to=${userId}`;
    };
    inboxDiv.appendChild(item);
  });
}
