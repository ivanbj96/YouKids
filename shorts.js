// ======================================================================
// Elementos del DOM para la página de Shorts (shorts.html)
// ======================================================================
const shortsContainer = document.getElementById("shorts-container");
const shortsLoadingIndicator = document.getElementById("shorts-loading");
const initialLoadingMessage = shortsContainer.querySelector('.initial-loading-message');

// Variables para el IntersectionObserver y control de reproducción
let allShortPlayers = {};
let currentActiveShortId = null;

// Infinite scroll variables
let nextShortsPageToken = null;
let isLoadingShorts = false;


// --- IntersectionObserver para la reproducción de Shorts ---
const playShortObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    let player = allShortPlayers[videoId];

    if (!player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') {
      if (!player) {
          player = initializeShortPlayer(videoId);
      }
      setTimeout(() => {
          const recheckedPlayer = allShortPlayers[videoId];
          if (recheckedPlayer && typeof recheckedPlayer.playVideo === 'function' && entry.isIntersecting && entry.intersectionRatio >= 0.8) {
              handleShortVisibility(entry);
          }
      }, 100);
      return;
    }

    handleShortVisibility(entry);
  });
}, { threshold: 0.8 });

function handleShortVisibility(entry) {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    const player = allShortPlayers[videoId];

    if (!player) return;

    if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
      if (currentActiveShortId && currentActiveShortId !== videoId && allShortPlayers[currentActiveShortId]) {
        allShortPlayers[currentActiveShortId].pauseVideo();
        allShortPlayers[currentActiveShortId].seekTo(0);
        updateShortControls(currentActiveShortId, YT.PlayerState.PAUSED, allShortPlayers[currentActiveShortId].isMuted());
        console.log(`Pausado y reiniciado: ${currentActiveShortId}`);
      }

      player.playVideo();
      player.mute();
      updateShortControls(videoId, YT.PlayerState.PLAYING, true);
      currentActiveShortId = videoId;
      console.log(`Reproduciendo: ${videoId}`);

      setTimeout(() => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING && player.getCurrentTime() > 5) {
            markVideoAsViewed(videoId);
            console.log(`Short ${videoId} marcado como visto (por reproducción).`);
        }
      }, 5000);

    } else if (videoId === currentActiveShortId && (!entry.isIntersecting || entry.intersectionRatio < 0.8)) {
      if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        updateShortControls(videoId, YT.PlayerState.PAUSED, player.isMuted());
        console.log(`Pausado al salir de vista: ${videoId}`);
      }
      if (videoId === currentActiveShortId) {
        currentActiveShortId = null;
      }
    }
}


// ======================================================================
// Funciones de Shorts
// ======================================================================

function updateShortControls(videoId, playerState, isMuted) {
    const shortCard = shortsContainer.querySelector(`.short-card[data-video-id="${videoId}"]`);
    if (!shortCard) return;

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

function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready for shorts app.");
    loadShorts();
}

async function loadShorts(pageToken = '') {
    if (isLoadingShorts) return;
    isLoadingShorts = true;

    if (!pageToken) {
        initialLoadingMessage.style.display = 'flex';
        shortsContainer.querySelectorAll('.short-card').forEach(card => {
            const videoId = card.dataset.videoId;
            if (allShortPlayers[videoId]) {
                try { allShortPlayers[videoId].destroy(); } catch (e) { console.warn("Error destroying player:", e); }
                delete allShortPlayers[videoId];
            }
            playShortObserver.unobserve(card);
            card.remove();
        });
        currentActiveShortId = null;
    } else {
        shortsLoadingIndicator.style.display = 'flex';
    }

    const prefs = getPreferences();
    const viewedVideos = getViewedVideos().videos;

    // Adjusted query to emphasize vertical videos and exclude horizontal formats
    let baseQuery = "videos cristianos infantiles animados verticales populares clips"; 
    let channelIdsParam = '';

    if (prefs.preferredChannels && prefs.preferredChannels.length > 0) {
        channelIdsParam = `&channelId=${prefs.preferredChannels.join(',')}`;
        console.log(`Buscando shorts en canales preferidos: ${prefs.preferredChannels.join(', ')}`);
    }

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(baseQuery)}&type=video&videoDuration=short&maxResults=20&key=${window.apiKey}&relevanceLanguage=${prefs.language}`;

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

        if (newShortsItems.length > 0) {
            newShortsItems.forEach(item => {
                createShortCard(item.id.videoId);
            });

            if (!pageToken) {
                initialLoadingMessage.style.display = 'none';
                shortsContainer.scrollTop = 0;
            }
        } else {
            if (!pageToken) {
                initialLoadingMessage.style.display = 'none';
                shortsContainer.innerHTML = "<p class='no-results-message'>No se encontraron shorts nuevos con tus preferencias.<br>Intenta cambiar el idioma o añadir más canales.</p>";
            } else {
                console.log("No hay más shorts nuevos para cargar.");
            }
            nextShortsPageToken = null;
        }

    } catch (error) {
        console.error("Error al buscar shorts:", error);
        initialLoadingMessage.style.display = 'none';
        shortsContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los shorts.<br>Verifica tu clave API, conexión o preferencias.<br>Detalle: ${error.message}</p>`;
    } finally {
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
            <i class="material-icons">play_arrow</i>
        </button>
        <button class="short-mute-btn" data-video-id="${videoId}">
            <i class="material-icons">volume_up</i>
        </button>
    </div>
  `;
  shortsContainer.appendChild(shortCard);
  playShortObserver.observe(shortCard);
}

function initializeShortPlayer(videoId) {
  if (allShortPlayers[videoId]) {
    return allShortPlayers[videoId];
  }

  const playerDiv = document.getElementById(`player-${videoId}`);
  if (!playerDiv) {
      console.error(`Player div not found for video ID: ${videoId}`);
      return null;
  }

  allShortPlayers[videoId] = new YT.Player(playerDiv, {
    videoId: videoId,
    playerVars: {
      'autoplay': 0,
      'controls': 0,
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
        event.target.mute();
        updateShortControls(videoId, event.target.getPlayerState(), true);
        console.log(`Reproductor para ${videoId} listo y muteado.`);
      },
      'onStateChange': (event) => {
        updateShortControls(videoId, event.data, event.target.isMuted());
        if (event.data === YT.PlayerState.ENDED) {
            console.log(`Short ${videoId} ha terminado y se reiniciará.`);
        }
      },
      'onError': (event) => {
        console.error(`Error en el reproductor de ${videoId}:`, event.data);
        if (event.data === 100 || event.data === 101 || event.data === 150 || event.data === 2) {
            console.log(`Eliminando short ${videoId} por error de reproducción o incrustación.`);
            markVideoAsViewed(videoId);
            const shortCardToRemove = document.querySelector(`.short-card[data-video-id="${videoId}"]`);
            if (shortCardToRemove) {
                playShortObserver.unobserve(shortCardToRemove);
                shortCardToRemove.remove();

                // Trigger scroll to refresh IntersectionObserver or load more
                shortsContainer.dispatchEvent(new Event('scroll'));
                // Si no quedan shorts, cargar más explícitamente
                if (shortsContainer.children.length === 0 && !isLoadingShorts) {
                    loadShorts(nextShortsPageToken || '');
                }
            }
            if (allShortPlayers[videoId]) {
                try { allShortPlayers[videoId].destroy(); } catch (e) { console.warn("Error al destruir player:", e); }
                delete allShortPlayers[videoId];
            }
        }
      }
    }
  });
  return allShortPlayers[videoId];
}

if (shortsContainer) {
    shortsContainer.addEventListener('click', (event) => {
        const playPauseBtn = event.target.closest('.short-play-pause-btn');
        const muteBtn = event.target.closest('.short-mute-btn');

        if (playPauseBtn) {
            const videoId = playPauseBtn.dataset.videoId;
            const player = allShortPlayers[videoId];
            if (player) {
                if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
            }
        } else if (muteBtn) {
            const videoId = muteBtn.dataset.videoId;
            const player = allShortPlayers[videoId];
            if (player) {
                if (player.isMuted()) {
                    player.unMute();
                } else {
                    player.mute();
                }
                updateShortControls(videoId, player.getPlayerState(), player.isMuted());
            }
        }
    });
}

if (shortsContainer) {
    shortsContainer.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = shortsContainer;
        const scrollBottom = scrollTop + clientHeight;

        if (scrollBottom >= scrollHeight * 0.9 && !isLoadingShorts && nextShortsPageToken) {
            loadShorts(nextShortsPageToken);
        }
    });
}

window.addEventListener('resize', () => {
    if (shortsContainer && currentActiveShortId) {
        const currentCard = shortsContainer.querySelector(`[data-video-id="${currentActiveShortId}"]`);
        if (currentCard) {
            shortsContainer.scrollTop = currentCard.offsetTop;
        }
    }
});

const headerLogoShorts = document.querySelector('.header-logo');
if (headerLogoShorts) {
    headerLogoShorts.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

window.addEventListener('preferencesUpdated', () => {
    console.log('Preferencias actualizadas, recargando shorts.');
    loadShorts('');
});
