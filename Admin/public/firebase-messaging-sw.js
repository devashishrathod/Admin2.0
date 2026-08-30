// public/firebase-messaging-sw.js

importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js"
);



importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBrxjSu40AuXadpX7je2cBTXMyQOqLGuz4",
  authDomain: "trydood-5b2ec.firebaseapp.com",
  projectId: "trydood-5b2ec",
  storageBucket: "trydood-5b2ec.firebasestorage.app",
  messagingSenderId: "411862718937",
  appId: "1:411862718937:web:6fa2eae3e94b41cddf61c8",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message:",
    payload
  );

  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(
    notification.title || data.title || "TryDood Admin",
    {
      body: notification.body || data.body || "",
      icon: "/vite.svg",
      data,
    }
  );
});