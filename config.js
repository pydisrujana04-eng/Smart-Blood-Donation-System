const CONFIG = {

  MAPS_KEY: "AIzaSyC34n3NPq5J0vFKTASU0ACHr74bmzAKYzY",

  // LOCAL NODE SERVER
  BACKEND_URL: "http://localhost:3000",

  FIREBASE: {
    apiKey: "YOUR_REAL_FIREBASE_WEB_API_KEY",
    authDomain: "web-app-8db89.firebaseapp.com",
    projectId: "web-app-8db89",
    storageBucket: "web-app-8db89.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    vapidKey: "YOUR_WEB_PUSH_KEY"
  },

  DEFAULT_LAT: 16.3067,
  DEFAULT_LNG: 80.4365,

  SEARCH_RADIUS_KM: 10,
  EMERGENCY_RADIUS_KM: 10,

  RARE_BLOOD_GROUPS:[
    "A-",
    "B-",
    "AB-",
    "O-"
  ]
};

Object.freeze(CONFIG);
Object.freeze(CONFIG.FIREBASE);