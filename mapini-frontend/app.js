const API_URL = 'https://mapini-backend.onrender.com';

let map;
let userCircle = null;
let userRadius = null;
let userLat = null;
let userLng = null;
let selectedMarker = null; // Guardar referencia al pin actualmente seleccionado

document.addEventListener('DOMContentLoaded', () => {
    initMainMap();
    setupEventListeners();
});

// 1. Inicializar Mapa Principal (Sin controles + / -)
function initMainMap() {
    map = L.map('map', {
        zoomControl: false
    }).setView([-30.3600, -66.3130], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; Mapini'
    }).addTo(map);

    // Cerrar panel y deseleccionar pin al hacer clic en un espacio vacío
    map.on('click', () => {
        deseleccionarPin();
        const panel = document.getElementById('panel-info-local');
        if (panel) panel.classList.add('hidden');
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;

                map.setView([userLat, userLng], 16);

                if (userCircle) map.removeLayer(userCircle);
                if (userRadius) map.removeLayer(userRadius);

                userRadius = L.circle([userLat, userLng], {
                    radius: pos.coords.accuracy || 30,
                    color: '#1a73e8',
                    fillColor: '#1a73e8',
                    fillOpacity: 0.15,
                    stroke: false
                }).addTo(map);

                userCircle = L.circleMarker([userLat, userLng], {
                    radius: 9,
                    fillColor: '#1a73e8',
                    color: '#ffffff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 1
                }).addTo(map);

                cargarLocales();
            },
            (err) => {
                console.warn('Geolocalización no disponible:', err);
                cargarLocales();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        cargarLocales();
    }
}

// Restablece el estilo del pin previamente seleccionado
function deseleccionarPin() {
    if (selectedMarker) {
        selectedMarker.setStyle({
            color: '#ffffff',
            weight: 2
        });
        selectedMarker = null;
    }
}

// 2. Cargar Locales desde la API
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

                // Evento al hacer clic en el marcador del comercio
                localMarker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);

                    // Restaurar pin anterior
                    deseleccionarPin();

                    // Resaltar pin seleccionado con borde azul
                    selectedMarker = localMarker;
                    selectedMarker.setStyle({
                        color: '#1a73e8',
                        weight: 4
                    });

                    mostrarPanelInfo(local);
                });
            }
        });
    } catch (err) {
        console.error('Error cargando los locales:', err);
    }
}

// Centrar el mapa en la posición del local seleccionado
function centrarEnLocal(lat, lng) {
    map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
}

// Mostrar información en el panel superior fijo
function mostrarPanelInfo(local) {
    const panel = document.getElementById('panel-info-local');
    
    panel.innerHTML = `
        <h3>${local.nombre}</h3>
        <span class="estado-tag ${local.esta_abierto ? 'estado-abierto' : 'estado-cerrado'}">
            ${local.esta_abierto ? 'ABIERTO' : 'CERRADO'}
        </span>
        <p><b>Dirección:</b> ${local.direccion || 'Sin datos'}</p>
        <p><b>Promo del día:</b> ${local.promo_del_dia || 'Sin promos activas'}</p>
        <p><b>Pagos:</b> ${local.medios_pago || 'Consultar'}</p>
        ${local.whatsapp ? `<p><a href="https://wa.me/${local.whatsapp}" target="_blank">📱 Contactar por WhatsApp</a></p>` : ''}
        
        <hr style="margin: 8px 0; border: 0; border-top: 1px solid #eee;">
        <div class="panel-actions">
            <button onclick="centrarEnLocal(${local.latitud}, ${local.longitud})" class="btn-centrar-local">📍 Ir a la Ubicación</button>
            <button onclick="reportarInconsistencia(${local.id})" class="btn-reporte">⚠️ Reportar Local Cerrado</button>
        </div>
    `;

    panel.classList.remove('hidden');
}

// 3. Reportes de Inconsistencia
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
            alert('Reporte enviado con éxito. Auditaremos la veracidad de los datos.');
        } else {
            alert('No se pudo procesar el reporte.');
        }
    } catch (err) {
        console.error('Error enviando reporte:', err);
    }
}

// 4. Configuración de Eventos y Modales
function setupEventListeners() {
    const modalAdmin = document.getElementById('modal-admin');
    const btnAdmin = document.getElementById('btn-admin');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const btnUbicacion = document.getElementById('btn-mi-ubicacion');

    // Evento para re-centrar en la ubicación del usuario
    btnUbicacion.addEventListener('click', () => {
        if (userLat && userLng) {
            map.flyTo([userLat, userLng], 16, { animate: true, duration: 1.5 });
        } else {
            alert('Aún no hemos detectado tu ubicación GPS.');
        }
    });

    // Abrir/Cerrar Modal Administración
    btnAdmin.addEventListener('click', () => modalAdmin.classList.remove('hidden'));
    btnCerrar.addEventListener('click', () => modalAdmin.classList.add('hidden'));

    // Botones dentro del login
    document.getElementById('btn-olvide-pass').addEventListener('click', () => {
        alert('Funcionalidad de recuperación de contraseña.');
    });

    document.getElementById('btn-registrarme').addEventListener('click', () => {
        alert('Funcionalidad para iniciar nuevo registro.');
    });
}