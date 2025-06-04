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
// Elementos del DOM para la página principal (index.html)
// ======================================================================
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const videosContainer = document.getElementById("videos-container");
const loadingIndicator = document.getElementById("loading-indicator");
const videoPlayerOverlay = document.getElementById("video-player-overlay"); // Renombrado para claridad
const closePlayerButton = document.getElementById("close-player-button");
const youtubeIframeContainer = document.getElementById("youtube-iframe-container"); // Renombrado para claridad

// Custom Player Controls
const playerPlayPauseBtn = document.getElementById('player-play-pause-btn');
const playerMuteBtn = document.getElementById('player-mute-btn');
const autoplayToggleBtn = document.getElementById('autoplay-toggle-btn');
const progressBar = document.querySelector('#custom-player-controls .progress-bar');
const currentTimeSpan = document.getElementById('current-time');
const durationSpan = document.getElementById('duration');

let currentVideoPlayer = null; // Para la instancia del reproductor de YouTube API
let nextVideosPageToken = null; // Para la paginación de videos de la búsqueda
let isLoadingVideos = false; // Para controlar la carga de videos y evitar solicitudes duplicadas
let currentVideoId = null; // Para el ID del video actualmente reproduciéndose
let autoPlayEnabled = false; // Estado de la reproducción automática

// ======================================================================
// Preferencias de Usuario (Idioma, Canales Preferidos, Videos Vistos)
// ======================================================================
const preferencesModal = document.getElementById('preferences-modal');
const settingsButton = document.getElementById('settings-button');
const closePreferencesModalButton = document.getElementById('close-preferences-modal');
const savePreferencesButton = document.getElementById('save-preferences-btn');
const languageSelect = document.getElementById('language-select');
const channelIdsInput = document.getElementById('channel-ids-input');

// Funciones para gestionar preferencias en localStorage
const PREFS_KEY = 'youkids_preferences';
const VIEWED_VIDEOS_KEY = 'youkids_viewed_videos';

function getDefaultPreferences() {
    return {
        language: 'es',
        preferredChannels: [], // Array de IDs de canal
        autoplay: false
    };
}

function getPreferences() {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...getDefaultPreferences(), ...JSON.parse(stored) } : getDefaultPreferences();
}

function savePreferences(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    // Reaplicar configuración de autoplay inmediatamente
    autoPlayEnabled = prefs.autoplay;
    if (autoplayToggleBtn) {
        autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
    }
}

function getTodayFormattedDate() {
    const today = new Date();
    return today.toISOString().slice(0, 10); // Formato YYYY-MM-DD
}

function getViewedVideos() {
    const stored = localStorage.getItem(VIEWED_VIDEOS_KEY);
    const data = stored ? JSON.parse(stored) : { date: '', videos: {} };

    // Limpiar videos vistos de días anteriores (ej. cada 7 días o cada día si queremos más rotación)
    // Para el requisito de "ver otro día", podemos limpiarlo cada día.
    const todayDate = getTodayFormattedDate();
    if (data.date !== todayDate) {
        console.log("Limpiando videos vistos de días anteriores.");
        return { date: todayDate, videos: {} }; // Reinicia la lista para el nuevo día
    }
    return data;
}

function markVideoAsViewed(videoId) {
    const viewedData = getViewedVideos();
    viewedData.videos[videoId] = true; // Simplemente marcamos como visto
    localStorage.setItem(VIEWED_VIDEOS_KEY, JSON.stringify(viewedData));
}

// ======================================================================
// Lógica para el botón de instalación de la PWA (compartido entre index y shorts)
// ======================================================================
let deferredPrompt;
const installButtonContainer = document.getElementById('install-button-container');
const installButton = document.getElementById('install-button');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installButtonContainer) {
    installButtonContainer.style.display = 'flex';
    console.log('Evento beforeinstallprompt disparado. Botón de instalación visible.');
  }
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (installButtonContainer) {
      installButtonContainer.style.display = 'none';
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Respuesta del usuario al prompt de instalación: ${outcome}`);
      deferredPrompt = null;
      if (outcome === 'accepted') {
        console.log('YouKids PWA fue instalada con éxito!');
      } else {
        console.log('Instalación de YouKids PWA fue cancelada.');
      }
    } else {
      alert('Para instalar YouKids, usa la opción "Añadir a pantalla de inicio" en el menú de tu navegador (normalmente en los 3 puntos o el icono de compartir).');
    }
  });
}

// ======================================================================
// Registro del Service Worker (Solo se registra una vez en app.js)
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
// Lógica de búsqueda y reproducción de videos para la página principal (index.html)
// ======================================================================

// onYouTubeIframeAPIReady es una función global que la API de YouTube llama cuando está lista.
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for main app.");
}

// Formatear tiempo (ej. 150 -> 2:30)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Actualizar barra de progreso y tiempos
function updateProgressBar() {
    if (currentVideoPlayer && currentVideoPlayer.getCurrentTime && currentVideoPlayer.getDuration) {
        const currentTime = currentVideoPlayer.getCurrentTime();
        const duration = currentVideoPlayer.getDuration();
        const progress = (currentTime / duration) * 100;

        progressBar.style.width = `${progress}%`;
        currentTimeSpan.textContent = formatTime(currentTime);
        durationSpan.textContent = formatTime(duration);

        // Marcar como visto si el video ha terminado (aproximadamente)
        if (duration > 0 && currentTime / duration > 0.95 && currentVideoId) {
            markVideoAsViewed(currentVideoId);
            console.log(`Video ${currentVideoId} marcado como visto.`);
            // Si el autoplay está activo, reproducir el siguiente video
            if (autoPlayEnabled) {
                // Implementar lógica para cargar y reproducir el siguiente video
                console.log("Autoplay ON: buscando siguiente video...");
                // Podríamos buscar el siguiente video en la lista actual o hacer una nueva búsqueda.
                // Por simplicidad para este ejemplo, cerraremos el reproductor.
                // En una app real, podrías tener una lista de reproducción.
                closePlayerButton.click(); // Cierra el reproductor para cargar nuevos
            }
        }
    }
}

let progressInterval;

function startProgressBarUpdates() {
    clearInterval(progressInterval); // Limpiar cualquier intervalo anterior
    progressInterval = setInterval(updateProgressBar, 1000); // Actualizar cada segundo
}

function stopProgressBarUpdates() {
    clearInterval(progressInterval);
}

async function searchYouTubeVideos(query, pageToken = '') {
  if (isLoadingVideos) return;
  isLoadingVideos = true;
  loadingIndicator.style.display = 'block';

  const prefs = getPreferences();
  const viewedVideos = getViewedVideos().videos;

  // Generar un sufijo aleatorio basado en el día para la "aleatoriedad"
  const today = new Date();
  const dailySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const randomSuffix = `&random_seed=${dailySeed}`; // No es un parámetro real de YT API, solo para variar la query

  let finalQuery = `${query} para niños cristianos canciones biblicas historias animadas`; // Consulta más robusta
  let channelIdsParam = '';

  // Priorizar búsqueda en canales preferidos si existen
  if (prefs.preferredChannels && prefs.preferredChannels.length > 0) {
      // YouTube API permite buscar en múltiples canales si están unidos por coma
      channelIdsParam = `&channelId=${prefs.preferredChannels.join(',')}`;
      console.log(`Buscando en canales preferidos: ${prefs.preferredChannels.join(', ')}`);
  }

  // La URL base sin el sufijo aleatorio, que no es un parámetro real
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(finalQuery + (channelIdsParam ? '' : randomSuffix))}&type=video&maxResults=20&key=${apiKey}&relevanceLanguage=${prefs.language}`;

  if (channelIdsParam) {
      url += channelIdsParam;
  }

  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  console.log(`Buscando videos con URL: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Error HTTP: ${res.status} - ${errorBody.error?.message || errorBody.message || 'Error desconocido de la API.'}`);
    }
    const data = await res.json();

    const newVideos = data.items.filter(item => item.id.videoId && !viewedVideos[item.id.videoId]);
    console.log(`Videos nuevos encontrados: ${newVideos.length}`);

    if (newVideos.length > 0) {
      if (!pageToken) { // Si es una nueva búsqueda, limpia los videos anteriores
        videosContainer.innerHTML = '';
      }
      newVideos.forEach(item => {
        createVideoCard(item.id.videoId, item.snippet.title, item.snippet.thumbnails.high.url);
      });
      nextVideosPageToken = data.nextPageToken || null;
    } else {
      if (!pageToken) {
        videosContainer.innerHTML = "<p class='no-results-message'>No se encontraron videos nuevos con tus preferencias.<br>Intenta cambiar el idioma o añadir más canales.</p>";
      } else {
        console.log("No hay más videos nuevos para cargar.");
      }
      nextVideosPageToken = null; // No hay más páginas
    }

  } catch (error) {
    console.error("Error al buscar videos:", error);
    videosContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los videos.<br>Verifica tu clave API, conexión o preferencias.<br>Detalle: ${error.message}</p>`;
  } finally {
    loadingIndicator.style.display = 'none';
    isLoadingVideos = false;
  }
}

function createVideoCard(videoId, title, thumbnailUrl) {
  const videoCard = document.createElement("div");
  videoCard.className = "video-card";
  videoCard.innerHTML = `
    <img src="${thumbnailUrl}" alt="${title}" class="video-thumbnail">
    <h3 class="video-title">${title}</h3>
  `;
  videoCard.addEventListener("click", () => playVideo(videoId));
  videosContainer.appendChild(videoCard);
}

function playVideo(videoId) {
  currentVideoId = videoId; // Guarda el ID del video que se está reproduciendo
  videoPlayerOverlay.classList.add('active');

  youtubeIframeContainer.innerHTML = ''; // Limpiar el contenido del wrapper

  if (currentVideoPlayer) {
    currentVideoPlayer.destroy();
  }

  currentVideoPlayer = new YT.Player(youtubeIframeContainer, {
    videoId: videoId,
    playerVars: {
      'autoplay': 1,      // Inicia la reproducción automáticamente
      'controls': 0,      // Ocultar controles nativos, usaremos los nuestros
      'modestbranding': 1,
      'rel': 0
    },
    events: {
      'onReady': (event) => {
          event.target.playVideo();
          startProgressBarUpdates();
          // Inicializar estado de controles
          updatePlayerControls(event.target.getPlayerState(), event.target.isMuted());
      },
      'onStateChange': (event) => {
          updatePlayerControls(event.data, event.target.isMuted());
          if (event.data === YT.PlayerState.ENDED) {
              stopProgressBarUpdates();
              markVideoAsViewed(currentVideoId); // Asegura que se marque como visto al finalizar
              console.log(`Video ${currentVideoId} finalizado y marcado como visto.`);
              if (autoPlayEnabled) {
                  // Volver a cargar la página principal para una nueva lista
                  // En una app real, aquí se cargaría el siguiente video de una playlist
                  closePlayerButton.click(); // Cierra el reproductor para volver a cargar
                  // Y luego podríamos llamar a searchYouTubeVideos con la query predeterminada para nuevos videos
                  // searchYouTubeVideos("canciones infantiles cristianas", "");
              }
          }
      },
      'onError': (event) => {
          console.error('Error de YouTube Player:', event.data);
          stopProgressBarUpdates();
      }
    }
  });
}

// Función para actualizar los iconos y estado de los controles del reproductor
function updatePlayerControls(playerState, isMuted) {
    if (playerPlayPauseBtn) {
        playerPlayPauseBtn.querySelector('i').textContent = (playerState === YT.PlayerState.PLAYING) ? 'pause' : 'play_arrow';
    }
    if (playerMuteBtn) {
        playerMuteBtn.querySelector('i').textContent = isMuted ? 'volume_off' : 'volume_up';
    }
    if (autoplayToggleBtn) {
        autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
    }
}

// Event Listeners para los controles del reproductor
playerPlayPauseBtn.addEventListener('click', () => {
    if (currentVideoPlayer) {
        if (currentVideoPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            currentVideoPlayer.pauseVideo();
        } else {
            currentVideoPlayer.playVideo();
        }
    }
});

playerMuteBtn.addEventListener('click', () => {
    if (currentVideoPlayer) {
        if (currentVideoPlayer.isMuted()) {
            currentVideoPlayer.unMute();
        } else {
            currentVideoPlayer.mute();
        }
        updatePlayerControls(currentVideoPlayer.getPlayerState(), currentVideoPlayer.isMuted());
    }
});

autoplayToggleBtn.addEventListener('click', () => {
    autoPlayEnabled = !autoPlayEnabled;
    const prefs = getPreferences();
    prefs.autoplay = autoPlayEnabled;
    savePreferences(prefs); // Guarda la preferencia de autoplay
    updatePlayerControls(currentVideoPlayer ? currentVideoPlayer.getPlayerState() : -1, currentVideoPlayer ? currentVideoPlayer.isMuted() : false);
    console.log("Autoplay es ahora: " + autoPlayEnabled);
});

// Event listener para el botón de búsqueda
searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) {
    searchYouTubeVideos(query, ''); // Inicia una nueva búsqueda
  }
});

// Event listener para la tecla Enter en el campo de búsqueda
searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    searchButton.click();
  }
});

// Click en el logo para ir a inicio y recargar videos predeterminados
document.querySelector('.header-logo').addEventListener('click', () => {
    searchYouTubeVideos("canciones infantiles cristianas");
});

// Cierra el reproductor y detiene el video
closePlayerButton.addEventListener("click", () => {
  videoPlayerOverlay.classList.remove('active');
  if (currentVideoPlayer) {
    currentVideoPlayer.stopVideo();
    currentVideoPlayer.destroy();
    currentVideoPlayer = null;
    youtubeIframeContainer.innerHTML = ''; // Limpiar el contenedor del iframe
    stopProgressBarUpdates();
    currentVideoId = null; // Resetear ID de video actual
  }
});

// Infinite Scroll para la búsqueda principal
videosContainer.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = videosContainer;
  if (scrollTop + clientHeight >= scrollHeight - 300 && !isLoadingVideos && nextVideosPageToken) { // 300px antes del final
    searchYouTubeVideos(searchInput.value.trim() || "canciones infantiles cristianas", nextVideosPageToken);
  }
});

// ======================================================================
// Lógica del Modal de Preferencias
// ======================================================================
settingsButton.addEventListener('click', () => {
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
        autoplay: autoPlayEnabled // Mantener el estado actual de autoplay
    };
    savePreferences(newPrefs);
    preferencesModal.classList.remove('active');
    console.log("Preferencias guardadas:", newPrefs);
    // Recargar videos con las nuevas preferencias
    searchYouTubeVideos(searchInput.value.trim() || "canciones infantiles cristianas", '');
});

// Cargar la API de YouTube y realizar la búsqueda inicial al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  // Inicializa el estado de autoplay al cargar las preferencias
  const initialPrefs = getPreferences();
  autoPlayEnabled = initialPrefs.autoplay;
  if (autoplayToggleBtn) { // Asegurarse de que el elemento exista antes de intentar acceder a él
      autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
  }

  // La etiqueta <script src="https://www.youtube.com/iframe_api"></script> ya está en index.html
  // La función onYouTubeIframeAPIReady se llamará automáticamente cuando la API esté lista.
  searchYouTubeVideos("canciones infantiles cristianas"); // Búsqueda inicial por defecto
});
