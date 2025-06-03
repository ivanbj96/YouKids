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
// Importante: Referenciar el mensaje de carga inicial que ya existe en el HTML
const initialLoadingMessage = document.querySelector('#shorts-container .initial-loading-message');


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
        // No limpiar shortsContainer.innerHTML aquí, ya que eliminaría el initialLoadingMessage.
        // Los nuevos shorts se añadirán después de este mensaje.
    } else {
        shortsLoadingIndicator.style.display = 'flex'; // Mostrar spinner de carga de más shorts
    }

    // Estrategia de búsqueda mejorada para Shorts:
    // Buscar por términos generales de "niños cristianos" y filtrar por duración corta.
    const query = "videos cristianos infantiles"; // Query más amplia
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
            if (!pageToken) {
                // Eliminar el mensaje de carga inicial antes de añadir videos si es la primera carga
                initialLoadingMessage.style.display = 'none';
            }
            data.items.forEach(item => {
                if (item.id.videoId) {
                    createShortCard(item.id.videoId);
                }
            });

            // Si es la primera carga y hay videos, reproduce el primero después de un pequeño retraso
            if (!pageToken && data.items.length > 0) {
                // Pausar todos los reproductores existentes antes de reproducir el primero nuevo
                Object.values(shortsPlayers).forEach(player => {
                    if (player && typeof player.pauseVideo === 'function' && player.getPlayerState() === YT.PlayerState.PLAYING) {
                        player.pauseVideo();
                    }
                });
                currentShortIndex = 0; // Asegurarse de que el índice es 0 para la primera carga
                setTimeout(() => {
                    playCurrentShort();
                }, 500); // Pequeño retraso para asegurar que los iframes se rendericen
            }
        } else {
            if (!pageToken) {
                // Si no hay resultados iniciales, mostramos el mensaje de "no encontrados"
                initialLoadingMessage.style.display = 'none'; // Asegurarse de ocultar el spinner
                shortsContainer.innerHTML = "<p class='no-results-message'>No se encontraron shorts para esta búsqueda.</p>";
            } else {
                console.log("No hay más shorts para cargar.");
            }
            nextShortsPageToken = null;
        }

    } catch (error) {
        console.error("Error al buscar shorts:", error);
        initialLoadingMessage.style.display = 'none'; // Asegurarse de ocultar el spinner
        shortsContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los shorts.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
    } finally {
        shortsLoadingIndicator.style.display = 'none'; // Ocultar el indicador de carga del infinite scroll
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

  // Crea el div para el iframe si no existe (debería existir por el HTML)
  const playerDiv = document.getElementById(`player-${videoId}`);
  if (!playerDiv) {
      console.error(`Player div not found for video ID: ${videoId}`);
      return null;
  }

  shortsPlayers[videoId] = new YT.Player(playerDiv, { // Pasa el elemento DOM directamente
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
            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.BUFFERING) {
                playPauseBtnIcon.textContent = 'play_arrow';
            }
        }
        if (event.data === YT.PlayerState.ENDED) {
            console.log(`Short ${videoId} ha terminado.`);
        }
      },
      'onError': (event) => {
        console.error(`Error en el reproductor de ${videoId}:`, event.data);
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
            // Solo reproducir si no está ya reproduciéndose
            if (player.getPlayerState() !== -1 && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                clearInterval(checkPlayerReady);
                player.playVideo();
                // Asegurar que el icono de play/pause se actualiza
                const playPauseBtnIcon = shortsContainer.querySelector(`.short-play-pause-btn[data-video-id="${videoId}"] i`);
                if (playPauseBtnIcon) playPauseBtnIcon.textContent = 'pause';
                console.log(`Reproduciendo short: ${videoId}`);
            } else if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                clearInterval(checkPlayerReady); // Ya está reproduciendo, no necesitamos esperar
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
    // Usamos clientHeight para la altura del contenedor con scroll
    const newIndex = Math.round(shortsContainer.scrollTop / shortsContainer.clientHeight);


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
    if (shortsContainer.children.length > 0) { // Asegura que haya shorts cargados
        // scrolls al inicio del short actual, ajustando por la altura del header/footer
        shortsContainer.scrollTop = currentShortIndex * shortsContainer.clientHeight;
    }
});

// Carga el script de la API de YouTube al cargar el DOM.
// La función `onYouTubeIframeAPIReady` será llamada por la API una vez que esté lista.
document.addEventListener("DOMContentLoaded", () => {
    // La etiqueta <script src="https://www.youtube.com/iframe_api"></script> ya está en shorts.html
    // La función onYouTubeIframeAPIReady se llamará automáticamente.
});
