// ======================================================================
// Elementos del DOM para la página de Shorts (shorts.html)
// ======================================================================
const shortsContainer = document.getElementById("shorts-container");
const shortsLoadingIndicator = document.getElementById("shorts-loading");
const initialLoadingMessage = shortsContainer.querySelector('.initial-loading-message'); // Ya existe en HTML

// Variables para el IntersectionObserver y control de reproducción
let allShortPlayers = {}; // Para almacenar instancias de YT.Player para cada short
let currentActiveShortId = null; // ID del short actualmente activo/reproduciéndose

// Infinite scroll variables
let nextShortsPageToken = null; // Token para la siguiente página de resultados de la API
let isLoadingShorts = false; // Bandera para evitar múltiples solicitudes simultáneas


// --- IntersectionObserver para la reproducción de Shorts ---
const playShortObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    const player = allShortPlayers[videoId];

    if (!player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') {
      // Intentar inicializar el reproductor si aún no está listo
      // Esto es crucial para si el observer detecta el short antes que el ready event del IFrame API
      if (!allShortPlayers[videoId]) { // Solo inicializar si no se ha intentado antes
          initializeShortPlayer(videoId);
      }
      // Reintentar en el próximo ciclo del event loop o si ya se inicializó
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
      setTimeout(() => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING && player.getCurrentTime() > 5) {
            markVideoAsViewed(videoId); // `markVideoAsViewed` viene de common.js
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

// onYouTubeIframeAPIReady es una función global que la API de YouTube llama cuando está lista.
function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready for shorts app.");
    loadShorts(); // Inicia la carga de shorts cuando la API está lista.
}

async function loadShorts(pageToken = '') {
    if (isLoadingShorts) return;
    isLoadingShorts = true;

    // Mostrar el indicador de carga apropiado
    if (!pageToken) { // Primera carga
        initialLoadingMessage.style.display = 'flex'; // Mostrar mensaje de carga inicial
        shortsContainer.querySelectorAll('.short-card').forEach(card => card.remove()); // Limpiar shorts antiguos
    } else { // Carga de más shorts
        shortsLoadingIndicator.style.display = 'flex';
    }

    const prefs = getPreferences(); // `getPreferences` viene de common.js
    const viewedVideos = getViewedVideos().videos; // `getViewedVideos` viene de common.js

    let baseQuery = "videos cristianos infantiles animados shorts";
    let channelIdsParam = '';

    if (prefs.preferredChannels && prefs.preferredChannels.length > 0) {
        channelIdsParam = `&channelId=${prefs.preferredChannels.join(',')}`;
        console.log(`Buscando shorts en canales preferidos: ${prefs.preferredChannels.join(', ')}`);
    }

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(baseQuery)}&type=video&videoDuration=short&maxResults=20&key=${window.apiKey}&relevanceLanguage=${prefs.language}`; // Usamos window.apiKey

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

            if (!pageToken) { // Solo si es la primera carga y hay nuevos shorts
                initialLoadingMessage.style.display = 'none'; // Ocultar mensaje de carga inicial
                shortsContainer.scrollTop = 0; // Asegurar que el primer short es visible
            }
        } else {
            if (!pageToken) {
                // Si no hay resultados iniciales, mostrar mensaje y ocultar spinner
                initialLoadingMessage.style.display = 'none';
                shortsContainer.innerHTML = "<p class='no-results-message'>No se encontraron shorts nuevos con tus preferencias.<br>Intenta cambiar el idioma o añadir más canales.</p>";
            } else {
                console.log("No hay más shorts nuevos para cargar.");
            }
            nextShortsPageToken = null;
        }

    } catch (error) {
        console.error("Error al buscar shorts:", error);
        initialLoadingMessage.style.display = 'none'; // Ocultar spinner en caso de error
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
      }
    }
  });
  return allShortPlayers[videoId];
}

// Manejo de eventos de clic en los botones de control de cada short
if (shortsContainer) { // Asegurarse de que el contenedor existe
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
    const currentCard = shortsContainer.querySelector(`[data-video-id="${currentActiveShortId}"]`);
    if (currentCard) {
        shortsContainer.scrollTop = currentCard.offsetTop;
    }
});

// Listener para el evento `preferencesUpdated` del common.js
window.addEventListener('preferencesUpdated', () => {
    console.log('Preferencias actualizadas, recargando shorts.');
    // Recargar shorts para aplicar el nuevo idioma/canales
    loadShorts(''); // Recarga desde el inicio
});

// Cargar la API de YouTube y realizar la búsqueda inicial al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    // onYouTubeIframeAPIReady se llamará automáticamente cuando la API esté lista.
    // La carga inicial de shorts se ha movido dentro de onYouTubeIframeAPIReady.
});
