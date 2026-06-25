importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCTRt4WAEXFSLOO5BHkbXfisiIVYX_gwLY",
  authDomain: "studio7enterprise-929b3.firebaseapp.com",
  projectId: "studio7enterprise-929b3",
  storageBucket: "studio7enterprise-929b3.firebasestorage.app",
  messagingSenderId: "127576149650",
  appId: "1:127576149650:web:579cbefe0310a4b1a6a04b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png",
  });
});
