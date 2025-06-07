// ======================================================================
// Elementos del DOM para la página principal (index.html)
// ======================================================================
// Desktop Search Elements
const desktopSearchInput = document.getElementById("desktop-search-input");
const desktopSearchButton = document.getElementById("desktop-search-button");
const desktopSuggestionsList = document.getElementById("desktop-suggestions-list");

// Mobile Search Elements
const mobileSearchIconBtn = document.getElementById("mobile-search-icon-btn");
const mobileExpandedSearchContainer = document.getElementById("mobile-expanded-search-container");
const mobileSearchCloseBtn = document.getElementById("mobile-search-close-btn");
const mobileSearchInput = document.getElementById("mobile-search-input");
const mobileSearchSubmitBtn = document.getElementById("mobile-search-submit-btn");
const mobileSuggestionsList = document.getElementById("mobile-suggestions-list");

// Common elements
const videosContainer = document.getElementById("videos-container");
const loadingIndicator = document.getElementById("loading-indicator");
const videoPlayerOverlay = document.getElementById("video-player-overlay");
const closePlayerButton = document.getElementById("close-player-button");
const youtubeIframeContainer = document.getElementById("youtube-iframe-container");

// Custom Player Controls
const playerPlayPauseBtn = document.getElementById('player-play-pause-btn');
const playerMuteBtn = document.getElementById('player-mute-btn');
const playerNextBtn = document.getElementById('player-next-btn'); 
const playerFullscreenBtn = document.getElementById('player-fullscreen-btn'); 
const autoplayToggleBtn = document.getElementById('autoplay-toggle-btn');
const progressBarContainer = document.querySelector('#custom-player-controls .progress-bar-container'); 
const progressBar = document.querySelector('#custom-player-controls .progress-bar');
const currentTimeSpan = document.getElementById('current-time');
const durationSpan = document.getElementById('duration');

let currentVideoPlayer = null;
let nextVideosPageToken = null;
let isLoadingVideos = false;
let currentVideoId = null;
let autoPlayEnabled = false; 
let currentQuery = "canciones infantiles cristianas"; // Almacena la última consulta

// ======================================================================
// Utilidades
// ======================================================================

// Función de Debounce para las sugerencias de búsqueda
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// ======================================================================
// Funciones de la API de YouTube y Reproducción
// ======================================================================

// onYouTubeIframeAPIReady es una función global que la API de YouTube llama cuando está lista.
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for main app.");
  const initialPrefs = getPreferences(); 
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

        if (duration > 0 && currentTime / duration > 0.95 && currentVideoId) {
            markVideoAsViewed(currentVideoId); 
            console.log(`Video ${currentVideoId} marcado como visto.`);
            stopProgressBarUpdates(); 

            if (autoPlayEnabled) {
                console.log("Autoplay ON: buscando siguiente video...");
                playerNextBtn.click(); 
            } else {
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

  currentQuery = query; 

  const prefs = getPreferences(); 
  const viewedVideos = getViewedVideos().videos; 

  const today = new Date();
  const dailySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const randomSuffix = `&_dailySeed=${dailySeed}`; 

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
      url += randomSuffix; 
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
      'controls': 0, 
      'modestbranding': 1,
      'rel': 0,
      'fs': 1, // Habilitar el botón de pantalla completa interno de YouTube
      'origin': window.location.origin // ¡¡¡SOLUCIÓN CLAVE para el error de postMessage!!!
    },
    events: {
      'onReady': (event) => {
          event.target.playVideo();
          startProgressBarUpdates();
          updatePlayerControls(event.target.getPlayerState(), event.target.isMuted());
          console.log(`Player for ${videoId} is ready.`);
      },
      'onStateChange': (event) => {
          updatePlayerControls(event.data, event.target.isMuted());
          if (event.data === YT.PlayerState.ENDED) {
              // La lógica de "visto" y "autoplay" se maneja en updateProgressBar
          }
      },
      'onError': (event) => {
          console.error(`Error de YouTube Player para ${videoId}:`, event.data);
          stopProgressBarUpdates();
          // Códigos de error: 100 (no encontrado/privado), 101/150 (incrustación deshabilitada)
          if (event.data === 100 || event.data === 101 || event.data === 150) {
              console.warn(`Video ${videoId} no disponible o no incrustable. Saltando al siguiente.`);
              markVideoAsViewed(videoId); // Marcar como visto para saltar
              if (playerNextBtn) { // Asegurarse de que el botón existe antes de clickear
                playerNextBtn.click(); // Intenta reproducir el siguiente video
              } else {
                closePlayerButton.click(); // Si no hay botón next, simplemente cierra
              }
          } else {
              // Para otros errores, simplemente cierra el reproductor
              closePlayerButton.click();
          }
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
        savePreferences(prefs); 
        updatePlayerControls(currentVideoPlayer ? currentVideoPlayer.getPlayerState() : -1, currentVideoPlayer ? currentVideoPlayer.isMuted() : false);
        console.log("Autoplay es ahora: " + autoPlayEnabled);
    });
}

// Lógica para el botón "Siguiente"
if (playerNextBtn) {
    playerNextBtn.addEventListener('click', () => {
        console.log("Botón Siguiente clickeado.");
        closePlayerButton.click(); 
        searchYouTubeVideos(currentQuery, nextVideosPageToken || ''); 
    });
}

// Lógica para el botón de pantalla completa
if (playerFullscreenBtn) {
    playerFullscreenBtn.addEventListener('click', () => {
        const iframe = youtubeIframeContainer.querySelector('iframe');
        if (iframe) {
            if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
            } else if (iframe.mozRequestFullScreen) { // Firefox
                iframe.mozRequestFullScreen();
            } else if (iframe.webkitRequestFullscreen) { // Chrome, Safari and Opera
                iframe.webkitRequestFullscreen();
            } else if (iframe.msRequestFullscreen) { // IE/Edge
                iframe.msRequestFullscreen();
            }
        }
    });
}
// Escucha eventos de cambio de pantalla completa del navegador (para salir con ESC, etc.)
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        console.log("Salió de pantalla completa.");
    }
});
document.addEventListener('webkitfullscreenchange', () => { /* ... */ });
document.addEventListener('mozfullscreenchange', () => { /* ... */ });
document.addEventListener('msfullscreenchange', () => { /* ... */ });


// ======================================================================
// Lógica de la Barra de Búsqueda y Sugerencias
// ======================================================================

// Función para buscar sugerencias
const fetchSuggestions = async (inputElement, suggestionsListElement) => {
    const query = inputElement.value.trim();
    if (query.length < 2) { // Mínimo 2 caracteres para sugerencias
        suggestionsListElement.innerHTML = '';
        suggestionsListElement.classList.add('hidden');
        return;
    }

    try {
        // API no oficial de Google para sugerencias de YouTube
        const response = await fetch(`https://clients1.google.com/complete/search?client=youtube&hl=${getPreferences().language}&gs_ri=youtube&ds=yt&q=${encodeURIComponent(query)}`);
        const text = await response.text();
        // La respuesta es un String que parece JSONP, necesitamos parsearlo manualmente.
        const data = JSON.parse(text.substring(text.indexOf('[') + 0, text.lastIndexOf(']') + 1));

        suggestionsListElement.innerHTML = '';
        if (data && data[0] && data[0].length > 0) {
            data[0].forEach(item => {
                const suggestionText = item[0];
                const li = document.createElement('li');
                li.innerHTML = `<i class="material-icons">search</i><span>${suggestionText}</span>`;
                li.addEventListener('click', () => {
                    inputElement.value = suggestionText;
                    suggestionsListElement.classList.add('hidden');
                    // Simular clic en el botón de búsqueda para iniciar la búsqueda
                    if (inputElement === desktopSearchInput && desktopSearchButton) {
                        desktopSearchButton.click();
                    } else if (inputElement === mobileSearchInput && mobileSearchSubmitBtn) {
                        mobileSearchSubmitBtn.click();
                    }
                });
                suggestionsListElement.appendChild(li);
            });
            suggestionsListElement.classList.remove('hidden');
        } else {
            suggestionsListElement.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        suggestionsListElement.classList.add('hidden');
    }
};

// --- Desktop Search ---
if (desktopSearchInput) {
    desktopSearchInput.addEventListener('input', debounce(() => {
        fetchSuggestions(desktopSearchInput, desktopSuggestionsList);
    }, 300));

    desktopSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            desktopSearchButton.click();
            desktopSuggestionsList.classList.add('hidden'); // Ocultar sugerencias al buscar
        }
    });

    desktopSearchButton.addEventListener('click', () => {
        const query = desktopSearchInput.value.trim();
        if (query) {
            searchYouTubeVideos(query, '');
        }
        desktopSuggestionsList.classList.add('hidden');
    });

    // Ocultar sugerencias al hacer click fuera
    document.addEventListener('click', (event) => {
        if (!desktopSearchInput.contains(event.target) && !desktopSuggestionsList.contains(event.target)) {
            desktopSuggestionsList.classList.add('hidden');
        }
    });
}

// --- Mobile Search ---
if (mobileSearchIconBtn) {
    mobileSearchIconBtn.addEventListener('click', () => {
        mobileExpandedSearchContainer.classList.add('active');
        mobileSearchInput.focus();
    });
}

if (mobileSearchCloseBtn) {
    mobileSearchCloseBtn.addEventListener('click', () => {
        mobileExpandedSearchContainer.classList.remove('active');
        mobileSearchInput.value = ''; // Limpiar input
        mobileSuggestionsList.classList.add('hidden'); // Ocultar sugerencias
    });
}

if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', debounce(() => {
        fetchSuggestions(mobileSearchInput, mobileSuggestionsList);
    }, 300));

    mobileSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            mobileSearchSubmitBtn.click();
            mobileSuggestionsList.classList.add('hidden'); // Ocultar sugerencias al buscar
        }
    });
}

if (mobileSearchSubmitBtn) {
    mobileSearchSubmitBtn.addEventListener('click', () => {
        const query = mobileSearchInput.value.trim();
        if (query) {
            searchYouTubeVideos(query, '');
            mobileExpandedSearchContainer.classList.remove('active'); // Cerrar barra de búsqueda
        }
        mobileSuggestionsList.classList.add('hidden');
    });
}

// Click en el logo para ir a inicio y recargar videos predeterminados
const headerLogo = document.querySelector('.header-logo');
if (headerLogo) {
    headerLogo.addEventListener('click', () => {
        searchYouTubeVideos("canciones infantiles cristianas");
        // Asegurarse de que la barra de búsqueda móvil se cierre si está abierta
        if (mobileExpandedSearchContainer && mobileExpandedSearchContainer.classList.contains('active')) {
            mobileExpandedSearchContainer.classList.remove('active');
            mobileSearchInput.value = '';
            mobileSuggestionsList.classList.add('hidden');
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
    searchYouTubeVideos(currentQuery, ''); 
});
