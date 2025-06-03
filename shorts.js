// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// ¡¡REEMPLAZA ESTO CON TU CLAVE REAL DE LA API DE YOUTUBE!!
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// Sin una clave válida, la búsqueda de videos NO FUNCIONARÁ.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡¡VERIFICA Y REEMPLAZA!!

// ======================================================================
// Elementos del DOM para la página de Shorts (shorts.html)
// ======================================================================
const shortsContainer = document.getElementById("shorts-container");
const shortsLoadingIndicator = document.getElementById("shorts-loading");
const initialLoadingMessage = shortsContainer.querySelector('.initial-loading-message');

let shortsPlayers = {}; // Objeto para almacenar instancias de reproductores de YouTube (videoId: playerInstance)
let currentShortIndex = 0; // Índice del short actualmente visible
let nextShortsPageToken = null; // Para la paginación de shorts
let isShortsLoading = false; // Para controlar la carga de shorts y evitar duplicados

// ======================================================================
// Lógica de carga y reproducción de Shorts
// ======================================================================

// onYouTubeIframeAPIReady es una función global que la API de YouTube llama cuando está lista.
// Es crucial que esta función exista y que inicie la carga de shorts.
function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready for shorts app.");
    // Inicia la carga de shorts cuando la API está lista.
    loadShorts();
}

async function loadShorts(pageToken = '') {
    if (isShortsLoading) return;
    isShortsLoading = true;

    if (!pageToken) {
        initialLoadingMessage.style.display = 'flex'; // Mostrar spinner y texto para la primera carga
        shortsContainer.innerHTML = ''; // Limpiar el contenedor solo al inicio de una nueva búsqueda
    } else {
        shortsLoadingIndicator.style.display = 'flex'; // Mostrar spinner de carga de más shorts
    }

    // Estrategia de búsqueda mejorada para Shorts:
    // Buscar por términos generales de "niños cristianos" y filtrar por duración corta.
    // La clave es "videoDuration=short". YouTube categoriza esto como "Shorts" internamente.
    const query = "canciones para niños cristianos"; // Query más amplia
    const maxResults = 10; // Número de resultados por solicitud

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=${maxResults}&key=${apiKey}`;

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

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                // Solo añadir videos con un ID de video válido y que no sean shorts preexistentes si es posible
                if (item.id.videoId) {
                    createShortCard(item.id.videoId);
                }
            });

            // Si es la primera carga y hay videos, reproduce el primero después de un pequeño retraso
            // para asegurar que el iframe se haya montado en el DOM y la API esté lista para interactuar.
            if (!pageToken) {
                setTimeout(() => {
                    playCurrentShort();
                }, 500); // Pequeño retraso para asegurar que los iframes se rendericen
            }
        } else {
            if (!pageToken) {
                shortsContainer.innerHTML = "<p class='no-results-message'>No se encontraron shorts para esta búsqueda.</p>";
            } else {
                console.log("No hay más shorts para cargar.");
            }
            nextShortsPageToken = null;
        }

    } catch (error) {
        console.error("Error al buscar shorts:", error);
        if (!pageToken) {
            shortsContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los shorts.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
        }
    } finally {
        initialLoadingMessage.style.display = 'none'; // Siempre ocultar el mensaje inicial al finalizar
        shortsLoadingIndicator.style.display = 'none'; // Ocultar el indicador de carga
        isShortsLoading = false;
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
}

// Inicializa el reproductor de YouTube para un short específico
function initializeShortPlayer(videoId) {
  if (shortsPlayers[videoId]) {
    // Si el reproductor ya existe, no lo volvemos a crear.
    return shortsPlayers[videoId];
  }

  shortsPlayers[videoId] = new YT.Player(`player-${videoId}`, {
    videoId: videoId,
    playerVars: {
      'autoplay': 0, // No iniciar automáticamente al crear
      'controls': 0, // Ocultar controles nativos, usaremos los nuestros
      'disablekb': 1, // Deshabilitar controles de teclado
      'fs': 0, // Deshabilitar pantalla completa
      'iv_load_policy': 3, // Ocultar anotaciones
      'loop': 1, // Reproducir en bucle
      'modestbranding': 1, // Ocultar logo de YouTube
      'playlist': videoId, // Necesario para loop, reproduce el mismo video una y otra vez
      'rel': 0, // No mostrar videos relacionados
      'showinfo': 0 // Ocultar título y datos del video
    },
    events: {
      'onReady': (event) => {
        event.target.mute(); // Mutea el video al iniciar para la experiencia de shorts
        const muteBtnIcon = shortsContainer.querySelector(`.short-mute-btn[data-video-id="${videoId}"] i`);
        if (muteBtnIcon) muteBtnIcon.textContent = 'volume_off'; // Actualiza el icono a muteado
        console.log(`Reproductor para ${videoId} listo y muteado.`);
      },
      'onStateChange': (event) => {
        const playPauseBtnIcon = shortsContainer.querySelector(`.short-play-pause-btn[data-video-id="${videoId}"] i`);
        if (playPauseBtnIcon) {
            if (event.data === YT.PlayerState.PLAYING) {
                playPauseBtnIcon.textContent = 'pause';
            } else {
                playPauseBtnIcon.textContent = 'play_arrow';
            }
        }
      },
      'onError': (event) => {
        console.error(`Error en el reproductor de ${videoId}:`, event.data);
        // Puedes mostrar un mensaje al usuario aquí si un video no carga
      }
    }
  });
  return shortsPlayers[videoId];
}

// Controla la reproducción del short actual
function playCurrentShort() {
    const shortCards = shortsContainer.querySelectorAll('.short-card');
    if (shortCards.length === 0) {
        console.log("No short cards found to play.");
        return;
    }

    // Pausar todos los demás videos
    Object.values(shortsPlayers).forEach(player => {
        if (player && typeof player.pauseVideo === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        }
    });

    // Asegurarse de que currentShortIndex no exceda el número de tarjetas
    if (currentShortIndex >= shortCards.length) {
        currentShortIndex = shortCards.length - 1;
    }
    if (currentShortIndex < 0) {
        currentShortIndex = 0;
    }

    const currentCard = shortCards[currentShortIndex];
    const videoId = currentCard.dataset.videoId;

    const player = initializeShortPlayer(videoId); // Asegura que el reproductor se inicialice o se obtenga

    if (player && typeof player.playVideo === 'function') {
        // Asegurar que el reproductor está listo antes de intentar reproducir
        const checkPlayerReady = setInterval(() => {
            // PlayerState.UNSTARTED (-1) significa que el reproductor aún no está listo.
            // Una vez que pase a otro estado (0, 1, 2, etc.), está listo.
            if (player.getPlayerState() !== -1) {
                clearInterval(checkPlayerReady);
                player.playVideo();
                // Asegurarse de que el icono de play/pause se actualiza
                const playPauseBtnIcon = shortsContainer.querySelector(`.short-play-pause-btn[data-video-id="${videoId}"] i`);
                if (playPauseBtnIcon) playPauseBtnIcon.textContent = 'pause';
                console.log(`Reproduciendo short: ${videoId}`);
            }
        }, 100); // Intenta cada 100ms
    } else {
        console.warn(`Reproductor para ${videoId} no está listo para reproducir.`);
    }
}


// Manejo de eventos de clic en los botones de control de cada short
shortsContainer.addEventListener('click', (event) => {
    const playPauseBtn = event.target.closest('.short-play-pause-btn');
    const muteBtn = event.target.closest('.short-mute-btn');

    if (playPauseBtn) {
        const videoId = playPauseBtn.dataset.videoId;
        const player = shortsPlayers[videoId];
        if (player) {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
        }
    } else if (muteBtn) {
        const videoId = muteBtn.dataset.videoId;
        const player = shortsPlayers[videoId];
        if (player) {
            if (player.isMuted()) {
                player.unMute();
                muteBtn.querySelector('i').textContent = 'volume_up';
            } else {
                player.mute();
                muteBtn.querySelector('i').textContent = 'volume_off';
            }
        }
    }
});


// Lógica de Infinite Scroll y 'Snap' para Shorts
shortsContainer.addEventListener('scroll', () => {
    const shortCards = shortsContainer.querySelectorAll('.short-card');
    if (shortCards.length === 0) return;

    // Calcula el índice del short visible, redondeando para el "snap"
    const newIndex = Math.round(shortsContainer.scrollTop / window.innerHeight);

    if (newIndex !== currentShortIndex) {
        currentShortIndex = newIndex;
        playCurrentShort(); // Reproduce el short recién visible

        // Carga más shorts cuando estamos cerca del final
        // La tolerancia de 2 videos es común para precargar
        if (currentShortIndex >= shortCards.length - 2 && !isShortsLoading && nextShortsPageToken) {
            loadShorts(nextShortsPageToken);
        }
    }
});

// Evento para ajustar el reproductor al redimensionar la ventana (ej. cambio de orientación del móvil)
window.addEventListener('resize', () => {
    // Esto asegura que la página se "ajuste" al short actual después de un redimensionamiento,
    // manteniendo la experiencia de un short por pantalla.
    shortsContainer.scrollTop = currentShortIndex * window.innerHeight;
});

// Carga el script de la API de YouTube al cargar el DOM.
// La función `onYouTubeIframeAPIReady` será llamada por la API una vez que esté lista.
document.addEventListener("DOMContentLoaded", () => {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});

// Si por alguna razón la API ya estaba cargada antes de que el DOM terminara (menos común),
// esto asegura que loadShorts() se llama.
// window.addEventListener('load', () => {
//     if (typeof YT !== 'undefined' && YT.Player && !isShortsLoading && shortsContainer.children.length === 0) {
//         loadShorts();
//     }
// });
