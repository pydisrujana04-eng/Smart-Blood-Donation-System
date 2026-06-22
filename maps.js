/* ================================================================
   js/maps.js
   LifeLink — Google Maps GPS Integration
   ================================================================ */

const Maps = (() => {

  let mapsLoaded = false;
  let mapsReady  = false;
  let pendingInits = [];
  let mapInstances = {};
  async function loadLiveDonors(map){

  try{

    const res = await fetch(
      CONFIG.BACKEND_URL + "/available-donors"
    );

    const data = await res.json();


    data.donors.forEach(d=>{

      new google.maps.Marker({

        map,

        position:{
          lat:Number(d.lat),
          lng:Number(d.lng)
        },

        title:
        `${d.name} (${d.bloodGroup})`,

        icon:{
          url:"https://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }

      });


    });


  }
  catch(err){

    console.log(
    "Cannot load donors",
    err
    );

  }

}

  // Current user GPS coordinates (updated live)
  let userLat = CONFIG.DEFAULT_LAT;
  let userLng = CONFIG.DEFAULT_LNG;

  /* ── Dark map style matching LifeLink theme ─────────────── */
  const DARK_STYLE = [
    { elementType: 'geometry',              stylers: [{ color: '#1C1917' }] },
    { elementType: 'labels.text.fill',      stylers: [{ color: '#B91C1C' }] },
    { elementType: 'labels.text.stroke',    stylers: [{ color: '#1C1917' }] },
    { featureType: 'road',         elementType: 'geometry',   stylers: [{ color: '#292524' }] },
    { featureType: 'road.arterial',elementType: 'labels.text.fill', stylers: [{ color: '#78716C' }] },
    { featureType: 'road.highway', elementType: 'geometry',   stylers: [{ color: '#3D2314' }] },
    { featureType: 'water',        elementType: 'geometry',   stylers: [{ color: '#0C0A09' }] },
    { featureType: 'poi',          elementType: 'geometry',   stylers: [{ color: '#1C1917' }] },
    { featureType: 'poi.park',     elementType: 'geometry',   stylers: [{ color: '#141A14' }] },
    { featureType: 'transit',      elementType: 'geometry',   stylers: [{ color: '#1C1917' }] },
  ];

  /* ── Load Google Maps API script dynamically ────────────── */
  function loadAPI() {
    if (mapsLoaded) return;
    mapsLoaded = true;

    if (CONFIG.MAPS_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('LifeLink: Google Maps key not set — using fallback map.');
      renderAllFallbacks();
      return;
    }

    const script = document.createElement('script');
    script.id    = 'gmaps-script';
    script.async = true;
    script.defer = true;
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.MAPS_KEY}&libraries=places,geometry&callback=Maps.onReady`;
    script.onerror = () => {
      console.error('LifeLink: Google Maps failed to load. Check your API key.');
      renderAllFallbacks();
    };
    document.head.appendChild(script);
  }

  /* ── Called by Maps API once it has loaded ──────────────── */
  function onReady() {
    mapsReady = true;
    acquireGPS();
    pendingInits.forEach(fn => fn());
    pendingInits = [];
  }

  /* ── Queue a map init until API is ready ────────────────── */
  function whenReady(fn) {
    if (mapsReady) fn();
    else pendingInits.push(fn);
  }

  /* ── Get user's real GPS via browser ───────────────────── */
  function acquireGPS(onUpdate) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        if (onUpdate) onUpdate(userLat, userLng);
        // Re-center any open maps
        Object.values(mapInstances).forEach(map => {
          if (map && map.setCenter) map.setCenter({ lat: userLat, lng: userLng });
        });
      },
      () => console.warn('LifeLink: GPS unavailable, using Guntur default.'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  /* ── DONOR MAP ──────────────────────────────────────────── */
  function initDonorMap() {
    const el = document.getElementById('donor-map');
    if (!el) return;

    if (CONFIG.MAPS_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') { renderFallback('donor-map', 'donor'); return; }

    whenReady(() => {
      if (mapInstances.donor) {
        mapInstances.donor.setCenter({ lat: userLat, lng: userLng });
        return;
      }

      const map = new google.maps.Map(el, {
        center: { lat: userLat, lng: userLng },
        zoom: 14,
        styles: DARK_STYLE,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      loadLiveDonors(map);
      mapInstances.donor = map;

      // Your location marker (red dot)
      const youMarker = new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map,
        title: 'You (Donor)',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' },
        animation: google.maps.Animation.DROP,
      });
      const youInfo = new google.maps.InfoWindow({ content: '<b style="color:#B91C1C">📍 You (Donor)</b><br><small>GPS Active</small>' });
      youMarker.addListener('click', () => youInfo.open(map, youMarker));

      // Nearby hospitals & blood banks
      const nearbyPOIs = [
        { lat: userLat + 0.012, lng: userLng - 0.008, title: 'Guntur Govt Hospital',   icon: 'hospitals.png' },
        { lat: userLat - 0.008, lng: userLng + 0.015, title: 'Apollo Hospital',         icon: 'hospitals.png' },
        { lat: userLat + 0.005, lng: userLng + 0.010, title: 'Red Cross Blood Bank',    icon: 'blue-dot.png'  },
        { lat: userLat - 0.012, lng: userLng - 0.014, title: 'NRI Hospital',            icon: 'hospitals.png' },
      ];
      nearbyPOIs.forEach(poi => {
        const m = new google.maps.Marker({
          position: { lat: poi.lat, lng: poi.lng },
          map,
          title: poi.title,
          icon: { url: `https://maps.google.com/mapfiles/ms/icons/${poi.icon}` },
        });
        const iw = new google.maps.InfoWindow({ content: `<b>${poi.title}</b>` });
        m.addListener('click', () => iw.open(map, m));
      });

      // Live GPS watch — updates your pin as you move
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          pos => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            const p = { lat: userLat, lng: userLng };
            map.setCenter(p);
            youMarker.setPosition(p);
            const badge = document.getElementById('donor-map-badge');
            if (badge) badge.textContent = `● GPS: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;
          },
          null,
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      }

      const badge = document.getElementById('donor-map-badge');
      if (badge) badge.textContent = '● LIVE GPS';
    });
  }

  /* ── PATIENT MAP ────────────────────────────────────────── */
  function initPatientMap() {
    const el = document.getElementById('patient-map');
    if (!el) return;

    if (CONFIG.MAPS_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') { renderFallback('patient-map', 'patient'); return; }

    whenReady(() => {
      if (mapInstances.patient) {
        mapInstances.patient.setCenter({ lat: userLat, lng: userLng });
        return;
      }

      const map = new google.maps.Map(el, {
        center: { lat: userLat, lng: userLng },
        zoom: 13,
        styles: DARK_STYLE,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapInstances.patient = map;

      // Patient / hospital location
      const patientMarker = new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map,
        title: 'Patient Location',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/hospitals.png' },
        animation: google.maps.Animation.DROP,
      });

      // Available donor pins around the patient
      const donorPins = [
        { lat: userLat + 0.010, lng: userLng - 0.006, name: 'Ravi Kumar',    blood: 'O-', dist: '1.2 km' },
        { lat: userLat - 0.015, lng: userLng + 0.012, name: 'Priya Srinivas',blood: 'O+', dist: '2.8 km' },
        { lat: userLat + 0.022, lng: userLng + 0.018, name: 'Arjun Mehta',   blood: 'A+', dist: '4.1 km' },
        { lat: userLat - 0.008, lng: userLng - 0.020, name: 'Sunita Rao',    blood: 'B+', dist: '5.3 km' },
      ];
      async function loadLiveDonors(map){


const res = await fetch(
CONFIG.BACKEND_URL+
"/available-donors"
);


const data =
await res.json();


data.donors.forEach(d=>{


new google.maps.Marker({

map,

position:{
lat:Number(d.lat),
lng:Number(d.lng)
},


title:
`${d.name} ${d.bloodGroup}`,

icon:{
url:
"https://maps.google.com/mapfiles/ms/icons/red-dot.png"
}


});


});


}

      // Draw circle showing search radius
      new google.maps.Circle({
        map,
        center: { lat: userLat, lng: userLng },
        radius: CONFIG.SEARCH_RADIUS_KM * 1000,
        strokeColor: '#B91C1C',
        strokeOpacity: 0.3,
        strokeWeight: 1.5,
        fillColor: '#B91C1C',
        fillOpacity: 0.05,
      });

      // Get real GPS
      acquireGPS((lat, lng) => {
        map.setCenter({ lat, lng });
        patientMarker.setPosition({ lat, lng });
        const badge = document.getElementById('patient-map-badge');
        if (badge) badge.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      });

      const badge = document.getElementById('patient-map-badge');
      if (badge) badge.textContent = '● LIVE';
    });
  }

  /* ── DASHBOARD MAP ──────────────────────────────────────── */
  function initDashboardMap() {
    const el = document.getElementById('dash-map');
    if (!el) return;

    if (CONFIG.MAPS_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') { renderFallback('dash-map', 'dashboard'); return; }

    whenReady(() => {
      if (mapInstances.dashboard) {
        mapInstances.dashboard.setCenter({ lat: userLat, lng: userLng });
        return;
      }

      const map = new google.maps.Map(el, {
        center: { lat: userLat, lng: userLng },
        zoom: 12,
        styles: DARK_STYLE,
        mapTypeControl: false,
        streetViewControl: false,
      });
      loadLiveDonors(map);
      mapInstances.dashboard = map;

      const allPins = [
        { lat: userLat + 0.020, lng: userLng - 0.015, name: 'Ravi K (Donor)',     icon: 'red-dot.png'   },
        { lat: userLat - 0.018, lng: userLng + 0.022, name: 'Priya S (Donor)',    icon: 'red-dot.png'   },
        { lat: userLat + 0.030, lng: userLng + 0.010, name: 'Arjun M (Donor)',    icon: 'red-dot.png'   },
        { lat: userLat + 0.008, lng: userLng - 0.025, name: 'Sunita R (Donor)',   icon: 'red-dot.png'   },
        { lat: userLat - 0.005, lng: userLng - 0.030, name: 'GMC Hospital',       icon: 'hospitals.png' },
        { lat: userLat + 0.012, lng: userLng + 0.035, name: 'Apollo Hospital',    icon: 'hospitals.png' },
        { lat: userLat - 0.025, lng: userLng - 0.010, name: 'Red Cross BB',       icon: 'blue-dot.png'  },
        { lat: userLat + 0.008, lng: userLng - 0.022, name: '🚨 Emergency',       icon: 'yellow-dot.png'},
      ];

      allPins.forEach(pin => {
        const m = new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.name,
          icon: { url: `https://maps.google.com/mapfiles/ms/icons/${pin.icon}` },
        });
        const iw = new google.maps.InfoWindow({ content: `<b>${pin.name}</b>` });
        m.addListener('click', () => iw.open(map, m));
      });
    });
  }

  /* ── FALLBACK MAP (visual grid when no API key) ─────────── */
  function renderFallback(containerId, type) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const pinSets = {
      donor: [
        { top:'42%', left:'48%', icon:'📍', tip:'You (Donor)', delay:0 },
        { top:'28%', left:'35%', icon:'🏥', tip:'Guntur GMC', delay:150 },
        { top:'58%', left:'64%', icon:'🏥', tip:'Apollo Hospital', delay:280 },
        { top:'22%', left:'58%', icon:'🏦', tip:'Red Cross Blood Bank', delay:400 },
      ],
      patient: [
        { top:'45%', left:'49%', icon:'🏥', tip:'Patient Location', delay:0 },
        { top:'32%', left:'38%', icon:'🩸', tip:'Ravi Kumar — O- 1.2km', delay:180 },
        { top:'58%', left:'63%', icon:'🩸', tip:'Priya S — O+ 2.8km', delay:320 },
        { top:'27%', left:'61%', icon:'🩸', tip:'Arjun M — A+ 4.1km', delay:460 },
        { top:'63%', left:'34%', icon:'🩸', tip:'Sunita R — B+ 5.3km', delay:600 },
        { top:'22%', left:'48%', icon:'🏦', tip:'Red Cross Blood Bank', delay:740 },
      ],
      dashboard: [
        { top:'40%', left:'46%', icon:'🏥', tip:'Guntur GMC', delay:0 },
        { top:'25%', left:'30%', icon:'🩸', tip:'Ravi K (Donor)', delay:180 },
        { top:'55%', left:'62%', icon:'🩸', tip:'Priya S (Donor)', delay:320 },
        { top:'35%', left:'71%', icon:'🩸', tip:'Arjun M (Donor)', delay:460 },
        { top:'65%', left:'40%', icon:'🩸', tip:'Sunita R (Donor)', delay:600 },
        { top:'70%', left:'65%', icon:'🏦', tip:'Red Cross BB', delay:740 },
        { top:'50%', left:'24%', icon:'🚨', tip:'Emergency Alert!', delay:900 },
      ],
    };

    const pins = pinSets[type] || pinSets.patient;
    const legendItems = type === 'patient'
      ? [['🏥','Patient'], ['🩸','Donor'], ['🏦','Blood Bank']]
      : [['🏥','Hospital'], ['🩸','Donor'], ['🏦','Blood Bank'], ['🚨','Emergency']];

    el.innerHTML = `
      <div class="map-fallback">
        <div class="map-fallback-grid"></div>
        ${pins.map(p => `
          <div class="map-pin" style="top:${p.top};left:${p.left};animation-delay:${p.delay}ms;">
            ${p.icon}
            <div class="map-tooltip">${p.tip}</div>
          </div>
        `).join('')}
        <div class="map-legend">
          ${legendItems.map(([icon, label]) => `<div class="map-legend-item">${icon} ${label}</div>`).join('')}
        </div>
        <div class="map-api-note">📍 Add Maps API Key for Real GPS</div>
      </div>`;
  }

  function renderAllFallbacks() {
    setTimeout(() => {
      renderFallback('donor-map', 'donor');
      renderFallback('patient-map', 'patient');
      renderFallback('dash-map', 'dashboard');
    }, 300);
  }

  // Expose onReady globally so Google Maps callback can reach it
  window.Maps = { onReady };

  return { loadAPI, initDonorMap, initPatientMap, initDashboardMap, renderFallback };

})();