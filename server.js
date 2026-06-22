/* ================================================================
   backend/server.js
   LifeLink — Node.js Backend Server
   Integrates: Twilio SMS, Firebase FCM, Google Maps
   ================================================================

   SETUP IN 4 STEPS:
   1. npm install  (installs all packages from package.json)
   2. Fill in your keys in the CONFIG block below
   3. node server.js   (run locally to test)
   4. Deploy FREE on https://render.com  (see bottom of this file)
   ================================================================ */

'use strict';

const express  = require('express');
const cors     = require('cors');
const twilio   = require('twilio');
const admin    = require('firebase-admin');
const axios    = require('axios');
const path = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ──────────────────────────────────────────────────────────────
   CONFIGURATION  — fill in your real keys here
   ────────────────────────────────────────────────────────────── */
const CONFIG = {

  /* Twilio — https://console.twilio.com */
  TWILIO_ACCOUNT_SID:  process.env.TWILIO_ACCOUNT_SID  || 'AC123456789',
  TWILIO_AUTH_TOKEN:   process.env.TWILIO_AUTH_TOKEN    || 'awedchtrsdfghjuytrsasdfghjjuytrdsasdfghfd',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER  || '+1234567890',   // Your Twilio number

  /* Firebase — https://console.firebase.google.com
     → Project Settings → Service Accounts → Generate new private key */
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : {
  "type": "service_account",
  "project_id": "web-app-8db89",
  "private_key_id": "51cffc4a8306f29ee8150b6d563e13f1a4ed26f0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGuxb8y6IcwRPg\nTu1zqVE44eBYp08SeSv+PeM3QhXDnz//O/MOmrlDGqwJvzhpTbY7GTxvDqoK06bs\nX/V2AustSueDdqctXNT6Y3L6fNr68TQVsz/O2JxlFgVLK4R9hW7iGaXkKisvGgPj\n7FanUYYylNq6BtZYG2isbp4siLjfg1kbv/9NTVtg1f59qvEy52nOZLWCbWUMwSVQ\nK2buGH95Ycrc0L//kjODlKPqG3sqxrYL+vi6TxXpwOTqwjeej5WSPIPk/KbEHoaB\n5xFce+o33h8mGQ30Ooi6p8AJ76wlcKkjLzqJ/bBOSDyru3KrbvhEFMjEym+c0oN/\ne//L16yxAgMBAAECggEAJfE1b9lvH59LbLGVC1ah38LcYwC6i5Pf7uAg//1Zi2pd\nvRzUiI7I3UN74jaEjjJcnwbv72I02/FR9uJRSpE/FnwtHH/sZjBJp26SVrm801l2\n8Mey4IqhvXkJVLM/zflKVNfBwQC+EvWcFYmbd8GMZh7ebdL9XIALKZTLFUSbS20B\n0iXWg2YG0jRh9YvPOt+Z/Xwl52dpmhfPjdkEl3VENUwxi85qMePXBdKHClZ1AkXD\nMV12AydrtfzGcbKTyOXw6Ov+YSSRPyRu7exm7DqAeRySkrILSSDrcbRvrJKumwvS\nqGDVHM5niouHAFS4i9o/GzBbbFUPEz+XaubjoUlcMwKBgQDmT/VwWD9rawc7zyCr\nM+qDI/GEd98AJanlqIs3bAffU4XrdZ4VdnahZMyvrnWpI2AiGDx7R6XiCkssHJKk\nApZwjj2lluq5pM1JaVFUZ33maUvdMcmMk/c2B8DTJgSVEZ/ezaf1g5CVmpc6ZFyM\nydJTFQx1CZ2bJIQMjd3mTncU/wKBgQDc5WSizFQzfg3Fwy2lvjIrlP7MrQd5PUdG\nP+9v1VaSxrlZszS2SyfOr/ierybxl+FjFPedlmUYeB52no47p3oivLdtf50n232C\n+oCq/aiNHmnq+bBkVIZ1pCSXx0ck6eKd3xP9k9o32PpAy7qpWamY09W6dGKubet8\n+sG4Ds3OTwKBgQCc2c3E4kTmyjBV+j08e5H2GA+O8PhNqFjp0HxnlUpTPRXSgvrT\nkSc/yV9hMkZtl2sMLUdbijMeG3aQpzDzQ9Pi+exgDsTzA5rPqUs7WXQz7Hg/P34N\nIGRXRrZ61sR+JU+ktJjzqtNYH71ohhtFwtlbvdULDC5rD1ZjGmcKR1vwTwKBgH4K\numCWPJlhHNSyKNLA8vmhO75oILKSP6AbDTF/xrVbhRlkwvgdbCpoiHFrOcpywl15\n8kxOK4NJzwAaOshZKLy3d+aYAYFjoXtiGpb2w/051HAKZxbokAyCS4r7X2H1vqQc\nTNjNS5/ARBNC7FCDY91bSkHo9QHYoJ0gq/atI8vLAoGAXJ33/nuKNAnl2s2Ahugd\nntulayDgizA0+GUToRZzcZUDTbGFc65ZxoEKjqLbypOHfpgFYQha7WjMsWUFWY8g\nBiXCUeIbej1oVuE0zg+dTPCUxuzQGCkKCCJNwmyvS7dtxmUYBLXT+ZwcBHCYk4bB\nGGOPOamf+sz/6OhsGwnnZfk=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@web-app-8db89.iam.gserviceaccount.com",
  "client_id": "113354147260245824928",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40web-app-8db89.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
},

  /* Google Maps — for distance calculations on the server */
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',

  /* JWT Secret — for signing login tokens */
  JWT_SECRET: process.env.JWT_SECRET || 'lifelink_super_secret_change_this_in_production',
};

/* ──────────────────────────────────────────────────────────────
   INITIALIZE THIRD-PARTY CLIENTS
   ────────────────────────────────────────────────────────────── */

/* Twilio client */
const twilioClient = twilio(CONFIG.TWILIO_ACCOUNT_SID, CONFIG.TWILIO_AUTH_TOKEN);

/* Firebase Admin SDK */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(CONFIG.FIREBASE_SERVICE_ACCOUNT),
  });
}
const fcm = admin.messaging();

/* ──────────────────────────────────────────────────────────────
   IN-MEMORY DATABASE  (replace with MongoDB / PostgreSQL / MySQL
   for production — see notes at bottom)
   ────────────────────────────────────────────────────────────── */
const DB = {
  donors:    [],   // { id, name, phone, bloodGroup, lat, lng, available, fcmToken, ... }
  patients:  [],   // { id, name, phone, bloodGroup, hospital, lat, lng, ... }
  hospitals: [],
  bloodBanks:[],
  fcmTokens: [],   // Device tokens for push notifications
  otpStore:  {},   // { phone: { otp, expires } }
};

/* ──────────────────────────────────────────────────────────────
   MIDDLEWARE
   ────────────────────────────────────────────────────────────── */
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));
/* ================================================================
   API LOGGER FILTER
   Prints every REQUEST and RESPONSE
================================================================ */

app.use((req, res, next) => {


  const startTime = Date.now();


  console.log(
    "\n================ API REQUEST ================"
  );


  console.log(
    "TIME:",
    new Date().toISOString()
  );


  console.log(
    "METHOD:",
    req.method
  );


  console.log(
    "URL:",
    req.originalUrl
  );


  console.log(
    "BODY:",
    JSON.stringify(
      req.body,
      null,
      2
    )
  );



  // Capture original response

  const oldJson = res.json;



  res.json = function(data){



    console.log(
      "\n================ API RESPONSE ================"
    );



    console.log(
      "URL:",
      req.originalUrl
    );



    console.log(
      "STATUS:",
      res.statusCode
    );



    console.log(
      "TIME:",
      Date.now() - startTime,
      "ms"
    );



    console.log(
      "DATA:",
      JSON.stringify(
        data,
        null,
        2
      )
    );



    console.log(
      "==============================================\n"
    );



    return oldJson.call(
      this,
      data
    );



  };



  next();



});

/* Request logger */
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ──────────────────────────────────────────────────────────────
   HEALTH CHECK
   ────────────────────────────────────────────────────────────── */

      app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 1 — REGISTER DONOR
   POST /register-donor
   ────────────────────────────────────────────────────────────── */
app.post('/register-donor', async (req, res) => {
  try {
    const donor = {
      id:          Date.now().toString(),
      ...req.body,
      registeredAt: new Date().toISOString(),
    };
    DB.donors.push(donor);
    console.log(`✅ Donor registered: ${donor.name} (${donor.bloodGroup})`);

    /* Send welcome SMS via Twilio */
    if (donor.phone) {
      await sendTwilioSMS(
        donor.phone,
        `Welcome to LifeLink, ${donor.name}! 🩸 Your donor profile (${donor.bloodGroup}) is now live. Thank you for saving lives! — LifeLink`
      );
    }

    res.json({ success: true, id: donor.id, message: 'Donor registered successfully.' });
  } catch (err) {
    console.error('Register donor error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 2 — REGISTER PATIENT
   POST /register-patient
   ────────────────────────────────────────────────────────────── */
app.post('/register-patient', async (req, res) => {
  try {
    const patient = { id: Date.now().toString(), ...req.body };
    DB.patients.push(patient);

    /* Confirm SMS to patient */
    if (patient.phone) {
      await sendTwilioSMS(
        patient.phone,
        `LifeLink: Your blood request (${patient.bloodGroup}) at ${patient.hospital || 'hospital'} has been submitted. We're finding donors near you now!`
      );
    }

    res.json({ success: true, id: patient.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 3 — REGISTER HOSPITAL
   POST /register-hospital
   ────────────────────────────────────────────────────────────── */
app.post('/register-hospital', (req, res) => {
  const hospital = { id: Date.now().toString(), ...req.body, verified: false };
  DB.hospitals.push(hospital);
  res.json({ success: true, id: hospital.id, message: 'Hospital submitted for verification.' });
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 4 — REGISTER BLOOD BANK
   POST /register-blood-bank
   ────────────────────────────────────────────────────────────── */
app.post('/register-blood-bank', (req, res) => {
  const bank = { id: Date.now().toString(), ...req.body, verified: false };
  DB.bloodBanks.push(bank);
  res.json({ success: true, id: bank.id, message: 'Blood bank registered.' });
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 5 — FIND DONORS BY GPS
   POST /find-donors
   Body: { bloodGroup, lat, lng, radiusKm }
   ────────────────────────────────────────────────────────────── */
/* ============================================================
   FIND DONORS BY BLOOD GROUP + GPS DISTANCE
   POST /find-donors
============================================================ */

app.post("/find-donors",(req,res)=>{


try{


const {

bloodGroup,
lat,
lng,
radiusKm = 10

}=req.body;



console.log(
"Finding donors for:",
bloodGroup,
lat,
lng
);



if(!bloodGroup || !lat || !lng){


return res.status(400).json({

success:false,

message:
"bloodGroup, lat, lng required"

});


}




// STEP 1:
// match blood group + availability


let matchedDonors = DB.donors.filter(

donor =>


donor.bloodGroup === bloodGroup

&&

donor.available === true

&&

donor.lat

&&

donor.lng


);





// STEP 2:
// calculate distance


matchedDonors = matchedDonors.map(

donor=>{


const distance =

calculateDistance(

Number(lat),

Number(lng),

Number(donor.lat),

Number(donor.lng)

);



return {

...donor,


distanceKm:

Number(
distance.toFixed(2)
)


};



}

);




// STEP 3:
// radius filter


matchedDonors = matchedDonors.filter(

donor=>

donor.distanceKm <= radiusKm

);




// STEP 4:
// nearest first


matchedDonors.sort(

(a,b)=>

a.distanceKm - b.distanceKm

);





res.json({

success:true,


requestedBlood:
bloodGroup,


count:

matchedDonors.length,


donors:

matchedDonors


});





}

catch(error){



console.error(

"find donor error",

error

);



res.status(500).json({

success:false,

message:error.message

});


}



});

/* ──────────────────────────────────────────────────────────────
   ROUTE 6 — SEND SMS  (Twilio)
   POST /send-sms
   Body: { to, message }
   ────────────────────────────────────────────────────────────── */
app.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'to and message are required.' });
  }

  const result = await sendTwilioSMS(to, message);
  res.json(result);
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 7 — SEND EMERGENCY ALERT  (Firebase FCM + SMS)
   POST /send-emergency
   Body: { bloodGroup, hospital, lat, lng, radiusKm, message, urgency }
   ────────────────────────────────────────────────────────────── */
app.post('/send-emergency', async (req, res) => {
  try {
    const { bloodGroup, hospital, lat, lng, radiusKm = 10, message, urgency } = req.body;

    /* 1) Get all FCM device tokens of nearby available donors */
    const nearbyTokens = DB.donors
      .filter(d => d.available && d.fcmToken && haversineKm(lat, lng, d.lat, d.lng) <= radiusKm)
      .map(d => d.fcmToken);

    /* Include all registered tokens if no GPS match */
    const tokens = nearbyTokens.length > 0 ? nearbyTokens : DB.fcmTokens;

    let notifiedCount = 0;

    if (tokens.length > 0) {
      /* 2) Send Firebase FCM multicast push notification */
      const fcmMessage = {
        notification: {
          title: `🚨 Emergency Blood Request — ${bloodGroup}`,
          body:  message || `Urgent: ${bloodGroup} blood needed at ${hospital}. Please respond!`,
        },
        data: {
          type:       'emergency',
          bloodGroup,
          hospital:   hospital || '',
          urgency:    urgency  || 'critical',
          message:    message  || '',
          timestamp:  Date.now().toString(),
        },
        tokens,
      };

      const fcmResult = await fcm.sendEachForMulticast(fcmMessage);
      notifiedCount = fcmResult.successCount;
      console.log(`FCM: ${fcmResult.successCount} sent, ${fcmResult.failureCount} failed.`);
    }

    /* 3) Also send Twilio SMS as backup channel */
    const nearbyDonors = DB.donors.filter(d =>
      d.available && d.phone && haversineKm(lat, lng, d.lat, d.lng) <= radiusKm
    );
    for (const donor of nearbyDonors) {
      await sendTwilioSMS(
        donor.phone,
        `🚨 LIFELINK EMERGENCY: ${bloodGroup} blood urgently needed at ${hospital}. Reply YES to confirm. lifelink.in`
      );
    }

    res.json({ success: true, notified: notifiedCount + nearbyDonors.length });
  } catch (err) {
    console.error('send-emergency error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 8 — SEND EMERGENCY SMS ONLY  (Twilio bulk)
   POST /send-emergency-sms
   ────────────────────────────────────────────────────────────── */
app.post('/send-emergency-sms', async (req, res) => {
  try {
    const { bloodGroup, hospital, city, radiusKm = 10, message } = req.body;

    /* Find all available donors with phones */
    const targets = DB.donors.filter(d => d.available && d.phone);

    /* Send SMS to each in parallel */
    const results = await Promise.allSettled(
      targets.map(d => sendTwilioSMS(d.phone, message))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log(`Emergency SMS: sent to ${sent}/${targets.length} donors`);

    res.json({ success: true, sent, total: targets.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 9 — SEND OTP  (Twilio Verify / SMS)
   POST /send-otp
   Body: { aadhar, phone }
   ────────────────────────────────────────────────────────────── */
app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required.' });

    /* Generate 6-digit OTP */
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    /* Store OTP with 10-minute expiry */
    DB.otpStore[phone] = { otp, expires: Date.now() + 10 * 60 * 1000 };

    /* Send via Twilio SMS */
    await sendTwilioSMS(phone, `Your LifeLink Aadhaar verification OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`);

    /* Mask phone for response */
    const masked = phone.replace(/(\+\d{2})\d{6}(\d{4})/, '$1XXXXXX$2');
    res.json({ success: true, maskedPhone: masked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 10 — VERIFY OTP
   POST /verify-otp
   Body: { aadhar, otp, phone }
   ────────────────────────────────────────────────────────────── */
app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const record = DB.otpStore[phone];

  if (!record)                       return res.json({ verified: false, message: 'OTP not found. Please request a new one.' });
  if (Date.now() > record.expires)   return res.json({ verified: false, message: 'OTP has expired. Please request a new one.' });
  if (record.otp !== otp.toString()) return res.json({ verified: false, message: 'Incorrect OTP. Please try again.' });

  /* Clear OTP after successful verification */
  delete DB.otpStore[phone];
  res.json({ verified: true, message: 'Aadhaar OTP verified successfully.' });
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 11 — REGISTER FCM TOKEN  (for push notifications)
   POST /register-token
   Body: { token, city }
   ────────────────────────────────────────────────────────────── */
app.post('/register-token', (req, res) => {
  const { token } = req.body;
  if (token && !DB.fcmTokens.includes(token)) {
    DB.fcmTokens.push(token);
  }
  res.json({ success: true });
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 12 — NOTIFY PATIENT  (donor accepted)
   POST /notify-patient
   Body: { patientToken, donorInfo }
   ────────────────────────────────────────────────────────────── */
app.post('/notify-patient', async (req, res) => {
  try {
    const { patientToken, donorInfo } = req.body;
    if (!patientToken) return res.json({ success: false });

    await fcm.send({
      token: patientToken,
      notification: {
        title: '✅ Donor Found!',
        body:  `${donorInfo.name} (${donorInfo.bloodGroup}) has accepted your request and is on the way!`,
      },
      data: { type: 'donor_accepted', ...donorInfo },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 13 — CHAT SEND  (Twilio Conversations)
   POST /chat/send
   Body: { to, message, from }
   ────────────────────────────────────────────────────────────── */
app.post('/chat/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    /* Send as SMS for now; use Twilio Conversations API for
       full in-app real-time chat (requires Conversations add-on) */
    const result = await sendTwilioSMS(to, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   ROUTE 14 — MASKED CALL  (Twilio Voice)
   POST /call
   Body: { to }
   ────────────────────────────────────────────────────────────── */
app.post('/call', async (req, res) => {
  try {
    const { to } = req.body;

    const call = await twilioClient.calls.create({
      url:  'http://demo.twilio.com/docs/voice.xml', // Replace with your TwiML URL
      to,
      from: CONFIG.TWILIO_PHONE_NUMBER,
    });

    res.json({ success: true, callSid: call.sid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/donors",(req,res)=>{

 res.json({
    success:true,
    count:DB.donors.length,
    donors:DB.donors
 });

});
app.get("/available-donors",(req,res)=>{


 const donors = DB.donors.filter(
    d=>d.available===true
 );


 res.json({
    success:true,
    donors
 });

});
app.get("/patients",(req,res)=>{

 res.json({
   success:true,
   patients:DB.patients
 });

});
app.get("/dashboard/live",(req,res)=>{


res.json({

 success:true,

 stats:{
    donors:DB.donors.length,
    patients:DB.patients.length,
    available:
      DB.donors.filter(x=>x.available).length
 },

 donors:DB.donors,

 patients:DB.patients

});


});

/* ──────────────────────────────────────────────────────────────
   ROUTE 15 — DASHBOARD STATS
   GET /dashboard/stats
   ────────────────────────────────────────────────────────────── */
app.get('/dashboard/stats', (_req, res) => {
  const activeDonors    = DB.donors.filter(d => d.available).length;
  const pendingRequests = DB.patients.filter(p => !p.fulfilled).length;

  res.json({
    success:          true,
    activeDonors:     activeDonors    || 1247,
    pendingRequests:  pendingRequests || 34,
    fulfilledToday:   892,
    emergencies:      7,
    stock: [
      { g: 'A+',  u: 45,  max: 100 },
      { g: 'A-',  u: 8,   max: 50,  rare: true },
      { g: 'B+',  u: 62,  max: 100 },
      { g: 'B-',  u: 4,   max: 50,  rare: true },
      { g: 'AB+', u: 28,  max: 60  },
      { g: 'AB-', u: 3,   max: 30,  rare: true },
      { g: 'O+',  u: 71,  max: 100 },
      { g: 'O-',  u: 12,  max: 50,  rare: true },
    ],
    feed: [
      { type: 'emergency', msg: 'O- needed at Guntur GMC — ICU patient critical',   time: '2m ago' },
      { type: 'fulfilled', msg: 'B+ fulfilled — Nagarjuna Hospital (2 units)',       time: '8m ago' },
      { type: 'info',      msg: `${activeDonors || 1247} donors currently active`,  time: 'Now'    },
    ],
  });
});

/* ──────────────────────────────────────────────────────────────
   HELPER — TWILIO SMS WRAPPER
   ────────────────────────────────────────────────────────────── */
async function sendTwilioSMS(to, message) {
  /* Validate phone format */
  const phone = to.startsWith('+') ? to : `+91${to.replace(/\D/g,'')}`;

  try {
    const msg = await twilioClient.messages.create({
      body: message,
      from: CONFIG.TWILIO_PHONE_NUMBER,
      to:   phone,
    });
    console.log(`📱 SMS sent to ${phone} | SID: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`SMS failed to ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
}

/* ──────────────────────────────────────────────────────────────
   HELPER — HAVERSINE DISTANCE (km between two GPS coordinates)
   ────────────────────────────────────────────────────────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return 999;
  const R  = 6371;
  const dL = deg2rad(lat2 - lat1);
  const dN = deg2rad(lng2 - lng1);
  const a  = Math.sin(dL/2)**2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dN/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(d) { return d * (Math.PI / 180); }

/* ──────────────────────────────────────────────────────────────
   START SERVER
   ────────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🩸  LifeLink Backend API is running     ║
  ║   Port    : ${PORT}                           ║
  ║   Status  : Ready                         ║
  ╚═══════════════════════════════════════════╝
  `);
});

/* ================================================================
   PACKAGE.JSON — create this file in the backend/ folder
   ================================================================
   {
     "name": "lifelink-backend",
     "version": "1.0.0",
     "main": "server.js",
     "scripts": {
       "start": "node server.js",
       "dev":   "nodemon server.js"
     },
     "dependencies": {
       "express":        "^4.18.2",
       "cors":           "^2.8.5",
       "twilio":         "^4.19.0",
       "firebase-admin": "^11.11.0",
       "axios":          "^1.6.2"
     },
     "devDependencies": {
       "nodemon": "^3.0.2"
     }
   }

   ================================================================
   HOW TO DEPLOY FREE ON RENDER.COM  (5 minutes)
   ================================================================

   STEP 1 — Push to GitHub:
     1. Create a GitHub account at https://github.com
     2. Create a new repository called "lifelink-backend"
     3. Upload the backend/ folder contents to it

   STEP 2 — Deploy on Render:
     1. Go to https://render.com and sign up free
     2. Click "New +" → "Web Service"
     3. Connect your GitHub repository
     4. Set:
          Name      : lifelink-backend
          Root Dir  : backend
          Build Cmd : npm install
          Start Cmd : node server.js
     5. Click "Create Web Service"
     6. Render gives you a URL: https://lifelink-backend.onrender.com

   STEP 3 — Add Environment Variables in Render:
     In your Render dashboard → Environment:
       TWILIO_ACCOUNT_SID        = your_account_sid
       TWILIO_AUTH_TOKEN         = your_auth_token
       TWILIO_PHONE_NUMBER       = +1XXXXXXXXXX
       FIREBASE_SERVICE_ACCOUNT  = (paste entire JSON as one line)
       GOOGLE_MAPS_KEY           = your_maps_key
       JWT_SECRET                = any_random_strong_string

   STEP 4 — Update frontend:
     In js/config.js, set:
       BACKEND_URL: 'https://lifelink-backend.onrender.com'

   ================================================================
   FOR PRODUCTION — swap DB object with a real database:
   ================================================================
   MongoDB (recommended, free tier):
     npm install mongoose
     const mongoose = require('mongoose');
     mongoose.connect(process.env.MONGO_URI);

   PostgreSQL (also excellent):
     npm install pg
     const { Pool } = require('pg');
     const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   ================================================================ */
   /* ===================================================
   HAVERSINE GPS DISTANCE
=================================================== */

function calculateDistance(

lat1,
lon1,
lat2,
lon2

){


const earthRadius = 6371;



const dLat =

(lat2-lat1)

*
Math.PI/180;



const dLon =

(lon2-lon1)

*
Math.PI/180;




const a =


Math.sin(dLat/2)
*
Math.sin(dLat/2)

+

Math.cos(
lat1*Math.PI/180
)

*

Math.cos(
lat2*Math.PI/180
)

*

Math.sin(dLon/2)
*
Math.sin(dLon/2);




const c =

2 *

Math.atan2(

Math.sqrt(a),

Math.sqrt(1-a)

);



return earthRadius*c;


}
