// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// Por razones de seguridad, NUNCA expongas tu clave API directamente en el código del lado del cliente en producción.
// Para proyectos reales, utiliza un proxy del lado del servidor para interactuar con la API de YouTube.
// Por ahora, para pruebas locales, reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!

// ======================================================================
// Elementos del DOM para la página de Shorts (shorts.html)
// ======================================================================
const shortsContainer = document.getElementById("shorts-container");
const shortsLoadingIndicator = document.getElementById("shorts-loading");
const settingsButtonShorts = document.getElementById('settings-button'); // Botón de ajustes en la página de Shorts

// Variables para el IntersectionObserver y control de reproducción
let allShortPlayers = {}; // Para almacenar instancias de YT.Player para cada short
let currentActiveShortId = null; // ID del short actualmente activo/reproduciéndose

// Infinite scroll variables
let nextShortsPageToken = null; // Token para la siguiente página de resultados de la API
let isLoadingShorts = false; // Bandera para evitar múltiples solicitudes simultáneas

// ======================================================================
// Preferencias de Usuario (Reutilizamos las funciones de app.js)
// ======================================================================
// Es importante que las funciones de preferencias estén disponibles aquí.
// Podríamos refactorizarlas a un archivo `utils.js` compartido si la app fuera más grande.
const PREFS_KEY = 'youkids_preferences';
const VIEWED_VIDEOS_KEY = 'youkids_viewed_videos';

function getDefaultPreferences() {
    return {
        language: 'es',
        preferredChannels: [],
        autoplay: false // Autoplay en shorts lo controlará el IntersectionObserver
    };
}

function getPreferences() {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...getDefaultPreferences(), ...JSON.parse(stored) } : getDefaultPreferences();
}

function savePreferences(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function getTodayFormattedDate() {
    const today = new Date();
    return today.toISOString().slice(0, 10);
}

function getViewedVideos() {
    const stored = localStorage.getItem(VIEWED_VIDEOS_KEY);
    const data = stored ? JSON.parse(stored) : { date: '', videos: {} };

    const todayDate = getTodayFormattedDate();
    if (data.date !== todayDate) {
        console.log("Limpiando videos vistos de días anteriores (Shorts).");
        return { date: todayDate, videos: {} };
    }
    return data;
}

function markVideoAsViewed(videoId) {
    const viewedData = getViewedVideos();
    viewedData.videos[videoId] = true;
    localStorage.setItem(VIEWED_VIDEOS_KEY, JSON.stringify(viewedData));
}

// ======================================================================
// Lógica para el Modal de Preferencias (compartido)
// ======================================================================
const preferencesModal = document.getElementById('preferences-modal');
const closePreferencesModalButton = document.getElementById('close-preferences-modal');
const savePreferencesButton = document.getElementById('save-preferences-btn');
const languageSelect = document.getElementById('language-select');
const channelIdsInput = document.getElementById('channel-ids-input');

settingsButtonShorts.addEventListener('click', () => {
    const prefs = getPreferences();
    languageSelect.value = prefs.language;
    channelIdsInput.value = prefs.preferredChannels.join(', ');
    preferencesModal.classList.add('active');
});

closePreferencesModalButton.addEventListener('click', () => {
    preferencesModal.classList.remove('active');
});

savePreferencesButton.addEventListener('click', () => {
    const newPrefs = {
        language: languageSelect.value,
        preferredChannels: channelIdsInput.value.split(',').map(id => id.trim()).filter(id => id.length > 0),
        autoplay: getPreferences().autoplay // Mantener el estado de autoplay de la página principal
    };
    savePreferences(newPrefs);
    preferencesModal.classList.remove('active');
    console.log("Preferencias guardadas (Shorts):", newPrefs);
    // Recargar shorts con las nuevas preferencias
    loadShorts(''); // Recarga desde el inicio
});


// --- IntersectionObserver para la reproducción de Shorts ---
const playShortObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    const player = allShortPlayers[videoId];

    if (!player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') {
      // Intentar inicializar el reproductor si aún no está listo
      // Esto es crucial para si el observer detecta el short antes que el ready event del IFrame API
      initializeShortPlayer(videoId);
      // Reintentar en el próximo ciclo del event loop
      setTimeout(() => {
          const recheckedPlayer = allShortPlayers[videoId];
          if (recheckedPlayer && typeof recheckedPlayer.playVideo === 'function' && entry.isIntersecting && entry.intersectionRatio >= 0.8) {
              handleShortVisibility(entry);
          }
      }, 50); // Pequeño retraso
      return;
    }

    handleShortVisibility(entry);
  });
}, { threshold: 0.8 }); // Activa cuando el 80% del elemento es visible

function handleShortVisibility(entry) {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    const player = allShortPlayers[videoId];

    if (!player) return; // Salir si el reproductor aún no está disponible

    if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
      // Si este short es el nuevo activo
      if (currentActiveShortId && currentActiveShortId !== videoId && allShortPlayers[currentActiveShortId]) {
        // Pausar y reiniciar el short anterior si es diferente
        allShortPlayers[currentActiveShortId].pauseVideo();
        allShortPlayers[currentActiveShortId].seekTo(0); // Reiniciar video anterior
        updateShortControls(currentActiveShortId, YT.PlayerState.PAUSED, allShortPlayers[currentActiveShortId].isMuted());
        console.log(`Pausado y reiniciado: ${currentActiveShortId}`);
      }

      // Reproducir el short actual (silenciado)
      player.playVideo();
      player.mute(); // Asegurar que inicie silenciado
      updateShortControls(videoId, YT.PlayerState.PLAYING, true); // Actualiza iconos de control
      currentActiveShortId = videoId;
      console.log(`Reproduciendo: ${videoId}`);

      // Marcar como visto si se ha reproducido una parte significativa
      // (ej. al menos 5 segundos después de que inicie la reproducción)
      setTimeout(() => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING && player.getCurrentTime() > 5) {
            markVideoAsViewed(videoId);
            console.log(`Short ${videoId} marcado como visto (por reproducción).`);
        }
      }, 5000); // Marca como visto después de 5 segundos de reproducción

    } else if (videoId === currentActiveShortId && (!entry.isIntersecting || entry.intersectionRatio < 0.8)) {
      // Si el short activo sale de la vista significativa, páusalo
      if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        updateShortControls(videoId, YT.PlayerState.PAUSED, player.isMuted());
        console.log(`Pausado al salir de vista: ${videoId}`);
      }
      if (videoId === currentActiveShortId) {
        currentActiveShortId = null; // Desactiva el short actual
      }
    }
}


// ======================================================================
// Funciones de Shorts
// ======================================================================

// Función para actualizar los iconos de play/pause y mute en los controles de un short
function updateShortControls(videoId, playerState, isMuted) {
    const shortCard = shortsContainer.querySelector(`.short-card[data-video-id="${videoId}"]`);
    if (!shortCard) return; // Salir si la tarjeta no existe

    const playPauseBtnIcon = shortCard.querySelector(`.short-play-pause-btn i`);
    const muteBtnIcon = shortCard.querySelector(`.short-mute-btn i`);

    if (playPauseBtnIcon) {
        if (playerState === YT.PlayerState.PLAYING) {
            playPauseBtnIcon.textContent = 'pause';
        } else {
            playPauseBtnIcon.textContent = 'play_arrow';
        }
    }

    if (muteBtnIcon) {
        if (isMuted) {
            muteBtnIcon.textContent = 'volume_off';
        } else {
            muteBtnIcon.textContent = 'volume_up';
        }
    }
}

// Función global que la API de YouTube llama cuando está lista.
function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready for shorts app.");
    // Inicia la carga de shorts cuando la API está lista.
    loadShorts();
}

async function loadShorts(pageToken = '') {
    if (isLoadingShorts) return;
    isLoadingShorts = true;

    // Mostrar el indicador de carga apropiado
    if (!pageToken) { // Primera carga
        shortsContainer.innerHTML = `
            <div class="initial-loading-message">
                <div class="spinner"></div>
                Cargando Shorts...
            </div>
        `;
    } else { // Carga de más shorts
        shortsLoadingIndicator.style.display = 'flex';
    }

    const prefs = getPreferences();
    const viewedVideos = getViewedVideos().videos;

    // Generar un sufijo aleatorio basado en el día
    const today = new Date();
    const dailySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    // No usamos el sufijo aleatorio en shorts para evitar que la query sea demasiado larga
    // y para que los videos sean más consistentes entre recargas del mismo día.
    // La aleatoriedad vendrá de las recomendaciones de YouTube y el IntersectionObserver.

    let baseQuery = "videos cristianos infantiles animados shorts"; // Consulta más específica para shorts
    let channelIdsParam = '';

    // Priorizar búsqueda en canales preferidos si existen
    if (prefs.preferredChannels && prefs.preferredChannels.length > 0) {
        channelIdsParam = `&channelId=${prefs.preferredChannels.join(',')}`;
        console.log(`Buscando shorts en canales preferidos: ${prefs.preferredChannels.join(', ')}`);
    }

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(baseQuery)}&type=video&videoDuration=short&maxResults=20&key=${apiKey}&relevanceLanguage=${prefs.language}`;

    if (channelIdsParam) {
        url += channelIdsParam;
    }

    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }

    console.log(`Buscando shorts con URL: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Error HTTP: ${res.status} - ${errorBody.error?.message || errorBody.message || 'Error desconocido de la API.'}`);
        }
        const data = await res.json();

        nextShortsPageToken = data.nextPageToken || null;

        const newShortsItems = data.items.filter(item => item.id.videoId && !viewedVideos[item.id.videoId]);
        console.log(`Shorts nuevos encontrados: ${newShortsItems.length}`);

        // Eliminar el mensaje de carga inicial si ya no es la primera carga o si hay resultados
        if (!pageToken && newShortsItems.length > 0) {
            const initialMessageDiv = shortsContainer.querySelector('.initial-loading-message');
            if (initialMessageDiv) initialMessageDiv.remove();
        }

        if (newShortsItems.length > 0) {
            newShortsItems.forEach(item => {
                createShortCard(item.id.videoId);
            });

            // Si es la primera carga y hay videos, nos aseguramos que el IntersectionObserver
            // revise el primer elemento.
            if (!pageToken) {
                // Al añadir las tarjetas, el IntersectionObserver ya está asignado.
                // Scroll al inicio para asegurar que el primer short sea visible y se active.
                shortsContainer.scrollTop = 0;
            }
        } else {
            if (!pageToken) {
                shortsContainer.innerHTML = "<p class='no-results-message'>No se encontraron shorts nuevos con tus preferencias.<br>Intenta cambiar el idioma o añadir más canales.</p>";
            } else {
                console.log("No hay más shorts nuevos para cargar.");
            }
            nextShortsPageToken = null;
        }

    } catch (error) {
        console.error("Error al buscar shorts:", error);
        shortsContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los shorts.<br>Verifica tu clave API, conexión o preferencias.<br>Detalle: ${error.message}</p>`;
    } finally {
        // Ocultar todos los indicadores de carga al finalizar
        const initialMessageDiv = shortsContainer.querySelector('.initial-loading-message');
        if (initialMessageDiv) initialMessageDiv.style.display = 'none';
        shortsLoadingIndicator.style.display = 'none';
        isLoadingShorts = false;
    }
}

function createShortCard(videoId) {
  const shortCard = document.createElement("div");
  shortCard.className = "short-card";
  shortCard.dataset.videoId = videoId;
  shortCard.innerHTML = `
    <div id="player-${videoId}" class="short-player-wrapper"></div>
    <div class="short-controls">
        <button class="short-play-pause-btn" data-video-id="${videoId}">
            <i class="material-icons">play_arrow</i> <!-- Icono inicial de "Play" -->
        </button>
        <button class="short-mute-btn" data-video-id="${videoId}">
            <i class="material-icons">volume_up</i> <!-- Icono inicial de "Volumen Arriba" -->
        </button>
    </div>
  `;
  shortsContainer.appendChild(shortCard);
  initializeShortPlayer(videoId); // Inicializar el reproductor inmediatamente
  playShortObserver.observe(shortCard); // Observar la nueva tarjeta
}

// Inicializa el reproductor de YouTube para un short específico
function initializeShortPlayer(videoId) {
  if (allShortPlayers[videoId]) {
    return allShortPlayers[videoId]; // Ya existe
  }

  const playerDiv = document.getElementById(`player-${videoId}`);
  if (!playerDiv) {
      console.error(`Player div not found for video ID: ${videoId}`);
      return null;
  }

  allShortPlayers[videoId] = new YT.Player(playerDiv, {
    videoId: videoId,
    playerVars: {
      'autoplay': 0, // Controlado por IntersectionObserver
      'controls': 0, // Ocultar controles nativos
      'disablekb': 1,
      'fs': 0,
      'iv_load_policy': 3,
      'loop': 1,
      'modestbranding': 1,
      'playlist': videoId,
      'rel': 0,
      'showinfo': 0
    },
    events: {
      'onReady': (event) => {
        event.target.mute(); // Mutea el video al iniciar
        updateShortControls(videoId, event.target.getPlayerState(), true); // Actualiza iconos
        console.log(`Reproductor para ${videoId} listo y muteado.`);
        // El IntersectionObserver se encargará de reproducirlo cuando esté visible
      },
      'onStateChange': (event) => {
        updateShortControls(videoId, event.data, event.target.isMuted());
        if (event.data === YT.PlayerState.ENDED) {
            console.log(`Short ${videoId} ha terminado y se reiniciará.`);
            // No es necesario llamar a markVideoAsViewed aquí, ya se hace en handleShortVisibility
        }
      },
      'onError': (event) => {
        console.error(`Error en el reproductor de ${videoId}:`, event.data);
      }
    }
  });
  return allShortPlayers[videoId];
}

// Lógica de Infinite Scroll (detección para cargar más shorts)
shortsContainer.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = shortsContainer;
    const scrollBottom = scrollTop + clientHeight;

    // Detecta cuando el usuario está cerca del final (ej. 80% del contenido cargado)
    // Para Shorts, cargamos un poco antes para que el scroll sea más fluido.
    if (scrollBottom >= scrollHeight * 0.9 && !isLoadingShorts && nextShortsPageToken) {
        loadShorts(nextShortsPageToken);
    }
});

// Evento para ajustar la vista al redimensionar la ventana (ej. cambio de orientación del móvil)
window.addEventListener('resize', () => {
    // Si hay shorts cargados, ajusta el scroll para que el short actual esté en la vista
    const currentCard = shortsContainer.querySelector(`[data-video-id="${currentActiveShortId}"]`);
    if (currentCard) {
        // Calcula la posición para que el short esté en la parte superior del área visible de shortsContainer
        shortsContainer.scrollTop = currentCard.offsetTop;
    }
});

// Carga el script de la API de YouTube al cargar el DOM.
// La función `onYouTubeIframeAPIReady` será llamada por la API una vez que esté lista.
document.addEventListener("DOMContentLoaded", () => {
    // La etiqueta <script src="https://www.youtube.com/iframe_api"></script> ya está en shorts.html
    // La función onYouTubeIframeAPIReady se llamará automáticamente.
});
