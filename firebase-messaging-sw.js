importScripts(
'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js'
);

importScripts(
'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
);



firebase.initializeApp({

apiKey:
"YOUR_REAL_KEY",

authDomain:
"web-app-8db89.firebaseapp.com",

projectId:
"web-app-8db89",

messagingSenderId:
"YOUR_ID",

appId:
"YOUR_APP_ID"

});


const messaging =
firebase.messaging();


messaging.onBackgroundMessage(
(payload)=>{


self.registration.showNotification(

payload.notification.title,

{
body:
payload.notification.body,

icon:"/favicon.ico"

});


});