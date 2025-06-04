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

let allShortPlayers = {}; // Para almacenar instancias de YT.Player para cada short
let currentActiveShortId = null; // ID del short actualmente activo/reproduciéndose

// Infinite scroll variables
let nextPageToken = null; // Token para la siguiente página de resultados de la API
let isLoadingShorts = false; // Bandera para evitar múltiples solicitudes simultáneas

// --- IntersectionObserver para la reproducción de Shorts ---
// Este observador se encarga de reproducir/pausar videos cuando entran/salen del viewport.
const playShortObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    const player = allShortPlayers[videoId];

    // Verificar si el reproductor existe y tiene los métodos necesarios
    if (!player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') {
      console.warn(`Reproductor para ${videoId} no listo o inválido.`);
      return;
    }

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
  });
}, { threshold: 0.8 }); // Activa cuando el 80% del elemento es visible

// ======================================================================
// Funciones Auxiliares
// ======================================================================

// Función para actualizar los iconos de play/pause y mute en los controles de un short
function updateShortControls(videoId, playerState, isMuted) {
    const playPauseBtnIcon = shortsContainer.querySelector(`.short-play-pause-btn[data-video-id="${videoId}"] i`);
    const muteBtnIcon = shortsContainer.querySelector(`.short-mute-btn[data-video-id="${videoId}"] i`);

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

// Función global que la API de YouTube llama cuando está lista.
function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready for shorts app.");
    // Inicia la carga de shorts cuando la API está lista.
    loadShorts();
}

async function loadShorts(pageToken = '') {
    if (isLoadingShorts) return;
    isLoadingShorts = true;

    // Mostrar el indicador de carga apropiado
    if (!pageToken) { // Primera carga
        shortsContainer.innerHTML = `
            <div class="initial-loading-message">
                <div class="spinner"></div>
                Cargando Shorts...
            </div>
        `;
    } else { // Carga de más shorts
        shortsLoadingIndicator.style.display = 'flex';
    }

    const query = "videos cristianos infantiles shorts"; // Query para videos verticales/cortos
    const maxResults = 10;

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

        nextPageToken = data.nextPageToken || null;

        // Eliminar el mensaje de carga inicial si ya no es la primera carga o si hay resultados
        if (!pageToken && data.items.length > 0) {
            shortsContainer.innerHTML = ''; // Limpiar el mensaje de carga inicial
        }

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                if (item.id.videoId) {
                    createShortCard(item.id.videoId);
                }
            });

            // Si es la primera carga y hay videos, reproduce el primero
            if (!pageToken) {
                // Asegurar que el primer short se reproduzca al cargar la página y que el observer lo maneje
                const firstShortCard = shortsContainer.querySelector('.short-card');
                if (firstShortCard) {
                    // Force the IntersectionObserver to check the first element
                    // Or simply scroll to the top to trigger it naturally
                    shortsContainer.scrollTop = 0;
                }
            }
        } else {
            if (!pageToken) {
                shortsContainer.innerHTML = "<p class='no-results-message'>No se encontraron shorts para esta búsqueda.</p>";
            } else {
                console.log("No hay más shorts para cargar.");
            }
            nextPageToken = null;
        }

    } catch (error) {
        console.error("Error al buscar shorts:", error);
        if (!pageToken) {
            shortsContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los shorts.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
        }
    } finally {
        // Ocultar todos los indicadores de carga al finalizar
        if (shortsContainer.querySelector('.initial-loading-message')) {
            shortsContainer.querySelector('.initial-loading-message').style.display = 'none';
        }
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
  playShortObserver.observe(shortCard); // Observar la nueva tarjeta
}

// Inicializa el reproductor de YouTube para un short específico
function initializeShortPlayer(videoId) {
  if (allShortPlayers[videoId]) {
    // Si el reproductor ya existe, no lo volvemos a crear.
    return allShortPlayers[videoId];
  }

  const playerDiv = document.getElementById(`player-${videoId}`);
  if (!playerDiv) {
      console.error(`Player div not found for video ID: ${videoId}`);
      return null;
  }

  allShortPlayers[videoId] = new YT.Player(playerDiv, { // Pasa el elemento DOM directamente
    videoId: videoId,
    playerVars: {
      'autoplay': 0, // No iniciar automáticamente al crear, el IntersectionObserver lo hará
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
        // Mutea el video al iniciar para la experiencia de shorts
        event.target.mute();
        updateShortControls(videoId, event.target.getPlayerState(), true); // Actualiza iconos
        console.log(`Reproductor para ${videoId} listo y muteado.`);
        // El IntersectionObserver se encargará de reproducirlo cuando esté visible
      },
      'onStateChange': (event) => {
        updateShortControls(videoId, event.data, event.target.isMuted());
        if (event.data === YT.PlayerState.ENDED) {
            console.log(`Short ${videoId} ha terminado.`);
            // Con 'loop: 1' y 'playlist: videoId', el video debería reiniciarse automáticamente.
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


// Lógica de Infinite Scroll (detección para cargar más shorts)
shortsContainer.addEventListener('scroll', () => {
    // Carga más shorts cuando se acerca al final del scroll
    const { scrollTop, scrollHeight, clientHeight } = shortsContainer;
    const scrollBottom = scrollTop + clientHeight;

    // Detecta cuando el usuario está cerca del final (ej. 80% del contenido cargado)
    if (scrollBottom >= scrollHeight * 0.8 && !isLoadingShorts && nextPageToken) {
        loadShorts(nextPageToken);
    }
});

// Evento para ajustar la vista al redimensionar la ventana (ej. cambio de orientación del móvil)
window.addEventListener('resize', () => {
    // Si hay shorts cargados, ajusta el scroll para que el short actual esté en la vista
    if (shortsContainer.children.length > 0 && currentActiveShortId) {
        const currentCard = shortsContainer.querySelector(`[data-video-id="${currentActiveShortId}"]`);
        if (currentCard) {
            // Calcula la posición para que el short esté en la parte superior del área visible de shortsContainer
            shortsContainer.scrollTop = currentCard.offsetTop;
        }
    }
});

// Carga el script de la API de YouTube al cargar el DOM.
// La función `onYouTubeIframeAPIReady` será llamada por la API una vez que esté lista.
document.addEventListener("DOMContentLoaded", () => {
    // La etiqueta <script src="https://www.youtube.com/iframe_api"></script> ya está en shorts.html
    // La función onYouTubeIframeAPIReady se llamará automáticamente.
});
