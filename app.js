// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// Por razones de seguridad, NUNCA expongas tu clave API directamente en el código del lado del cliente en producción.
// Para proyectos reales, utiliza un proxy del lado del servidor para interactuar con la API de YouTube.
// Por ahora, para pruebas locales, reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!
const defaultSearchQuery = "canciones cristianas para niños";

// Elementos del DOM
const videoListContainer = document.getElementById("video-list");
const searchButton = document.getElementById("search-button");
const filterButton = document.getElementById("filter-button");
const searchModal = document.getElementById("search-modal");
const filterModal = document.getElementById("filterModal");
const searchInput = document.getElementById("search-input");
const applySearchButton = document.getElementById("apply-search");
const cancelSearchButton = document.getElementById("cancel-search");
const closeFilterButton = document.getElementById("closeFilter");
const applyFiltersButton = document.getElementById("applyFilters");
const installButton = document.getElementById("installBtn");
const playerSection = document.getElementById("player-section"); // Nueva sección del reproductor

// Elementos de control del reproductor
const playPauseButton = document.getElementById("play-pause-button");
const muteButton = document.getElementById("mute-button");
const playPauseIcon = playPauseButton.querySelector('.material-icons');
const muteIcon = muteButton.querySelector('.material-icons');
const autoplayToggleButton = document.getElementById("autoplay-toggle-button"); // Nuevo botón
const previousVideoButton = document.getElementById("previous-video-button"); // Nuevo botón
const nextVideoButton = document.getElementById("next-video-button"); // Nuevo botón
const fullscreenButton = document.getElementById("fullscreen-button"); // Nuevo botón
const autoplayToggleIcon = autoplayToggleButton.querySelector('.material-icons'); // Icono para autoplay

// Elementos del modal de filtros
const regionFilter = document.getElementById("regionFilter");
const videoGenreFilter = document.getElementById("videoGenreFilter");
const musicGenreFilter = document.getElementById("musicGenreFilter");
const religionFilter = document.getElementById("religionFilter");
const blockedChannelsInput = document.getElementById("blockedChannels");

let deferredPrompt; // Para el evento de instalación de PWA
let player; // Variable global para el reproductor de YouTube
let currentVideoId = null; // ID del video actualmente reproduciéndose
let currentVideoIndex = -1; // Índice del video actual en loadedVideosData
let loadedVideosData = []; // Array de videos cargados desde la API
let isAutoplayEnabled = false; // Estado de la reproducción automática

// --- Funciones de Utilidad ---

/**
 * Muestra u oculta un modal añadiendo/quitando la clase 'show'.
 * @param {HTMLElement} modalElement - El elemento del modal a mostrar/ocultar.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function toggleModal(modalElement, show) {
  if (show) {
    modalElement.classList.add("show");
  } else {
    modalElement.classList.remove("show");
  }
}

/**
 * Guarda las preferencias del usuario en localStorage.
 */
function savePreferences() {
  const preferences = {
    region: regionFilter.value,
    videoGenre: videoGenreFilter.value,
    musicGenre: musicGenreFilter.value,
    religion: religionFilter.value,
    blockedChannels: blockedChannelsInput.value,
    isAutoplayEnabled: isAutoplayEnabled // Guardar estado de autoplay
  };
  localStorage.setItem('youkidsPreferences', JSON.stringify(preferences));
  console.log("Preferencias guardadas:", preferences);
}

/**
 * Carga las preferencias del usuario de localStorage.
 */
function loadPreferences() {
  const savedPreferences = localStorage.getItem('youkidsPreferences');
  if (savedPreferences) {
    const preferences = JSON.parse(savedPreferences);
    regionFilter.value = preferences.region || '';
    videoGenreFilter.value = preferences.videoGenre || '';
    musicGenreFilter.value = preferences.musicGenre || '';
    religionFilter.value = preferences.religion || '';
    blockedChannelsInput.value = preferences.blockedChannels || '';
    isAutoplayEnabled = preferences.isAutoplayEnabled || false; // Cargar estado de autoplay
    updateAutoplayButtonIcon(); // Actualizar icono al cargar preferencias
    console.log("Preferencias cargadas:", preferences);
  }
}

// --- Lógica del Reproductor de YouTube ---

/**
 * Esta función es llamada automáticamente por el IFrame Player API de YouTube
 * cuando el código del reproductor ha sido cargado.
 */
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready.");
  initializePlayer();
}

/**
 * Inicializa el reproductor de YouTube.
 */
function initializePlayer() {
  if (player) return; // Solo inicializa una vez

  player = new YT.Player('player', {
    height: '360',
    width: '640',
    videoId: '', // Se carga un video vacío inicialmente
    playerVars: {
      'autoplay': 0,
      'controls': 0, // No mostrar controles nativos de YouTube
      'modestbranding': 1,
      'rel': 0,
      'playsinline': 1 // Permite que se reproduzca en línea en iOS
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

/**
 * Llamado cuando el reproductor de YouTube está listo.
 * @param {Object} event - El evento onReady.
 */
function onPlayerReady(event) {
  console.log('Reproductor de YouTube listo!');
}

/**
 * Llamado cuando el estado del reproductor cambia.
 * @param {Object} event - El evento onStateChange.
 */
function onPlayerStateChange(event) {
  const playerState = event.data;

  // Actualizar icono de play/pause
  if (playerState === YT.PlayerState.PLAYING) {
    playPauseIcon.textContent = 'pause';
  } else if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED) {
    playPauseIcon.textContent = 'play_arrow';
  }

  // Si el video termina y la reproducción automática está activa, ir al siguiente
  if (playerState === YT.PlayerState.ENDED && isAutoplayEnabled) {
    playNextVideo();
  }
  updateMuteButtonIcon(); // Asegurar que el icono de mute esté correcto
}

/**
 * Carga y reproduce un video específico en el reproductor.
 * @param {string} videoId - El ID del video de YouTube a cargar.
 * @param {number} index - El índice del video en loadedVideosData.
 */
function loadAndPlayVideo(videoId, index) {
  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(videoId);
    currentVideoId = videoId;
    currentVideoIndex = index;
    playerSection.style.display = 'block'; // Mostrar la sección del reproductor
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Desplazarse al inicio para ver el reproductor
    playPauseIcon.textContent = 'pause'; // Asumir que empezará a reproducir
    console.log(`Cargando y reproduciendo: ${videoId}, Index: ${index}`);
  } else {
    console.error("El reproductor de YouTube no está inicializado correctamente.");
    openYouTubeVideo(videoId); // Fallback: abrir en YouTube
  }
}

/**
 * Alterna entre reproducir y pausar el video.
 */
function togglePlayPause() {
  if (!player || typeof player.getPlayerState !== 'function') return;

  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

/**
 * Alterna entre silenciar y desilenciar el video.
 */
function toggleMute() {
  if (!player || typeof player.isMuted !== 'function') return;

  if (player.isMuted()) {
    player.unMute();
  } else {
    player.mute();
  }
  updateMuteButtonIcon();
}

/**
 * Actualiza el icono del botón de silencio/desilencio.
 */
function updateMuteButtonIcon() {
  if (!player || typeof player.isMuted !== 'function') return;
  muteIcon.textContent = player.isMuted() ? 'volume_off' : 'volume_up';
}

/**
 * Alterna el estado de la reproducción automática y actualiza el icono.
 */
function toggleAutoplay() {
  isAutoplayEnabled = !isAutoplayEnabled;
  updateAutoplayButtonIcon();
  savePreferences(); // Guardar el nuevo estado de autoplay
}

/**
 * Actualiza el icono del botón de reproducción automática.
 */
function updateAutoplayButtonIcon() {
  autoplayToggleIcon.textContent = isAutoplayEnabled ? 'loop' : 'autoplay'; // 'loop' o 'repeat' para activado
  autoplayToggleIcon.style.color = isAutoplayEnabled ? 'lightgreen' : 'white';
}

/**
 * Reproduce el siguiente video en la lista.
 */
function playNextVideo() {
  if (loadedVideosData.length === 0) return;

  let nextIndex = currentVideoIndex + 1;
  if (nextIndex >= loadedVideosData.length) {
    nextIndex = 0; // Vuelve al inicio de la lista si se llega al final
    console.log("Fin de la lista de videos, volviendo al inicio.");
  }

  const nextVideo = loadedVideosData[nextIndex];
  loadAndPlayVideo(nextVideo.id.videoId, nextIndex);
}

/**
 * Reproduce el video anterior en la lista.
 */
function playPreviousVideo() {
  if (loadedVideosData.length === 0) return;

  let prevIndex = currentVideoIndex - 1;
  if (prevIndex < 0) {
    prevIndex = loadedVideosData.length - 1; // Va al final de la lista si se llega al inicio
    console.log("Inicio de la lista de videos, yendo al final.");
  }

  const prevVideo = loadedVideosData[prevIndex];
  loadAndPlayVideo(prevVideo.id.videoId, prevIndex);
}

/**
 * Alterna el modo de pantalla completa para el reproductor de YouTube.
 */
function toggleFullscreen() {
  if (!player || typeof player.getIframe !== 'function') return;

  const iframe = player.getIframe();
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (iframe.requestFullscreen) {
    iframe.requestFullscreen();
  } else if (iframe.mozRequestFullScreen) { /* Firefox */
    iframe.mozRequestFullScreen();
  } else if (iframe.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
    iframe.webkitRequestFullscreen();
  } else if (iframe.msRequestFullscreen) { /* IE/Edge */
    iframe.msRequestFullscreen();
  }
}

// --- Lógica de Carga y Filtrado de Videos (API de YouTube) ---

/**
 * Carga videos de YouTube usando la API y los muestra en la lista.
 * Aplica filtros si se proporcionan.
 * @param {Object} options - Objeto con opciones de búsqueda y filtrado.
 */
async function loadVideos({
  query = defaultSearchQuery,
  region = '',
  videoGenre = '',
  musicGenre = '',
  religion = '',
  blockedChannels = []
} = {}) {

  let fullQuery = query;
  if (videoGenre) fullQuery += ` ${videoGenre}`;
  if (musicGenre) fullQuery += ` ${musicGenre}`;
  if (religion) fullQuery += ` ${religion}`;

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(fullQuery)}&type=video&maxResults=20&key=${apiKey}`;

  if (region) {
    url += `&regionCode=${region}`;
  }

  videoListContainer.innerHTML = "<p style='text-align: center; margin-top: 20px;'>Cargando videos...</p>";

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Error HTTP: ${res.status} - ${errorBody.error?.message || errorBody.message || 'Error desconocido de la API.'}`);
    }
    const data = await res.json();

    loadedVideosData = data.items || []; // Almacenar todos los videos para navegación

    videoListContainer.innerHTML = ""; // Limpiar videos existentes
    let filteredItems = loadedVideosData;

    // Filtrado de canales bloqueados (client-side)
    if (blockedChannels.length > 0) {
      const lowercasedBlockedChannels = blockedChannels.map(c => c.toLowerCase());
      filteredItems = filteredItems.filter(item => {
        return !lowercasedBlockedChannels.includes(item.snippet.channelTitle.toLowerCase());
      });
    }

    if (filteredItems.length > 0) {
      filteredItems.forEach((item, index) => {
        if (!item.id || !item.id.videoId) {
          console.warn("Item no es un video o no tiene videoId:", item);
          return;
        }

        const videoCard = document.createElement("div");
        videoCard.className = "video-card";
        // Al hacer clic, carga y reproduce en el reproductor embebido
        videoCard.onclick = () => loadAndPlayVideo(item.id.videoId, loadedVideosData.indexOf(item));

        const channelAvatarUrl = `https://www.google.com/s2/favicons?domain=youtube.com&sz=64`;

        videoCard.innerHTML = `
          <img class="video-thumbnail" src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}">
          <div class="video-info">
            <img class="channel-img" src="${channelAvatarUrl}" alt="Canal">
            <div class="video-details">
              <div class="video-title">${item.snippet.title}</div>
              <div class="channel-name">${item.snippet.channelTitle}</div>
            </div>
          </div>
        `;
        videoListContainer.appendChild(videoCard);
      });
    } else {
      videoListContainer.innerHTML = "<p style='text-align: center; margin-top: 20px;'>No se encontraron videos para esta búsqueda y filtros.</p>";
    }

  } catch (error) {
    console.error("Error al cargar videos:", error);
    videoListContainer.innerHTML = `<p style='text-align: center; margin-top: 20px; color: red;'>Ocurrió un error al cargar los videos.<br>Por favor, verifica tu clave API y conexión a internet.<br>Detalle: ${error.message}</p>`;
  }
}

/**
 * Recoge los valores de los filtros y el término de búsqueda, y llama a loadVideos.
 * Guarda las preferencias después de aplicar.
 */
function applyFiltersAndSearch() {
  const currentSearchTerm = searchInput.value.trim();
  const blockedChannels = blockedChannelsInput.value.split(',').map(ch => ch.trim()).filter(ch => ch !== '');

  loadVideos({
    query: currentSearchTerm || defaultSearchQuery,
    region: regionFilter.value,
    videoGenre: videoGenreFilter.value,
    musicGenre: musicGenreFilter.value,
    religion: religionFilter.value,
    blockedChannels: blockedChannels
  });

  savePreferences(); // Guardar las preferencias del usuario

  toggleModal(searchModal, false);
  toggleModal(filterModal, false);
}


// --- Event Listeners para la UI ---

searchButton.addEventListener("click", () => {
  toggleModal(searchModal, true);
  searchInput.focus();
});
applySearchButton.addEventListener("click", applyFiltersAndSearch);
cancelSearchButton.addEventListener("click", () => {
  toggleModal(searchModal, false);
});
searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    applyFiltersAndSearch();
  }
});

filterButton.addEventListener("click", () => {
  toggleModal(filterModal, true);
});
closeFilterButton.addEventListener("click", () => {
  toggleModal(filterModal, false);
});
applyFiltersButton.addEventListener("click", applyFiltersAndSearch);

// Controles del reproductor
playPauseButton.addEventListener('click', togglePlayPause);
muteButton.addEventListener('click', toggleMute);
autoplayToggleButton.addEventListener('click', toggleAutoplay); // Nuevo listener
previousVideoButton.addEventListener('click', playPreviousVideo); // Nuevo listener
nextVideoButton.addEventListener('click', playNextVideo); // Nuevo listener
fullscreenButton.addEventListener('click', toggleFullscreen); // Nuevo listener

// --- Lógica del Service Worker y PWA Install ---

// Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.error('Fallo el registro del Service Worker:', error);
      });
  });
}

// Evento beforeinstallprompt para el botón de instalación de PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = 'block';
});

// Manejador de clic para el botón de instalación
installButton.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.style.display = 'none';
    console.log(`El usuario ${outcome} el prompt de instalación.`);
  }
});

// Ocultar el botón de instalación si la app ya está instalada o en modo standalone
window.addEventListener('appinstalled', () => {
  installButton.style.display = 'none';
  console.log('YouKids PWA instalada con éxito!');
});

// --- Inicialización ---

// Cargar preferencias y videos al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
  loadPreferences(); // Cargar preferencias guardadas, incluyendo autoplay
  // Usar las preferencias cargadas para la búsqueda inicial
  const initialQuery = searchInput.value.trim() || defaultSearchQuery;
  const blockedChannels = blockedChannelsInput.value.split(',').map(ch => ch.trim()).filter(ch => ch !== '');

  loadVideos({
    query: initialQuery,
    region: regionFilter.value,
    videoGenre: videoGenreFilter.value,
    musicGenre: musicGenreFilter.value,
    religion: religionFilter.value,
    blockedChannels: blockedChannels
  });
});
