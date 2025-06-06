// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE (Declarada solo aquí) !!!
// ======================================================================
// ¡¡REEMPLAZA ESTO CON TU CLAVE REAL DE LA API DE YOUTUBE!!
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "TU_CLAVE_API_DE_YOUTUBE"; // <-- ¡¡VERIFICA Y REEMPLAZA!!

// Hacemos que apiKey esté disponible globalmente para app.js y shorts.js
window.apiKey = apiKey;

// ======================================================================
// Registro del Service Worker
// ======================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.error('Fallo el registro del Service Worker:', error);
            });
    });
}

// ======================================================================
// Lógica para el botón de instalación de la PWA
// ======================================================================
let deferredPrompt;
const installButtonContainer = document.getElementById('install-button-container');
const installButton = document.getElementById('install-button');

// Este evento se dispara cuando el navegador detecta que la PWA es instalable.
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installButtonContainer) {
        installButtonContainer.style.display = 'flex'; // Muestra el botón de instalación
        console.log('Evento beforeinstallprompt disparado. Botón de instalación visible.');
    }
});

// Listener para el clic en tu botón de instalación personalizado.
if (installButton) {
    installButton.addEventListener('click', async () => {
        if (installButtonContainer) {
            installButtonContainer.style.display = 'none'; // Oculta el botón una vez que se intenta instalar
        }

        if (deferredPrompt) {
            deferredPrompt.prompt(); // Muestra el prompt de instalación del navegador
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Respuesta del usuario al prompt de instalación: ${outcome}`);
            deferredPrompt = null; // El prompt solo se puede usar una vez

            if (outcome === 'accepted') {
                console.log('YouKids PWA fue instalada con éxito!');
            } else {
                console.log('Instalación de YouKids PWA fue cancelada.');
            }
        } else {
            console.warn('El deferredPrompt es nulo. No se pudo mostrar el prompt de instalación. (¿Ya instalada o no cumple criterios?)');
            // Fallback para iOS o navegadores que no soportan beforeinstallprompt directamente
            alert('Para instalar YouKids, usa la opción "Añadir a pantalla de inicio" en el menú de tu navegador (normalmente en los 3 puntos o el icono de compartir).');
        }
    });
}

// ======================================================================
// Preferencias de Usuario (Idioma, Canales Preferidos, Videos Vistos)
// ======================================================================
const PREFS_KEY = 'youkids_preferences';
const VIEWED_VIDEOS_KEY = 'youkids_viewed_videos';

function getDefaultPreferences() {
    return {
        language: 'es',
        preferredChannels: [], // Array de IDs de canal
        autoplay: false // Para la página principal
    };
}

function getPreferences() {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...getDefaultPreferences(), ...JSON.parse(stored) } : getDefaultPreferences();
}

function savePreferences(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    console.log("Preferencias guardadas:", prefs);
}

function getTodayFormattedDate() {
    const today = new Date();
    return today.toISOString().slice(0, 10); // Formato YYYY-MM-DD
}

function getViewedVideos() {
    const stored = localStorage.getItem(VIEWED_VIDEOS_KEY);
    let data = stored ? JSON.parse(stored) : { date: '', videos: {} };

    // Limpiar videos vistos de días anteriores
    const todayDate = getTodayFormattedDate();
    if (data.date !== todayDate) {
        console.log("Limpiando videos vistos de días anteriores.");
        data = { date: todayDate, videos: {} }; // Reinicia la lista para el nuevo día
    }
    return data;
}

function markVideoAsViewed(videoId) {
    const viewedData = getViewedVideos(); // Esto ya devolverá la lista para hoy
    viewedData.videos[videoId] = true; // Simplemente marcamos como visto
    localStorage.setItem(VIEWED_VIDEOS_KEY, JSON.stringify(viewedData));
    console.log(`Video ${videoId} marcado como visto en localStorage para ${viewedData.date}.`);
}

// Exponer funciones en el objeto global `window` para que app.js y shorts.js puedan acceder a ellas
window.getPreferences = getPreferences;
window.savePreferences = savePreferences;
window.getViewedVideos = getViewedVideos;
window.markVideoAsViewed = markVideoAsViewed;

// ======================================================================
// Lógica del Modal de Preferencias (Global)
// ======================================================================
const preferencesModal = document.getElementById('preferences-modal');
const settingsButton = document.getElementById('settings-button');
const closePreferencesModalButton = document.getElementById('close-preferences-modal');
const savePreferencesButton = document.getElementById('save-preferences-btn');
const languageSelect = document.getElementById('language-select');
const channelIdsInput = document.getElementById('channel-ids-input');

// Solo añadir listeners si los elementos existen en la página
document.addEventListener('DOMContentLoaded', () => {
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            const prefs = getPreferences();
            languageSelect.value = prefs.language;
            channelIdsInput.value = prefs.preferredChannels.join(', ');
            preferencesModal.classList.add('active');
        });
    }

    if (closePreferencesModalButton) {
        closePreferencesModalButton.addEventListener('click', () => {
            preferencesModal.classList.remove('active');
        });
    }

    if (savePreferencesButton) {
        savePreferencesButton.addEventListener('click', () => {
            const newPrefs = {
                language: languageSelect.value,
                preferredChannels: channelIdsInput.value.split(',').map(id => id.trim()).filter(id => id.length > 0),
                autoplay: getPreferences().autoplay // El autoplay se gestiona en app.js pero se guarda con las prefs generales
            };
            savePreferences(newPrefs);
            preferencesModal.classList.remove('active');

            // Disparar un evento personalizado para que app.js/shorts.js sepan que las preferencias cambiaron
            const event = new Event('preferencesUpdated');
            window.dispatchEvent(event);
        });
    }
});
