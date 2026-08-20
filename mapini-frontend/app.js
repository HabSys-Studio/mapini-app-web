// URL base del backend en Render
const API_URL = 'https://mapini-backend.onrender.com';

let map, mapaRegistro;
let userCircle = null;
let userRadius = null;
let registroMarker = null;
let userLat = null;
let userLng = null;

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    initMainMap();
    setupEventListeners();
});

// 1. Inicializar Mapa Principal
function initMainMap() {
    // Coordenadas por defecto (Centro por respaldo)
    map = L.map('map').setView([-30.3600, -66.3130], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; Mapini'
    }).addTo(map);

    // Obtener geolocalización en vivo del usuario
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;

                // Centrar mapa en la ubicación del usuario
                map.setView([userLat, userLng], 16);

                // Remover marcadores anteriores si existen
                if (userCircle) map.removeLayer(userCircle);
                if (userRadius) map.removeLayer(userRadius);

                // Círculo exterior de precisión (Azul traslúcido)
                userRadius = L.circle([userLat, userLng], {
                    radius: pos.coords.accuracy || 30,
                    color: '#1a73e8',
                    fillColor: '#1a73e8',
                    fillOpacity: 0.15,
                    stroke: false
                }).addTo(map);

                // Punto central GPS (Azul sólido con borde blanco)
                userCircle = L.circleMarker([userLat, userLng], {
                    radius: 9,
                    fillColor: '#1a73e8',
                    color: '#ffffff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(map);

                userCircle.bindPopup('<b>📍 Tu Ubicación Actual</b>').openPopup();

                // Cargar locales desde la base de datos
                cargarLocales();
            },
            (err) => {
                console.warn('Error u opción denegada en geolocalización:', err);
                cargarLocales();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        cargarLocales();
    }
}

// 2. Cargar Locales desde la API de Render
async function cargarLocales() {
    try {
        const res = await fetch(`${API_URL}/api/locales`);
        if (!res.ok) throw new Error('Error al consultar comercios');
        
        const comercios = await res.json();

        comercios.forEach(local => {
            if (local.latitud && local.longitud) {
                const colorHex = local.esta_abierto ? '#28a745' : '#dc3545';

                const localMarker = L.circleMarker([local.latitud, local.longitud], {
                    radius: 10,
                    fillColor: colorHex,
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(map);

                const popupHtml = `
                    <div class="popup-comercio">
                        <h3>${local.nombre}</h3>
                        <span class="estado-tag ${local.esta_abierto ? 'estado-abierto' : 'estado-cerrado'}">
                            ${local.esta_abierto ? 'ABIERTO' : 'CERRADO'}
                        </span>
                        <p><b>Dirección:</b> ${local.direccion || 'Sin datos'}</p>
                        <p><b>Promo del día:</b> ${local.promo_del_dia || 'Sin promos activas'}</p>
                        <p><b>Pagos:</b> ${local.medios_pago || 'Consultar'}</p>
                        ${local.whatsapp ? `<p><a href="https://wa.me/${local.whatsapp}" target="_blank">📱 Contactar por WhatsApp</a></p>` : ''}
                        
                        <hr style="margin: 8px 0;">
                        <button onclick="reportarInconsistencia(${local.id})" class="btn-reporte">⚠️ Reportar Local Cerrado</button>
                    </div>
                `;

                localMarker.bindPopup(popupHtml);
            }
        });
    } catch (err) {
        console.error('Error cargando los locales:', err);
    }
}

// 3. Sistema de Reportes de Inconsistencia (Local cerrado cuando en app figura abierto)
async function reportarInconsistencia(comercioId) {
    if (!confirm('¿Confirmas que estás en la ubicación física y el local se encuentra cerrado?')) return;

    try {
        const res = await fetch(`${API_URL}/api/reportes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comercio_id: comercioId,
                user_lat: userLat,
                user_lng: userLng
            })
        });

        if (res.ok) {
            alert('Reporte enviado con éxito. Auditaremos la veracidad de los datos para comunicar advertencias o penalizar al comercio.');
        } else {
            alert('No se pudo procesar el reporte en este momento.');
        }
    } catch (err) {
        console.error('Error enviando reporte:', err);
    }
}

// 4. Configuración de Eventos y Modal de Registro
function setupEventListeners() {
    const modal = document.getElementById('modal-registro');
    const btnAbrir = document.getElementById('btn-toggle-form');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const form = document.getElementById('form-comercio');

    btnAbrir.addEventListener('click', () => {
        modal.classList.remove('hidden');
        setTimeout(() => initMapaRegistro(), 200);
    });

    btnCerrar.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lat = document.getElementById('latitud').value;
        const lng = document.getElementById('longitud').value;

        if (!lat || !lng) {
            alert('Haz clic sobre el mapa interno del formulario para seleccionar la ubicación exacta de tu local.');
            return;
        }

        const nuevoComercio = {
            nombre: document.getElementById('nombre').value,
            direccion: document.getElementById('direccion').value,
            whatsapp: document.getElementById('whatsapp').value,
            medios_pago: document.getElementById('medios_pago').value,
            promo_del_dia: document.getElementById('promo_del_dia').value,
            esta_abierto: document.getElementById('esta_abierto').checked,
            latitud: parseFloat(lat),
            longitud: parseFloat(lng)
        };

        try {
            const res = await fetch(`${API_URL}/api/locales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoComercio)
            });

            if (res.ok) {
                alert('¡Comercio registrado e ingresado con éxito!');
                form.reset();
                modal.classList.add('hidden');
                cargarLocales();
            } else {
                alert('Error al registrar el comercio.');
            }
        } catch (err) {
            console.error('Error enviando comercio:', err);
        }
    });
}

// 5. Mapa interactivo en el formulario para seleccionar coordenadas del local
function initMapaRegistro() {
    const initialLat = userLat || -30.3600;
    const initialLng = userLng || -66.3130;

    if (!mapaRegistro) {
        mapaRegistro = L.map('mapa-registro').setView([initialLat, initialLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaRegistro);

        mapaRegistro.on('click', (e) => {
            const { lat, lng } = e.latlng;
            document.getElementById('latitud').value = lat;
            document.getElementById('longitud').value = lng;

            if (registroMarker) {
                registroMarker.setLatLng(e.latlng);
            } else {
                registroMarker = L.marker(e.latlng, { draggable: true }).addTo(mapaRegistro);
                registroMarker.on('dragend', (evt) => {
                    const pos = evt.target.getLatLng();
                    document.getElementById('latitud').value = pos.lat;
                    document.getElementById('longitud').value = pos.lng;
                });
            }
        });
    } else {
        mapaRegistro.invalidateSize();
        mapaRegistro.setView([initialLat, initialLng], 15);
    }
}