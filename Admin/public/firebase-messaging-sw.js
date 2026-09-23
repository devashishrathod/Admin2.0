// public/firebase-messaging-sw.js

importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js"
);



importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAVM2LU6d14UjvvPtzAiS6mjy-Vf_-mNC4",
  authDomain: "trydood-98ec8.firebaseapp.com",
  projectId: "trydood-98ec8",
  storageBucket: "trydood-98ec8.firebasestorage.app",
  messagingSenderId: "80506698320",
  appId: "1:80506698320:web:a7de177f15f45d69e72f55",
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