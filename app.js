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
const playerNextBtn = document.getElementById('player-next-btn');
const autoplayToggleBtn = document.getElementById('autoplay-toggle-btn');
const playerFullscreenBtn = document.getElementById('player-fullscreen-btn'); // Nuevo botón
const progressBarContainer = document.querySelector('#custom-player-controls .progress-bar-container');
const progressBar = document.querySelector('#custom-player-controls .progress-bar');
const currentTimeSpan = document.getElementById('current-time');
const durationSpan = document.getElementById('duration');

let currentVideoPlayer = null;
let nextVideosPageToken = null;
let isLoadingVideos = false;
let currentVideoId = null;
let autoPlayEnabled = false;
let currentQuery = "canciones infantiles cristianas";

// ======================================================================
// Funciones de la API de YouTube y Reproducción
// ======================================================================

function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for main app.");
  const initialPrefs = getPreferences();
  autoPlayEnabled = initialPrefs.autoplay;
  if (autoplayToggleBtn) {
      autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
  }
  searchYouTubeVideos(currentQuery);
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

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

            if (autoPlayEnabled && playerNextBtn) { // Asegúrate de que el botón exista
                console.log("Autoplay ON: buscando siguiente video...");
                playerNextBtn.click(); // Trigger next video
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

  youtubeIframeContainer.innerHTML = ''; // Clear existing content

  if (currentVideoPlayer) {
    currentVideoPlayer.destroy();
  }

  currentVideoPlayer = new YT.Player(youtubeIframeContainer, {
    videoId: videoId,
    playerVars: {
      'autoplay': 1,
      'controls': 0, // Keep custom controls
      'modestbranding': 1,
      'rel': 0,
      'fs': 0 // Ensure native fullscreen button is off (we use custom)
    },
    events: {
      'onReady': (event) => {
          event.target.playVideo();
          startProgressBarUpdates();
          updatePlayerControls(event.target.getPlayerState(), event.target.isMuted());
      },
      'onStateChange': (event) => {
          updatePlayerControls(event.data, event.target.isMuted());
          // End of video logic is now mostly in updateProgressBar
      },
      'onError': (event) => {
          console.error('Error de YouTube Player:', event.data);
          stopProgressBarUpdates();
          // If video has an error, try to load next one instead of just stopping
          if (playerNextBtn) { // Ensure button exists
              playerNextBtn.click();
          } else {
              closePlayerButton.click(); // Fallback to close
          }
      }
    }
  });
}

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
    // Update fullscreen icon (optional: change if in fullscreen)
    if (playerFullscreenBtn) {
        playerFullscreenBtn.querySelector('i').textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
    }
}

// Event Listeners for player controls
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

// Fullscreen button logic
if (playerFullscreenBtn) {
    playerFullscreenBtn.addEventListener('click', () => {
        const playerElement = youtubeIframeContainer; // The container holding the iframe
        if (!document.fullscreenElement) {
            if (playerElement.requestFullscreen) {
                playerElement.requestFullscreen();
            } else if (playerElement.mozRequestFullScreen) { /* Firefox */
                playerElement.mozRequestFullScreen();
            } else if (playerElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                playerElement.webkitRequestFullscreen();
            } else if (playerElement.msRequestFullscreen) { /* IE/Edge */
                playerElement.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
        }
        updatePlayerControls(currentVideoPlayer ? currentVideoPlayer.getPlayerState() : -1, currentVideoPlayer ? currentVideoPlayer.isMuted() : false);
    });
}

// Listen for fullscreen change to update icon
document.addEventListener('fullscreenchange', () => {
    updatePlayerControls(currentVideoPlayer ? currentVideoPlayer.getPlayerState() : -1, currentVideoPlayer ? currentVideoPlayer.isMuted() : false);
});
document.addEventListener('webkitfullscreenchange', () => { // For Safari/Chrome on iOS
    updatePlayerControls(currentVideoPlayer ? currentVideoPlayer.getPlayerState() : -1, currentVideoPlayer ? currentVideoPlayer.isMuted() : false);
});


// Logic for "Next" button
if (playerNextBtn) {
    playerNextBtn.addEventListener('click', () => {
        console.log("Botón Siguiente clickeado. Cargando más videos...");
        closePlayerButton.click(); // Close current player
        // Reuse current search query and try to get next page token
        // If no next page token, it will perform a fresh search based on query
        searchYouTubeVideos(currentQuery, nextVideosPageToken || '');
    });
}

if (searchButton) {
    searchButton.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) {
            searchYouTubeVideos(query, '');
        } else {
            searchYouTubeVideos("canciones infantiles cristianas", '');
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            searchButton.click();
        }
    });
}

const headerLogo = document.querySelector('.header-logo');
if (headerLogo) {
    headerLogo.addEventListener('click', () => {
        searchYouTubeVideos("canciones infantiles cristianas");
    });
}

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

if (videosContainer) {
    videosContainer.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = videosContainer;
        if (scrollTop + clientHeight >= scrollHeight - 300 && !isLoadingVideos && nextVideosPageToken) {
            searchYouTubeVideos(currentQuery, nextVideosPageToken);
        }
    });
}

window.addEventListener('preferencesUpdated', () => {
    console.log('Preferencias actualizadas, recargando videos en la página principal.');
    autoPlayEnabled = getPreferences().autoplay;
    if (autoplayToggleBtn) {
        autoplayToggleBtn.classList.toggle('active', autoPlayEnabled);
    }
    searchYouTubeVideos(currentQuery, '');
});
