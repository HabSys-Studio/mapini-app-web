// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const API_URL = 'https://mapini-backend.onrender.com';

const LAT_INICIAL = -30.3600;
const LNG_INICIAL = -66.3130;

let map;
let mapaRegistro;
let pinArrastrable;
let marcadoresLocales = [];

// Iconos de Estado
const iconoAbierto = L.divIcon({
  className: 'custom-pin pin-abierto',
  html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(16,185,129,0.8); cursor: pointer;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const iconoCerrado = L.divIcon({
  className: 'custom-pin pin-cerrado',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(239,68,68,0.8); cursor: pointer;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Mapini Frontend Inicializado");
  inicializarMapaPrincipal();
  cargarPinesMapa();
  setupEventListeners();
});

function inicializarMapaPrincipal() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error("❌ No se encontró el contenedor #map en el HTML");
    return;
  }

  map = L.map('map').setView([LAT_INICIAL, LNG_INICIAL], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  console.log("🗺️ Mapa Leaflet cargado con éxito");
}

async function cargarPinesMapa() {
  try {
    const respuesta = await fetch(`${API_URL}/comercios`);
    if (!respuesta.ok) throw new Error(`HTTP error! status: ${respuesta.status}`);

    const comercios = await respuesta.json();
    console.log("📦 Comercios recibidos del backend:", comercios);

    if (!Array.isArray(comercios)) return;

    marcadoresLocales.forEach(m => map.removeLayer(m));
    marcadoresLocales = [];

    comercios.forEach(comercio => {
      const lat = parseFloat(comercio.latitud);
      const lng = parseFloat(comercio.longitud);

      if (!isNaN(lat) && !isNaN(lng)) {
        const icono = comercio.esta_abierto ? iconoAbierto : iconoCerrado;
        const marker = L.marker([lat, lng], { icon: icono }).addTo(map);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          abrirSidebarComercio(comercio);
        });

        marcadoresLocales.push(marker);
      } else {
        console.warn(`⚠️ Comercio ID ${comercio.id} (${comercio.nombre}) no tiene coordenadas válidas:`, comercio);
      }
    });
  } catch (error) {
    console.error("❌ Error conectando a la API de comercios:", error);
  }
}

function abrirSidebarComercio(comercio) {
  const sidebar = document.getElementById('sidebar-comercio');
  if (!sidebar) return;

  document.getElementById('comercio-nombre').innerText = comercio.nombre || 'Comercio';
  document.getElementById('comercio-direccion').innerText = `📍 ${comercio.direccion || 'Sin dirección'}`;
  document.getElementById('comercio-promo').innerText = comercio.promo_del_dia || 'Sin promociones activas hoy.';
  document.getElementById('comercio-pagos').innerText = comercio.medios_pago || 'Efectivo';

  const ratingElem = document.getElementById('comercio-rating');
  if (ratingElem) ratingElem.innerText = `⭐ ${comercio.promedio_calificacion || '5.0'} / 5.0`;

  const badge = document.getElementById('badge-estado');
  if (badge) {
    badge.innerText = comercio.esta_abierto ? 'ABIERTO AHORA' : 'CERRADO';
    badge.className = comercio.esta_abierto ? 'badge badge-abierto' : 'badge badge-cerrado';
  }

  const btnWsp = document.getElementById('btn-whatsapp');
  if (btnWsp) {
    if (comercio.whatsapp) {
      btnWsp.href = `https://wa.me/${comercio.whatsapp.replace(/[^0-9]/g, '')}`;
      btnWsp.classList.remove('hidden');
    } else {
      btnWsp.classList.add('hidden');
    }
  }

  sidebar.classList.remove('hidden');
}

function inicializarMapaRegistro(lat = LAT_INICIAL, lng = LNG_INICIAL) {
  if (mapaRegistro) mapaRegistro.remove();

  setTimeout(() => {
    const regContainer = document.getElementById('mapa-registro');
    if (!regContainer) return;

    mapaRegistro = L.map('mapa-registro').setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapaRegistro);

    const iconoPinVerde = L.divIcon({
      className: 'pin-registro',
      html: `<div style="background-color: #059669; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); cursor: move;"></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    pinArrastrable = L.marker([lat, lng], { draggable: true, icon: iconoPinVerde }).addTo(mapaRegistro);

    pinArrastrable.on('dragend', () => {
      const pos = pinArrastrable.getLatLng();
      document.getElementById('reg-lat').value = pos.lat;
      document.getElementById('reg-lng').value = pos.lng;
    });

    document.getElementById('reg-lat').value = lat;
    document.getElementById('reg-lng').value = lng;
  }, 250);
}

function setupEventListeners() {
  const btnLoginModal = document.getElementById('btn-login-modal');
  const modalLogin = document.getElementById('modal-login');
  const btnCerrarLogin = document.getElementById('btn-cerrar-modal-login');
  const linkRegistro = document.getElementById('link-abrir-registro');
  const modalRegistro = document.getElementById('modal-registro');
  const btnCerrarRegistro = document.getElementById('btn-cerrar-modal-registro');
  const btnCerrarSidebar = document.getElementById('btn-cerrar-sidebar');
  const btnMiUbicacion = document.getElementById('btn-mi-ubicacion');

  if (btnLoginModal && modalLogin) {
    btnLoginModal.addEventListener('click', () => {
      console.log("🔑 Clic en Soy Comerciante");
      modalLogin.classList.remove('hidden');
    });
  } else {
    console.error("❌ No se encontró btn-login-modal o modal-login");
  }

  if (btnCerrarLogin && modalLogin) {
    btnCerrarLogin.addEventListener('click', () => {
      modalLogin.classList.add('hidden');
    });
  }

  if (linkRegistro && modalRegistro && modalLogin) {
    linkRegistro.addEventListener('click', (e) => {
      e.preventDefault();
      modalLogin.classList.add('hidden');
      modalRegistro.classList.remove('hidden');
      inicializarMapaRegistro();
    });
  }

  if (btnCerrarRegistro && modalRegistro) {
    btnCerrarRegistro.addEventListener('click', () => {
      modalRegistro.classList.add('hidden');
    });
  }

  if (btnCerrarSidebar) {
    btnCerrarSidebar.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar-comercio');
      if (sidebar) sidebar.classList.add('hidden');
    });
  }

  if (btnMiUbicacion) {
    btnMiUbicacion.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 17);
        });
      }
    });
  }
}