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

    // Si el reproductor no existe o no está listo, intentar inicializarlo
    if (!player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') {
      if (!player) { // Solo inicializar si aún no se ha creado la instancia
          player = initializeShortPlayer(videoId);
      }
      // Reintentar manejar la visibilidad después de un corto retraso
      // para dar tiempo al reproductor a inicializarse completamente
      setTimeout(() => {
          const recheckedPlayer = allShortPlayers[videoId];
          if (recheckedPlayer && typeof recheckedPlayer.playVideo === 'function' && entry.isIntersecting && entry.intersectionRatio >= 0.8) {
              handleShortVisibility(entry);
          }
      }, 100); // Aumentado a 100ms
      return; // Salir, se reintentará en el setTimeout
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
        // Pausar y reiniciar el short anterior si es diferente
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

      // Marcar como visto después de 5 segundos de reproducción
      setTimeout(() => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING && player.getCurrentTime() > 5) {
            markVideoAsViewed(videoId); // `markVideoAsViewed` viene de common.js
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
        // Quitar todos los shorts existentes para una recarga limpia
        shortsContainer.querySelectorAll('.short-card').forEach(card => {
            const videoId = card.dataset.videoId;
            if (allShortPlayers[videoId]) {
                try { allShortPlayers[videoId].destroy(); } catch (e) { console.warn("Error destroying player:", e); }
                delete allShortPlayers[videoId];
            }
            playShortObserver.unobserve(card); // Dejar de observar la tarjeta
            card.remove();
        });
        currentActiveShortId = null; // Reiniciar el short activo
    } else {
        shortsLoadingIndicator.style.display = 'flex';
    }

    const prefs = getPreferences(); // `getPreferences` viene de common.js
    const viewedVideos = getViewedVideos().videos; // `getViewedVideos` viene de common.js

    // Query más específica para shorts, evitando contenido horizontal
    let baseQuery = "videos cristianos infantiles animados verticales shorts";
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
                // No se crea el iframe de inmediato, solo el contenedor del short
                // El iframe se creará e inicializará cuando el IntersectionObserver lo detecte
                createShortCard(item.id.videoId);
            });

            if (!pageToken) {
                initialLoadingMessage.style.display = 'none';
                shortsContainer.scrollTop = 0; // Asegurar que el primer short es visible al inicio
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
  // No llamamos initializeShortPlayer aquí, el IntersectionObserver lo hará cuando el short sea visible.
  playShortObserver.observe(shortCard); // Observar la nueva tarjeta
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
        // Códigos de error comunes:
        // 2: Parámetro de video inválido
        // 100: Video no encontrado o privado
        // 101/150: El propietario del video no permite la reproducción en reproductores incrustados
        if (event.data === 100 || event.data === 101 || event.data === 150) {
            console.log(`Eliminando short ${videoId} por error de reproducción o incrustación.`);
            markVideoAsViewed(videoId); // Marcar como visto para que no aparezca de nuevo hoy
            const shortCardToRemove = document.querySelector(`.short-card[data-video-id="${videoId}"]`);
            if (shortCardToRemove) {
                playShortObserver.unobserve(shortCardToRemove); // Dejar de observar
                shortCardToRemove.remove(); // Eliminar del DOM
                // Asegurarse de que el IntersectionObserver vuelva a evaluar los elementos visibles
                // Esto forzará el siguiente short a reproducirse si es necesario
                if (shortsContainer.children.length > 0) {
                    const firstVisibleCard = shortsContainer.children[0];
                    if (firstVisibleCard) {
                        playShortObserver.observe(firstVisibleCard); // O forzar un scroll
                    }
                } else {
                    // Si no quedan shorts, cargar más
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

// Manejo de eventos de clic en los botones de control de cada short
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

// Lógica de Infinite Scroll (detección para cargar más shorts)
if (shortsContainer) {
    shortsContainer.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = shortsContainer;
        const scrollBottom = scrollTop + clientHeight;

        if (scrollBottom >= scrollHeight * 0.9 && !isLoadingShorts && nextShortsPageToken) {
            loadShorts(nextShortsPageToken);
        }
    });
}

// Evento para ajustar la vista al redimensionar la ventana (ej. cambio de orientación del móvil)
window.addEventListener('resize', () => {
    // Si hay shorts cargados, ajusta el scroll para que el short actual esté en la vista
    // Esto es importante para mantener la experiencia de "snap" después de un resize
    if (shortsContainer && currentActiveShortId) {
        const currentCard = shortsContainer.querySelector(`[data-video-id="${currentActiveShortId}"]`);
        if (currentCard) {
            shortsContainer.scrollTop = currentCard.offsetTop;
        }
    }
});

// Click en el logo para ir a inicio
const headerLogoShorts = document.querySelector('.header-logo');
if (headerLogoShorts) {
    headerLogoShorts.addEventListener('click', () => {
        window.location.href = 'index.html'; // Redirige a la página principal
    });
}


// Listener para el evento `preferencesUpdated` del common.js
window.addEventListener('preferencesUpdated', () => {
    console.log('Preferencias actualizadas, recargando shorts.');
    loadShorts(''); // Recarga desde el inicio para aplicar nuevas preferencias
});

// Cargar la API de YouTube y realizar la búsqueda inicial al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    // onYouTubeIframeAPIReady se llamará automáticamente cuando la API esté lista.
});
