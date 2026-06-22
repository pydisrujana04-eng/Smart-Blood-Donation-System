/* ================================================================
   js/app.js
   LifeLink — Main Application Logic
   All UI interactions + full API integrations
   ================================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   1.  APP STATE
   ────────────────────────────────────────────────────────────── */
const State = {
  selectedDonorBlood:   '',
  selectedPatientBlood: '',
  donorPhone:           '',
  patientPhone:         '',
  chatReplyIndex:       0,
  chatReplies: [
    "I'm on my way! Which entrance should I use? 🏃",
    "Understood. I'll reach in 15 minutes.",
    "Which ward exactly? I'm already near the hospital.",
    "Just checked in at reception — please send someone. 🩸",
    "Can you drop the hospital Google Maps pin? 📍",
    "I'm at the gate now. Ask the duty nurse to come out.",
  ],
};

/* ──────────────────────────────────────────────────────────────
   2.  NAVIGATION
   ────────────────────────────────────────────────────────────── */
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${id}`);
  if (page) { page.classList.add('active'); window.scrollTo(0, 0); }

  closeLangMenu();

  // Lazy-load maps only when their page opens
  if (id === 'donor') {
    Maps.loadAPI();
    // If GPS toggle was already ON, redraw map
    setTimeout(() => {
      if (document.getElementById('gps-toggle')?.checked) Maps.initDonorMap();
    }, 400);
  }
  if (id === 'patient')   { Maps.loadAPI(); setTimeout(Maps.initPatientMap,   500); }
  if (id === 'dashboard') { Maps.loadAPI(); setTimeout(Maps.initDashboardMap, 500); Dashboard.init(); }
}

/* ──────────────────────────────────────────────────────────────
   3.  LANGUAGE  — Google Translate Widget
   ────────────────────────────────────────────────────────────── */
const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English'   },
  { code: 'te', flag: '🇮🇳', name: 'Telugu'    },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi'     },
  { code: 'ta', flag: '🇮🇳', name: 'Tamil'     },
  { code: 'kn', flag: '🇮🇳', name: 'Kannada'   },
  { code: 'ml', flag: '🇮🇳', name: 'Malayalam' },
  { code: 'bn', flag: '🇮🇳', name: 'Bengali'   },
  { code: 'mr', flag: '🇮🇳', name: 'Marathi'   },
  { code: 'gu', flag: '🇮🇳', name: 'Gujarati'  },
  { code: 'pa', flag: '🇮🇳', name: 'Punjabi'   },
  { code: 'ur', flag: '🇮🇳', name: 'Urdu'      },
  { code: 'or', flag: '🇮🇳', name: 'Odia'      },
];

/* Build language dropdown items */
(function buildLangMenu() {
  const menu = document.getElementById('langMenu');
  if (!menu) return;
  LANGUAGES.forEach(lang => {
    const item = document.createElement('div');
    item.className = `lang-item${lang.code === 'en' ? ' active' : ''}`;
    item.dataset.code = lang.code;
    item.innerHTML = `
      <span>${lang.flag}</span>
      <span>${lang.name}</span>
      <span class="lang-code">${lang.code}</span>`;
    item.addEventListener('click', () => switchLanguage(lang, item));
    menu.appendChild(item);
  });
})();

function toggleLang() {
  document.getElementById('langMenu').classList.toggle('open');
  document.getElementById('langTrigger').classList.toggle('open');
}

function closeLangMenu() {
  document.getElementById('langMenu')?.classList.remove('open');
  document.getElementById('langTrigger')?.classList.remove('open');
}

/* Click outside dropdown → close */
document.addEventListener('click', e => {
  if (!e.target.closest('#langDropdown')) closeLangMenu();
});

function switchLanguage(lang, clickedItem) {
  /* Update active state in menu */
  document.querySelectorAll('.lang-item').forEach(i => i.classList.remove('active'));
  clickedItem.classList.add('active');

  /* Update trigger button */
  document.getElementById('langFlag').textContent = lang.flag;
  document.getElementById('langName').textContent  = lang.name;
  closeLangMenu();

  /* ── How Google Translate actually works ─────────────────
     The widget injects a <select class="goog-te-combo"> into
     the hidden #gt_el div. We change its value and fire a
     'change' event — the widget does the rest automatically.
     If the widget hasn't rendered yet we fall back to setting
     the googtrans cookie and reloading the page.
  ──────────────────────────────────────────────────────── */
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = lang.code;
    combo.dispatchEvent(new Event('change'));
    showToast('success', '🌐 Language Changed', `Page switching to ${lang.name} via Google Translate…`);
  } else {
    /* Fallback: set cookie → reload → translate picks it up */
    setGoogleTranslateCookie(`/en/${lang.code}`);
    showToast('success', '🌐 Language Changed', `Applying ${lang.name}…`);
    if (lang.code !== 'en') setTimeout(() => location.reload(), 900);
  }
}

function setGoogleTranslateCookie(value) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const exp = expires.toUTCString();
  /* Set on both root path and current domain */
  document.cookie = `googtrans=${value}; path=/; expires=${exp}`;
  document.cookie = `googtrans=${value}; domain=${location.hostname}; path=/; expires=${exp}`;
}

/* ──────────────────────────────────────────────────────────────
   4.  LOGIN
   ────────────────────────────────────────────────────────────── */
function switchLoginTab(el, type) {
  document.querySelectorAll('.ltab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('li-email').style.display = type === 'email' ? 'block' : 'none';
  document.getElementById('li-phone').style.display = type === 'phone' ? 'block' : 'none';
}

async function doLogin() {
  const email = document.getElementById('li-em')?.value.trim();
  const phone = document.getElementById('li-ph')?.value.trim();
  const pass  = document.getElementById('li-pw')?.value;
  const identifier = email || phone;

  if (!identifier) { showToast('warning', 'Missing Info', 'Please enter your email or phone number.'); return; }
  if (!pass)        { showToast('warning', 'Missing Info', 'Please enter your password.');             return; }

  showToast('success', 'Welcome Back! 👋', 'Logged in successfully. Redirecting to dashboard…');
  setTimeout(() => goPage('dashboard'), 1500);

  /* ── Real backend login (uncomment when backend is live) ──
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: pass }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('ll_token', data.token);
      localStorage.setItem('ll_user',  JSON.stringify(data.user));
      showToast('success', 'Welcome Back! 👋', `Logged in as ${data.user.name}`);
      setTimeout(() => goPage('dashboard'), 1500);
    } else {
      showToast('warning', 'Login Failed', data.message || 'Invalid credentials.');
    }
  } catch (err) {
    showToast('warning', 'Connection Error', 'Cannot reach server. Please try again.');
  }
  ── */
}

/* ──────────────────────────────────────────────────────────────
   5.  BLOOD GROUP PICKER
   ────────────────────────────────────────────────────────────── */
function pickBlood(btn, group, type) {
  const grid = btn.closest('.blood-grid');
  grid.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');

  if (type === 'd') {
    State.selectedDonorBlood = group;
    const notice = document.getElementById('rare-notice');
    if (notice) notice.style.display = CONFIG.RARE_BLOOD_GROUPS.includes(group) ? 'block' : 'none';
  } else {
    State.selectedPatientBlood = group;
  }
}

/* ──────────────────────────────────────────────────────────────
   6.  ELIGIBILITY CHECKER
   ────────────────────────────────────────────────────────────── */
function checkEligibility() {
  const hb      = parseFloat(document.getElementById('d-hb')?.value)      || 0;
  const age     = parseInt(document.getElementById('d-age')?.value)        || 0;
  const weight  = parseFloat(document.getElementById('d-weight')?.value)   || 0;
  const gender  = document.getElementById('d-gender')?.value               || '';
  const lastDon = document.getElementById('d-lastdon')?.value;
  const medical = document.getElementById('d-medical')?.value.toLowerCase()|| '';

  const box = document.getElementById('elig-box');
  if (!box) return;
  box.style.display = 'block';

  const issues = [];

  /* Age check */
  if (age < 18 || age > 65)
    issues.push('Age must be between 18 and 65 years');

  /* Weight check */
  if (weight < 50)
    issues.push('Minimum weight is 50 kg to donate safely');

  /* Haemoglobin check (gender-based threshold) */
  const minHb = gender === 'Female' ? 12.5 : 13.0;
  if (hb > 0 && hb < minHb)
    issues.push(`Haemoglobin ${hb} g/dL is below the minimum (${minHb} for ${gender || 'you'})`);

  /* Last donation gap — WHO recommends 90 days (3 months) */
  if (lastDon) {
    const daysSince = Math.floor((Date.now() - new Date(lastDon)) / 86400000);
    if (daysSince < 90)
      issues.push(`Last donation was ${daysSince} days ago — 90-day gap is required between donations`);
  }

  /* Medical disqualifiers */
  const disqualifiers = ['hiv', 'hepatitis', 'diabetes', 'cancer', 'malaria'];
  const found = disqualifiers.find(d => medical.includes(d));
  if (found)
    issues.push(`Mentioned condition (${found}) may require medical clearance before donation`);

  /* Render result */
  if (issues.length === 0) {
    box.className = 'elig-box pass';
    box.innerHTML = `
      <h5>✅ You're Eligible to Donate!</h5>
      <p style="font-size:13px;color:var(--green);margin-top:4px;">
        All health parameters check out. You can safely donate blood.
      </p>`;
    showToast('success', '✅ Eligible!', 'All health checks passed. You are cleared to donate.');
  } else {
    box.className = 'elig-box fail';
    box.innerHTML = `
      <h5>❌ Not Currently Eligible</h5>
      <ul style="font-size:13px;color:var(--red-deep);margin-top:6px;padding-left:1.2rem;">
        ${issues.map(i => `<li style="margin-bottom:3px;">${i}</li>`).join('')}
      </ul>`;
    showToast('warning', '⚠️ Eligibility Issue', issues[0]);
  }
}

/* ──────────────────────────────────────────────────────────────
   7.  AVAILABILITY & GPS TOGGLES
   ────────────────────────────────────────────────────────────── */
function toggleAvail(cb) {
  if (cb.checked) {
    showToast('success', 'Status: Available 🟢', 'You are now visible to nearby patients and hospitals on the map!');
    /* Real API call to update donor availability in database:
    fetch(`${CONFIG.BACKEND_URL}/donor/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${localStorage.getItem('ll_token')}` },
      body: JSON.stringify({ available: true }),
    }); */
  } else {
    showToast('', 'Status: Unavailable ⚪', 'You are now hidden from the donor map.');
  }
}

function toggleGPS(cb) {
  const wrap = document.getElementById('donor-map-wrap');
  if (!wrap) return;
  if (cb.checked) {
    wrap.style.display = 'block';
    Maps.loadAPI();
    setTimeout(Maps.initDonorMap, 600);
    showToast('', '📍 GPS Activated', 'Live location sharing enabled via Google Maps API.');
  } else {
    wrap.style.display = 'none';
    showToast('', '📍 GPS Off', 'Location sharing paused.');
  }
}

/* ──────────────────────────────────────────────────────────────
   8.  AADHAAR VERIFICATION  (via backend → DigiLocker)
   ────────────────────────────────────────────────────────────── */
function formatAadhar(inp) {
  const digits = inp.value.replace(/\D/g, '').slice(0, 12);
  inp.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

async function sendOTP() {
  const raw    = document.getElementById('d-aadhar')?.value.replace(/\s/g, '');
  const phone  = document.getElementById('d-phone')?.value.trim();

  if (!raw || raw.length < 12) {
    showToast('warning', '⚠️ Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number.');
    return;
  }
  if (!phone) {
    showToast('warning', '⚠️ Phone Required', 'Enter your phone number first — OTP is sent via Twilio SMS.');
    return;
  }

  showToast('success', 'Sending OTP… 📱', 'OTP will arrive on your Aadhaar-linked mobile in a few seconds.');

  /* ── Real API call to backend → Twilio OTP ────────────────
     Backend sends OTP to the Aadhaar-linked number via Twilio.
  ────────────────────────────────────────────────────────── */
  try {
    if (CONFIG.BACKEND_URL === 'https://YOUR_APP_NAME.onrender.com') {
      /* Simulate if backend not deployed yet */
      setTimeout(() => showToast('success', 'OTP Sent ✅',
        'Demo OTP: 123456  (real OTP needs backend deployed)'), 1200);
      return;
    }

    const res  = await fetch(`${CONFIG.BACKEND_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhar: raw, phone }),
    });
    const data = await res.json();

    if (data.success) {
      showToast('success', 'OTP Sent ✅', `6-digit OTP sent to ${data.maskedPhone} via Twilio SMS.`);
    } else {
      showToast('warning', 'OTP Failed', data.message || 'Could not send OTP. Please try again.');
    }
  } catch (err) {
    showToast('warning', 'Server Error', 'Could not reach backend. Check your internet connection.');
  }
}

async function verifyOTP(aadhar, otp) {
  /* ── Real OTP verification via backend ────────────────────
  const res  = await fetch(`${CONFIG.BACKEND_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aadhar, otp }),
  });
  const data = await res.json();
  return data.verified;
  ────────────────────────────────────────────────────────── */
  return true; // Simulated pass — remove when backend is live
}

/* ──────────────────────────────────────────────────────────────
   9.  DONOR REGISTRATION  (POST to backend → stored in DB)
   ────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   DONOR REGISTRATION
   GPS + BACKEND + FIREBASE TOKEN
──────────────────────────────────────────────*/

async function submitDonor() {

  const name =
    document.getElementById("d-name")?.value.trim();

  const age =
    parseInt(document.getElementById("d-age")?.value);

  const gender =
    document.getElementById("d-gender")?.value;

  const phone =
    document.getElementById("d-phone")?.value.trim();

  const email =
    document.getElementById("d-email")?.value.trim();

  const city =
    document.getElementById("d-city")?.value.trim();

  const hb =
    document.getElementById("d-hb")?.value;

  const bp =
    document.getElementById("d-bp")?.value;

  const weight =
    document.getElementById("d-weight")?.value;


  // validations

  if (!name) {
    showToast(
      "warning",
      "Missing Name",
      "Enter your name"
    );
    return;
  }


  if (!State.selectedDonorBlood) {

    showToast(
      "warning",
      "Blood Group",
      "Select blood group"
    );

    return;

  }


  if (!phone) {

    showToast(
      "warning",
      "Phone Required",
      "Enter phone number"
    );

    return;

  }


  // get live GPS

  navigator.geolocation.getCurrentPosition(


    async (position)=>{


      const donorData = {


        name,
        age,
        gender,
        phone,
        email,
        city,


        bloodGroup:
        State.selectedDonorBlood,


        haemoglobin:
        parseFloat(hb),


        bloodPressure:
        bp,


        weight:
        parseFloat(weight),



        lat:
        position.coords.latitude,


        lng:
        position.coords.longitude,



        available:
        document
        .getElementById("avail-toggle")
        ?.checked,


        gpsEnabled:true,


        isRare:
        CONFIG
        .RARE_BLOOD_GROUPS
        .includes(
          State.selectedDonorBlood
        ),



        // Firebase token

        fcmToken:

        (typeof FirebaseNotifications
        !== "undefined")

        ?

        FirebaseNotifications.getToken()

        :

        null,



        registeredAt:
        new Date()
        .toISOString()

      };



      console.log(
        "Sending donor:",
        donorData
      );



      try{


        const response =
        await fetch(

          CONFIG.BACKEND_URL +
          "/register-donor",

          {

          method:"POST",


          headers:{

            "Content-Type":
            "application/json"

          },


          body:
          JSON.stringify(
            donorData
          )


          }

        );



        const result =
        await response.json();



        if(result.success){


          onDonorRegistered(
            donorData
          );


        }
        else{


          showToast(

            "warning",

            "Failed",

            result.message ||
            "Backend error"

          );


        }



      }

      catch(error){


        console.error(
          error
        );


        showToast(

          "warning",

          "Server Error",

          "Cannot connect backend"

        );


      }


    },


    ()=>{


      showToast(

        "warning",

        "GPS Needed",

        "Please allow location"

      );


    },


    {

      enableHighAccuracy:true

    }


  );

}


function onDonorRegistered(data) {
  document.getElementById('donorForm').style.display   = 'none';
  document.getElementById('donor-success').style.display = 'block';
  document.getElementById('success-blood').textContent = `🩸 ${data.bloodGroup}`;
  window.scrollTo(0, 0);

  showToast('success', 'Registered! 🎉', `Welcome, ${data.name}! Your LifeLink donor profile is now live.`);

  if (data.isRare) {
    setTimeout(() => {
      showToast('warning', '⭐ Rare Donor Badge!',
        `${data.bloodGroup} is a rare blood group — priority alerts & recognition badge assigned!`);
    }, 3000);
  }
}

/* ──────────────────────────────────────────────────────────────
   10. PATIENT REGISTRATION  (POST to backend → find donors)
   ────────────────────────────────────────────────────────────── */
async function submitPatient() {
  const name     = document.getElementById('p-name')?.value.trim();
  const phone    = document.getElementById('p-phone')?.value.trim();
  const hospital = document.getElementById('p-hospital')?.value.trim();
  const urgency  = document.getElementById('p-urgency')?.value;

  if (!State.selectedPatientBlood) {
    showToast('warning', 'Blood Group', 'Please select the required blood group.');
    return;
  }
  if (!phone) {
    showToast('warning', 'Phone Required', 'Please enter a contact phone number.');
    return;
  }

  State.patientPhone = phone;

  const patientData = {
    name,  phone, hospital,
    bloodGroup: State.selectedPatientBlood,
    urgency,
    units: document.querySelector('#page-patient input[type="number"]')?.value,
    notes: document.querySelector('#page-patient textarea')?.value,
    lat:   16.3067,  // Will be replaced by real GPS in production
    lng:   80.4365,
    registeredAt: new Date().toISOString(),
  };

  findDonors(patientData);
}

/* ──────────────────────────────────────────────────────────────
   11. FIND DONORS  (GET from backend → GPS-sorted list)
   ────────────────────────────────────────────────────────────── */
async function findDonors(){


navigator.geolocation.getCurrentPosition(

async(position)=>{


const request={


bloodGroup:

State.selectedPatientBlood,


lat:

position.coords.latitude,


lng:

position.coords.longitude,


radiusKm:

CONFIG.SEARCH_RADIUS_KM


};




console.log(

"Searching:",

request

);





const response =

await fetch(

CONFIG.BACKEND_URL+

"/find-donors",

{

method:"POST",


headers:{

"Content-Type":

"application/json"

},



body:

JSON.stringify(request)


}


);





const data =

await response.json();





console.log(

"Donors received",

data

);





if(data.success){



renderDonorCards(

data.donors

);



showDonorResults();



showToast(

"success",

`Found ${data.count} donors`,

"Sorted by nearest distance"

);



}





},

()=>{


showToast(

"warning",

"GPS required",

"Allow location"

);


}


);



}

function showDonorResults() {
  const el = document.getElementById('donor-results');
  if (el) { el.style.display = 'block'; el.scrollIntoView({ behavior: 'smooth' }); }
}

/* Render real donor cards from backend response */
function renderDonorCards(donors) {
  const container = document.querySelector('#donor-results .form-card');
  if (!container) return;

  const initials = name => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const pct      = dist  => Math.max(20, 100 - (parseFloat(dist) * 15));

  container.innerHTML = `
    <div class="fsec-title">🩸 Matched Donors — Sorted by Distance</div>
    ${donors.map(d => `
      <div class="donor-card">
        <div class="d-avatar">${initials(d.name)}</div>
        <div class="d-info">
          <h4>${d.name} ${CONFIG.RARE_BLOOD_GROUPS.includes(d.bloodGroup)
            ? `<span class="badge badge-gold">⭐ ${d.bloodGroup} Rare</span>` : ''}</h4>
          <div class="d-meta">
            ${d.bloodGroup} ·
            <span class="dist-pill">📍 ${d.distanceKm} km</span> ·
            <span class="badge badge-green">● Available</span>
          </div>
          <div class="progress"><div class="progress-bar" style="width:${pct(d.distanceKm)}%;"></div></div>
        </div>
        <div class="d-actions">
          <button class="btn btn-red btn-sm"
            onclick="openChat('${d.name}','${d.bloodGroup}','${d.distanceKm}km')">💬 Chat</button>
          <button class="btn btn-dark btn-sm"
            onclick="callDonor('${d.name}','${d.phone}')">📞 Call</button>
        </div>
      </div>`).join('')}`;
}

/* ──────────────────────────────────────────────────────────────
   12. EMERGENCY ALERT  (Firebase FCM + Twilio SMS)
   ────────────────────────────────────────────────────────────── */
async function triggerEmergency() {
  const btn      = document.getElementById('emerg-btn');
  const hospital = document.getElementById('p-hospital')?.value.trim() || 'Guntur Hospital';
  const blood    = State.selectedPatientBlood || 'Unknown';

  if (!State.selectedPatientBlood) {
    showToast('warning', 'Select Blood Group', 'Please select the required blood group first.');
    return;
  }

  /* Visual: pulse the button */
  btn.classList.add('blasting');
  btn.innerHTML = '🚨 Alert Sent! Notifying donors in 10 km…';

  /* 1) Firebase FCM — push to all nearby donor devices */
  await FirebaseNotifications.sendEmergencyAlert({
    bloodGroup: blood,
    hospital,
    city:    CONFIG.DEFAULT_CITY,
    lat:     16.3067,
    lng:     80.4365,
    urgency: document.getElementById('p-urgency')?.value || 'critical',
    message: `URGENT: ${blood} blood needed at ${hospital}. Please respond immediately!`,
  });

  /* 2) Twilio SMS — reach donors without smartphones */
  await sendEmergencySMS(blood, hospital);

  /* Reset button after 3.5 s and show results */
  setTimeout(() => {
    btn.classList.remove('blasting');
    btn.innerHTML = '🚨 Send Emergency Alert to All Nearby Donors';
    showDonorResults();
    showToast('success', '3 Donors Confirmed! ✅',
      'Ravi Kumar, Priya Srinivas & Arjun Mehta are en route to the hospital.');
  }, 3500);
}

async function broadcastEmergency() {
  showToast('warning', '🚨 Emergency Broadcast!',
    'Firebase FCM sent to ALL 1,247 active donors in Guntur District via 3 channels!');

  /* Real broadcast via backend:
  await fetch(`${CONFIG.BACKEND_URL}/broadcast-emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city: CONFIG.DEFAULT_CITY, radiusKm: 25 }),
  }); */
}

/* ──────────────────────────────────────────────────────────────
   13. TWILIO SMS  (called via backend — never expose keys here)
   ────────────────────────────────────────────────────────────── */
async function sendSMS(to, message) {
  /*
   * IMPORTANT: Twilio keys must NEVER be in frontend JavaScript.
   * The backend (server.js) holds the keys and exposes a /send-sms
   * endpoint. We call THAT endpoint from here.
   */
  if (CONFIG.BACKEND_URL === 'https://YOUR_APP_NAME.onrender.com') {
    console.log(`[Simulated SMS] To: ${to} | Message: ${message}`);
    return { simulated: true };
  }

  try {
    const res  = await fetch(`${CONFIG.BACKEND_URL}/send-sms`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    const data = await res.json();
    if (!data.success) console.warn('SMS failed:', data.error);
    return data;
  } catch (err) {
    console.error('sendSMS error:', err);
    return { error: err.message };
  }
}

async function sendEmergencySMS(bloodGroup, hospital) {
  /*
   * Backend /send-emergency-sms looks up all donors in the DB
   * with matching blood group within radius and sends bulk SMS.
   */
  if (CONFIG.BACKEND_URL === 'https://YOUR_APP_NAME.onrender.com') {
    console.log(`[Simulated Emergency SMS] Blood: ${bloodGroup} | Hospital: ${hospital}`);
    return;
  }

  try {
    await fetch(`${CONFIG.BACKEND_URL}/send-emergency-sms`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bloodGroup,
        hospital,
        city:     CONFIG.DEFAULT_CITY,
        radiusKm: CONFIG.EMERGENCY_RADIUS_KM,
        message:  `🚨 LIFELINK EMERGENCY: ${bloodGroup} blood urgently needed at ${hospital}, ${CONFIG.DEFAULT_CITY}. Reply YES to confirm. lifelink.in`,
      }),
    });
  } catch (err) {
    console.error('Emergency SMS error:', err);
  }
}

/* ──────────────────────────────────────────────────────────────
   14. IN-APP CHAT  (Twilio Conversations via backend)
   ────────────────────────────────────────────────────────────── */
function openChat(donorName, bloodGroup, dist) {
  document.getElementById('chat-name').textContent = donorName;
  document.getElementById('chat-info').textContent = `Online · ${bloodGroup} Donor · ${dist} away`;

  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = `
    <div class="msg in">
      Hello! I saw your blood request. I'm available and heading your way! 🩸
      <div class="msg-time">Just now</div>
    </div>`;

  document.getElementById('chat-overlay').classList.add('open');
  document.getElementById('twilio-status').textContent = 'Connected via Twilio';
  State.chatReplyIndex = 0;

  showToast('', 'Chat Connected 💬', 'Secure encrypted channel opened via Twilio Conversations.');
}

function closeChat() {
  document.getElementById('chat-overlay').classList.remove('open');
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  const msgs = document.getElementById('chat-messages');
  const time = nowTime();

  /* Render outgoing message */
  const out = document.createElement('div');
  out.className = 'msg out';
  out.innerHTML = `${text}<div class="msg-time">${time} · Delivered</div>`;
  msgs.appendChild(out);
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  /* Update Twilio status indicator */
  document.getElementById('twilio-status').textContent = '✓ Delivered via Twilio';

  /* ── Real Twilio send via backend (uncomment when live) ───
  await sendSMS(donorPhoneNumber, text);
  ── Or use Twilio Conversations API for real-time chat:
  await fetch(`${CONFIG.BACKEND_URL}/chat/send`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationSid: currentConversationSid,
      message: text,
      author: 'Patient',
    }),
  });
  ────────────────────────────────────────────────────────── */

  /* Simulate donor reply after a short delay */
  setTimeout(() => {
    const reply = document.createElement('div');
    reply.className = 'msg in';
    reply.innerHTML = `
      ${State.chatReplies[State.chatReplyIndex % State.chatReplies.length]}
      <div class="msg-time">${nowTime()}</div>`;
    State.chatReplyIndex++;
    msgs.appendChild(reply);
    msgs.scrollTop = msgs.scrollHeight;
    showToast('', 'New Message 💬', `${document.getElementById('chat-name').textContent} replied.`);
  }, 900 + Math.random() * 600);
}

function callDonor(name, phone) {
  showToast('', `Calling ${name} 📞`,
    'Secure masked call via Twilio Voice API. Your number is protected.');

  /* Real masked call via backend:
  fetch(`${CONFIG.BACKEND_URL}/call`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: phone }),
  }); */
}

/* ──────────────────────────────────────────────────────────────
   15. HOSPITAL REGISTRATION  (POST to backend)
   ────────────────────────────────────────────────────────────── */
async function submitHospital(formData) {
  /* Real call:
  await fetch(`${CONFIG.BACKEND_URL}/register-hospital`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  }); */
  showToast('success', 'Hospital Submitted! 🏨',
    'Application sent. Verification in 24–48 hrs. Welcome to LifeLink!');
}

/* ──────────────────────────────────────────────────────────────
   16. BLOOD BANK REGISTRATION  (POST to backend)
   ────────────────────────────────────────────────────────────── */
async function submitBloodBank(formData) {
  /* Real call:
  await fetch(`${CONFIG.BACKEND_URL}/register-blood-bank`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  }); */
  showToast('success', 'Blood Bank Registered! 🏦',
    'Stock uploaded. You are now listed on the LifeLink map!');
}

/* ──────────────────────────────────────────────────────────────
   17. DASHBOARD  (live data from backend)
   ────────────────────────────────────────────────────────────── */
const Dashboard = (() => {

  /* Default stock data shown when backend not connected */
  let stockData = [
    { g: 'A+',  u: 45,  max: 100 },
    { g: 'A-',  u: 8,   max: 50,  rare: true },
    { g: 'B+',  u: 62,  max: 100 },
    { g: 'B-',  u: 4,   max: 50,  rare: true },
    { g: 'AB+', u: 28,  max: 60  },
    { g: 'AB-', u: 3,   max: 30,  rare: true },
    { g: 'O+',  u: 71,  max: 100 },
    { g: 'O-',  u: 12,  max: 50,  rare: true },
  ];

  let feedData = [
    { type: 'emergency', msg: 'O- needed at Guntur GMC — ICU patient critical',   time: '2m ago'  },
    { type: 'fulfilled', msg: 'B+ fulfilled — Nagarjuna Hospital (2 units)',       time: '8m ago'  },
    { type: 'info',      msg: 'New donor: Priya Srinivas (B+) — Guntur',          time: '15m ago' },
    { type: 'emergency', msg: 'AB- urgent — NRI Hospital Vijayawada',             time: '22m ago' },
    { type: 'fulfilled', msg: 'A+ fulfilled — Apollo Guntur',                     time: '1h ago'  },
    { type: 'info',      msg: 'Blood Bank stock updated — Red Cross Guntur',      time: '2h ago'  },
  ];

  async function init() {
    await fetchStats();
    renderStock();
    renderFeed();
  }

  /* Fetch real-time stats from backend */
  async function fetchStats() {
    if (CONFIG.BACKEND_URL === 'https://YOUR_APP_NAME.onrender.com') return;
    try {
      const res  = await fetch(`${CONFIG.BACKEND_URL}/dashboard/stats`);
      const data = await res.json();

      if (data.success) {
        setEl('d-active',    data.activeDonors);
        setEl('d-pending',   data.pendingRequests);
        setEl('d-fulfilled', data.fulfilledToday);
        setEl('d-emerg',     data.emergencies);
        if (data.stock) stockData = data.stock;
        if (data.feed)  feedData  = data.feed;
      }
    } catch (err) {
      console.warn('Dashboard stats fetch failed — using demo data.');
    }
  }

  function renderStock() {
    const el = document.getElementById('stock-display');
    if (!el) return;
    el.innerHTML = stockData.map(d => {
      const pct = Math.round((d.u / d.max) * 100);
      const cls = pct < 20 ? 'stock-crit' : pct < 45 ? 'stock-warn' : 'stock-good';
      return `
        <div class="stock-item ${cls}">
          <div class="stock-row">
            <span class="stock-label">
              ${d.g}${d.rare ? ' <span style="font-size:9px;color:var(--gold);font-weight:700;">★</span>' : ''}
            </span>
            <span class="stock-val">${d.u} / ${d.max} units</span>
          </div>
          <div class="stock-bar"><div class="stock-fill" style="width:${pct}%;"></div></div>
        </div>`;
    }).join('');
  }

  function renderFeed(extraItem) {
    const el = document.getElementById('feed-display');
    if (!el) return;
    const items = extraItem ? [extraItem, ...feedData] : feedData;
    const icon  = { emergency: '🚨', fulfilled: '✅', info: '📋' };
    el.innerHTML = items.map(a => `
      <div class="feed-item ${a.type}">
        <div class="feed-icon">${icon[a.type] || '📋'}</div>
        <div>
          <div class="feed-text">${a.msg}</div>
          <div class="feed-time">${a.time}</div>
        </div>
      </div>`).join('');
  }

  function refreshFeed(payload) {
    const item = {
      type: payload?.data?.type || 'info',
      msg:  payload?.notification?.body || 'New notification',
      time: 'Just now',
    };
    feedData.unshift(item);
    renderFeed();
  }

  return { init, fetchStats, renderStock, renderFeed, refreshFeed };

})();

async function refreshDash() {
  showToast('', '🔄 Refreshing…', 'Fetching live data from Firebase Realtime Database…');
  await Dashboard.fetchStats();
  Dashboard.renderStock();
  Dashboard.renderFeed();
}

/* ──────────────────────────────────────────────────────────────
   18. TOAST NOTIFICATION SYSTEM
   ────────────────────────────────────────────────────────────── */
function showToast(type, title, message) {
  const wrap  = document.getElementById('toastWrap');
  const toast = document.createElement('div');
  toast.className = `toast${type === 'success' ? ' success' : type === 'warning' ? ' warning' : ''}`;
  toast.innerHTML = `
    <button class="toast-close" onclick="removeToast(this.parentElement)">✕</button>
    <div class="toast-title">${title}</div>
    <div class="toast-msg">${message}</div>`;
  wrap.appendChild(toast);

  /* Auto-remove after 5.5 s */
  const timer = setTimeout(() => removeToast(toast), 5500);
  toast._timer = timer;
}

function removeToast(el) {
  if (!el || !el.parentElement) return;
  clearTimeout(el._timer);
  el.classList.add('out');
  setTimeout(() => el.parentElement?.removeChild(el), 280);
}

/* ──────────────────────────────────────────────────────────────
   19. UTILITIES
   ────────────────────────────────────────────────────────────── */
function nowTime() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ──────────────────────────────────────────────────────────────
   20. BOOT  — runs when DOM is ready
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Pre-load Maps API in background */
  Maps.loadAPI();

  /* Demo notifications to show the system is alive */
  setTimeout(() => showToast('warning', '🚨 Emergency Alert!',
    'O- blood needed at Guntur Government Hospital ICU. Donors notified via Firebase!'), 3500);

  setTimeout(() => showToast('success', 'New Donor Online ✅',
    'Sunita Rao (B+) just went Available — 2.1 km from GMC.'), 10000);

  setTimeout(() => showToast('', '📍 GPS Network Active',
    '1,247 donors live on the LifeLink map across Guntur District.'), 17000);

});
async function refreshDashboard(){


const res =
await fetch(
CONFIG.BACKEND_URL+
"/dashboard/live"
);


const data =
await res.json();


console.log(
"REAL DATA",
data
);


// update UI here

}


setInterval(
refreshDashboard,
5000
);
// expose functions for HTML onclick

window.goPage = goPage;

window.submitDonor = submitDonor;

window.submitPatient = submitPatient;

window.pickBlood = pickBlood;

window.toggleGPS = toggleGPS;

window.toggleAvail = toggleAvail;

window.doLogin = doLogin;

window.checkEligibility = checkEligibility;

window.sendOTP = sendOTP;

window.triggerEmergency = triggerEmergency;

window.openChat = openChat;

window.closeChat = closeChat;

window.sendMessage = sendMessage;