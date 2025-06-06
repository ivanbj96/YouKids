// ======================================================================
// Elementos del DOM para la página principal (index.html)
// ======================================================================
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const videosContainer = document.getElementById("videos-container");
const loadingIndicator = document.getElementById("loading-indicator");
const videoPlayerOverlay = document.getElementById("video-player-overlay");
const closePlayerButton = document.getElementById("close-player-button");
const youtubeIframeContainer = document.getElementById("youtube-iframe-container");

// Custom Player Controls
const playerPlayPauseBtn = document.getElementById('player-play-pause-btn');
const playerMuteBtn = document.getElementById('player-mute-btn');
const playerNextBtn = document.getElementById('player-next-btn'); // Nuevo botón
const autoplayToggleBtn = document.getElementById('autoplay-toggle-btn');
const progressBarContainer = document.querySelector('#custom-player-controls .progress-bar-container');
const progressBar = document.querySelector('#custom-player-controls .progress-bar');
const currentTimeSpan = document.getElementById('current-time');
const durationSpan = document.getElementById('duration');

let currentVideoPlayer = null;
let nextVideosPageToken = null;
let isLoadingVideos = false;
let currentVideoId = null;
let autoPlayEnabled = false; // Se inicializa desde getPreferences()
let currentQuery = "canciones infantiles cristianas"; // Almacena la última consulta

// ======================================================================
// Funciones de la API de YouTube y Reproducción
// ======================================================================

// onYouTubeIframeAPIReady es una función global que la API de YouTube llama cuando está lista.
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for main app.");
  // Inicializa el estado de autoplay al cargar las preferencias
  const initialPrefs = getPreferences(); // `getPreferences` viene de common.js
  autoPlayEnabled = initialPrefs.autoplay;
  if (autoplayToggleBtn) {
      autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
  }
  searchYouTubeVideos(currentQuery); // Búsqueda inicial por defecto
}

// Formatear tiempo (ej. 150 -> 2:30)
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
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
            markVideoAsViewed(currentVideoId); // `markVideoAsViewed` viene de common.js
            console.log(`Video ${currentVideoId} marcado como visto.`);
            stopProgressBarUpdates(); // Detener el intervalo

            if (autoPlayEnabled) {
                console.log("Autoplay ON: buscando siguiente video...");
                // Esto simulará el botón "Siguiente" al final del video
                playerNextBtn.click(); 
            } else {
                // Si autoplay no está activo, simplemente cierra el reproductor.
                closePlayerButton.click();
            }
        }
    }
}

let progressInterval;

function startProgressBarUpdates() {
    clearInterval(progressInterval);
    progressInterval = setInterval(updateProgressBar, 1000);
}

function stopProgressBarUpdates() {
    clearInterval(progressInterval);
}

// Manejo del clic en la barra de progreso para buscar en el video
if (progressBarContainer) {
    progressBarContainer.addEventListener('click', (e) => {
        if (currentVideoPlayer && currentVideoPlayer.getDuration) {
            const rect = progressBarContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = currentVideoPlayer.getDuration() * percentage;
            currentVideoPlayer.seekTo(newTime, true);
        }
    });
}


async function searchYouTubeVideos(query, pageToken = '') {
  if (isLoadingVideos) return;
  isLoadingVideos = true;
  loadingIndicator.style.display = 'block';

  currentQuery = query; // Actualiza la consulta actual

  const prefs = getPreferences(); // `getPreferences` viene de common.js
  const viewedVideos = getViewedVideos().videos; // `getViewedVideos` viene de common.js

  // Generar un sufijo aleatorio basado en el día para la "aleatoriedad"
  const today = new Date();
  const dailySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const randomSuffix = `&_dailySeed=${dailySeed}`; // Solo para variar la URL y evitar caché, no es un param de YT

  let finalQuery = `${query} para niños cristianos canciones biblicas historias animadas`;
  let channelIdsParam = '';

  if (prefs.preferredChannels && prefs.preferredChannels.length > 0) {
      channelIdsParam = `&channelId=${prefs.preferredChannels.join(',')}`;
      console.log(`Buscando en canales preferidos: ${prefs.preferredChannels.join(', ')}`);
  }

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(finalQuery)}&type=video&maxResults=20&key=${window.apiKey}&relevanceLanguage=${prefs.language}`;

  if (channelIdsParam) {
      url += channelIdsParam;
  } else {
      url += randomSuffix; // Solo si no hay canales preferidos, para introducir aleatoriedad
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
      if (!pageToken) {
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
      nextVideosPageToken = null;
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
  currentVideoId = videoId;
  videoPlayerOverlay.classList.add('active');

  youtubeIframeContainer.innerHTML = '';

  if (currentVideoPlayer) {
    currentVideoPlayer.destroy();
  }

  currentVideoPlayer = new YT.Player(youtubeIframeContainer, {
    videoId: videoId,
    playerVars: {
      'autoplay': 1,
      'controls': 0, // Seguimos usando controles personalizados
      'modestbranding': 1,
      'rel': 0
    },
    events: {
      'onReady': (event) => {
          event.target.playVideo();
          startProgressBarUpdates();
          updatePlayerControls(event.target.getPlayerState(), event.target.isMuted());
      },
      'onStateChange': (event) => {
          updatePlayerControls(event.data, event.target.isMuted());
          if (event.data === YT.PlayerState.ENDED) {
              // La lógica de "visto" y "autoplay" se maneja en updateProgressBar
          }
      },
      'onError': (event) => {
          console.error('Error de YouTube Player:', event.data);
          stopProgressBarUpdates();
          // Intentar cargar el siguiente video si hay un error
          playerNextBtn.click();
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
if (playerPlayPauseBtn) {
    playerPlayPauseBtn.addEventListener('click', () => {
        if (currentVideoPlayer) {
            if (currentVideoPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
                currentVideoPlayer.pauseVideo();
            } else {
                currentVideoPlayer.playVideo();
            }
        }
    });
}

if (playerMuteBtn) {
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
}

if (autoplayToggleBtn) {
    autoplayToggleBtn.addEventListener('click', () => {
        autoPlayEnabled = !autoPlayEnabled;
        const prefs = getPreferences();
        prefs.autoplay = autoPlayEnabled;
        savePreferences(prefs); // Guarda la preferencia de autoplay
        updatePlayerControls(currentVideoPlayer ? currentVideoPlayer.getPlayerState() : -1, currentVideoPlayer ? currentVideoPlayer.isMuted() : false);
        console.log("Autoplay es ahora: " + autoPlayEnabled);
    });
}

// Lógica para el botón "Siguiente"
if (playerNextBtn) {
    playerNextBtn.addEventListener('click', () => {
        console.log("Botón Siguiente clickeado.");
        closePlayerButton.click(); // Cierra el reproductor actual
        searchYouTubeVideos(currentQuery, nextVideosPageToken || ''); // Carga más videos o una nueva búsqueda
    });
}

// Event listener para el botón de búsqueda
if (searchButton) {
    searchButton.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) {
            searchYouTubeVideos(query, ''); // Inicia una nueva búsqueda
        } else {
            searchYouTubeVideos("canciones infantiles cristianas", ''); // Búsqueda predeterminada si el campo está vacío
        }
    });
}

// Event listener para la tecla Enter en el campo de búsqueda
if (searchInput) {
    searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            searchButton.click();
        }
    });
}

// Click en el logo para ir a inicio y recargar videos predeterminados
const headerLogo = document.querySelector('.header-logo');
if (headerLogo) {
    headerLogo.addEventListener('click', () => {
        searchYouTubeVideos("canciones infantiles cristianas");
    });
}

// Cierra el reproductor y detiene el video
if (closePlayerButton) {
    closePlayerButton.addEventListener("click", () => {
        videoPlayerOverlay.classList.remove('active');
        if (currentVideoPlayer) {
            currentVideoPlayer.stopVideo();
            currentVideoPlayer.destroy();
            currentVideoPlayer = null;
            youtubeIframeContainer.innerHTML = '';
            stopProgressBarUpdates();
            currentVideoId = null;
        }
    });
}

// Infinite Scroll para la búsqueda principal
if (videosContainer) {
    videosContainer.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = videosContainer;
        if (scrollTop + clientHeight >= scrollHeight - 300 && !isLoadingVideos && nextVideosPageToken) {
            searchYouTubeVideos(currentQuery, nextVideosPageToken);
        }
    });
}

// Listener para el evento `preferencesUpdated` del common.js
window.addEventListener('preferencesUpdated', () => {
    console.log('Preferencias actualizadas, recargando videos en la página principal.');
    autoPlayEnabled = getPreferences().autoplay;
    if (autoplayToggleBtn) {
        autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
    }
    searchYouTubeVideos(currentQuery, ''); // Volver a cargar la búsqueda para aplicar el nuevo idioma/canales
});
