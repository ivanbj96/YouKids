// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// La clave API también es necesaria aquí para buscar videos tipo "Shorts".
// Reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!

// ======================================================================
// Elementos del DOM para la página de Shorts (shorts.html)
// ======================================================================
const shortsContainer = document.getElementById("shorts-container");
const shortsLoadingIndicator = document.getElementById("shorts-loading");
const initialLoadingMessage = shortsContainer.querySelector('.initial-loading-message'); // Selector ajustado para el mensaje inicial

let shortsPlayers = {}; // Objeto para almacenar instancias de reproductores de YouTube (videoId: playerInstance)
let currentShortIndex = 0; // Índice del short actualmente visible
let nextShortsPageToken = null; // Para la paginación de shorts
let isShortsLoading = false; // Para controlar la carga de shorts y evitar duplicados

// ======================================================================
// Lógica de carga y reproducción de Shorts
// ======================================================================

// Carga la API de IFrame de YouTube (también se carga en app.js, pero es inofensivo aquí)
function loadYouTubeIframeAPIForShorts() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Esta función se llama automáticamente cuando la API de IFrame de YouTube está lista
// Es global, así que se usa la misma que en app.js.
// Podemos añadir lógica específica para shorts si es necesario, pero generalmente no lo es.
// Asegurarse de que `onYouTubeIframeAPIReady` no colisione si ambos scripts están en la misma página.
// Si ambos scripts se cargan en la misma página, es mejor tener una sola definición global de `onYouTubeIframeAPIReady`
// o usar un enfoque modular. Para este caso, como son páginas distintas, está bien.
// Si llegas a tener ambos en el mismo HTML, solo el último `onYouTubeIframeAPIReady` se ejecutará.
// Para este setup, asumo que `app.js` es para `index.html` y `shorts.js` es para `shorts.html`.
if (typeof onYouTubeIframeAPIReady === 'undefined') {
  function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready for shorts app.");
    // Inicia la carga de shorts cuando la API está lista
    loadShorts();
  }
} else {
    // Si ya está definida (ej. por app.js en una página compartida), podemos llamarla o adaptarnos.
    // Para este caso de páginas separadas, no debería haber conflicto.
    console.log("YouTube IFrame API already ready or defined for shorts.");
    // Si el DOM ya está cargado, podemos iniciar la carga de shorts directamente.
    // O esperar el evento DOMContentLoaded.
}


async function loadShorts(pageToken = '') {
  if (isShortsLoading) return;
  isShortsLoading = true;

  if (!pageToken) { // Primera carga
    initialLoadingMessage.style.display = 'flex'; // Mostrar spinner y texto
  } else {
    shortsLoadingIndicator.style.display = 'flex'; // Mostrar spinner de carga de más shorts
  }

  // Buscamos videos cortos relevantes. YouTube no tiene un 'type=short'.
  // Se simula buscando videos muy cortos o por query específica.
  // Una buena estrategia es buscar "shorts" o "videos verticales" + tu tema.
  const query = "videos cristianos infantiles shorts"; // Ejemplo de query

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=10&key=${apiKey}`;

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
            shortsContainer.innerHTML = ''; // Limpiar solo en la carga inicial
        }
        data.items.forEach(item => {
            if (item.id.videoId) {
                createShortCard(item.id.videoId);
            }
        });
        // Si no hay más shorts, oculta el spinner de carga de más
        if (!nextShortsPageToken && shortsLoadingIndicator) {
          shortsLoadingIndicator.style.display = 'none';
        }

        // Si es la primera carga y hay videos, reproduce el primero
        if (!pageToken && data.items.length > 0) {
            playCurrentShort();
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
    initialLoadingMessage.style.display = 'none'; // Ocultar el mensaje de carga inicial
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
            <i class="material-icons">pause</i> <!-- Por defecto en pausa hasta que se reproduzca -->
        </button>
        <button class="short-mute-btn" data-video-id="${videoId}">
            <i class="material-icons">volume_up</i>
        </button>
    </div>
  `;
  shortsContainer.appendChild(shortCard);
}

// Inicializa el reproductor de YouTube para un short específico
function initializeShortPlayer(videoId) {
  if (shortsPlayers[videoId]) {
    // Si el reproductor ya existe, solo asegúrate de que esté listo (aunque no debería pasar si se maneja bien el scroll)
    return;
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
      ''modestbranding': 1, // Ocultar logo de YouTube
      'playlist': videoId, // Necesario para loop
      'rel': 0, // No mostrar videos relacionados
      'showinfo': 0 // Ocultar título y datos del video
    },
    events: {
      'onReady': (event) => {
        // Mutea el video al iniciar para la experiencia de shorts
        event.target.mute();
        // Lógica de play/pause se maneja en playCurrentShort o en los botones.
        console.log(`Reproductor para ${videoId} listo.`);
      },
      'onStateChange': (event) => {
        const playPauseBtn = shortsContainer.querySelector(`.short-play-pause-btn[data-video-id="${videoId}"] i`);
        if (event.data === YT.PlayerState.PLAYING) {
            if (playPauseBtn) playPauseBtn.textContent = 'pause';
        } else {
            if (playPauseBtn) playPauseBtn.textContent = 'play_arrow';
        }
      },
      'onError': (event) => {
        console.error(`Error en el reproductor de ${videoId}:`, event.data);
      }
    }
  });
}

// Controla la reproducción del short actual
function playCurrentShort() {
    const shortCards = shortsContainer.querySelectorAll('.short-card');
    if (shortCards.length === 0) return;

    // Pausar todos los demás videos
    Object.values(shortsPlayers).forEach(player => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        }
    });

    const currentCard = shortCards[currentShortIndex];
    const videoId = currentCard.dataset.videoId;

    // Inicializa el reproductor si no existe
    if (!shortsPlayers[videoId]) {
        initializeShortPlayer(videoId);
    }

    // Esperar un momento para que el reproductor esté listo antes de reproducir
    // o asegurar que 'onReady' se encarga de la reproducción.
    // Un pequeño timeout puede ser útil para asegurar que el iframe se haya cargado.
    const checkPlayerReady = setInterval(() => {
        if (shortsPlayers[videoId] && typeof shortsPlayers[videoId].playVideo === 'function') {
            clearInterval(checkPlayerReady);
            shortsPlayers[videoId].playVideo();
            shortsPlayers[videoId].mute(); // Asegurar que está muteado al inicio
            const muteBtn = shortsContainer.querySelector(`.short-mute-btn[data-video-id="${videoId}"] i`);
            if (muteBtn) muteBtn.textContent = 'volume_off'; // Icono de mute
            console.log(`Reproduciendo y muteando short: ${videoId}`);
        }
    }, 100); // Intenta cada 100ms
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
                playPauseBtn.querySelector('i').textContent = 'play_arrow';
            } else {
                player.playVideo();
                playPauseBtn.querySelector('i').textContent = 'pause';
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

    // Calcula el índice del short visible
    const newIndex = Math.round(shortsContainer.scrollTop / window.innerHeight);

    if (newIndex !== currentShortIndex) {
        currentShortIndex = newIndex;
        playCurrentShort(); // Reproduce el short recién visible

        // Carga más shorts cuando estamos cerca del final
        if (currentShortIndex >= shortCards.length - 2 && !isShortsLoading && nextShortsPageToken) {
            loadShorts(nextShortsPageToken);
        }
    }
});

// Evento para ajustar el reproductor al redimensionar la ventana
window.addEventListener('resize', () => {
    // Si un short está reproduciéndose, podrías querer ajustar su tamaño.
    // YouTube iframe maneja bastante bien esto con width/height 100%.
    // Solo necesitamos asegurarnos de que la vista se "ajusta" correctamente.
    // Esto es más un efecto visual para el snap scroll.
    shortsContainer.scrollTop = currentShortIndex * window.innerHeight;
});

// Inicializa la carga de shorts cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    loadYouTubeIframeAPIForShorts(); // Carga la API, que luego llamará a onYouTubeIframeAPIReady
});

// Para asegurarse de que el primer short se reproduzca al cargar la página
window.addEventListener('load', () => {
  // Asegúrate de que el contenedor de shorts tenga un elemento y se pueda centrar
  if (shortsContainer.children.length > 0) {
    playCurrentShort();
  }
});
