// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// Por razones de seguridad, NUNCA expongas tu clave API directamente en el código del lado del cliente en producción.
// Para proyectos reales, utiliza un proxy del lado del servidor para interactuar con la API de YouTube.
// Por ahora, para pruebas locales, reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!
const shortsQuery = "youtube shorts niños cristianos"; // Query para videos verticales/cortos
const shortsContainer = document.getElementById("shorts-container");
const loadingMessage = shortsContainer.querySelector('.loading-message');

let allShortPlayers = {}; // Para almacenar instancias de YT.Player para cada short
let currentActiveShortId = null; // ID del short actualmente activo/reproduciéndose
let shortsData = []; // Para almacenar los datos de los shorts cargados

// Observador de intersección para detectar el short activo
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
      const shortCard = entry.target;
      const videoId = shortCard.dataset.videoId;

      if (videoId && allShortPlayers[videoId]) {
        // Pausar y reiniciar el short anterior si es diferente
        if (currentActiveShortId && currentActiveShortId !== videoId && allShortPlayers[currentActiveShortId]) {
          allShortPlayers[currentActiveShortId].pauseVideo();
          allShortPlayers[currentActiveShortId].seekTo(0); // Reiniciar video anterior
          console.log(`Pausado y reiniciado: ${currentActiveShortId}`);
        }

        // Reproducir el short actual (silenciado)
        allShortPlayers[videoId].playVideo();
        allShortPlayers[videoId].mute(); // Asegurar que inicie silenciado
        updateShortControls(videoId, 'playing', true); // Actualiza iconos de control
        currentActiveShortId = videoId;
        console.log(`Reproduciendo: ${videoId}`);
      }
    } else if (!entry.isIntersecting && entry.intersectionRatio < 0.8) {
        // Pausar el video si sale de la vista significativa
        const shortCard = entry.target;
        const videoId = shortCard.dataset.videoId;
        if (videoId && allShortPlayers[videoId] && allShortPlayers[videoId].getPlayerState() === YT.PlayerState.PLAYING) {
            allShortPlayers[videoId].pauseVideo();
            updateShortControls(videoId, 'paused', allShortPlayers[videoId].isMuted());
            console.log(`Pausado al salir de vista: ${videoId}`);
        }
    }
  });
}, { threshold: 0.8 }); // Activa cuando el 80% del elemento es visible

/**
 * Esta función es llamada automáticamente por el IFrame Player API de YouTube
 * cuando el código del reproductor ha sido cargado.
 */
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for Shorts.");
  loadShorts(); // Iniciar la carga de shorts cuando la API esté lista
}

/**
 * Carga videos "Shorts" de YouTube.
 */
async function loadShorts() {
  loadingMessage.style.display = 'block';
  shortsContainer.innerHTML = ''; // Limpiar shorts existentes, excepto el mensaje de carga
  shortsContainer.appendChild(loadingMessage); // Asegurarse de que el mensaje de carga esté ahí

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(shortsQuery)}&type=video&videoDuration=short&maxResults=10&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Error HTTP: ${res.status} - ${errorBody.error?.message || errorBody.message || 'Error desconocido de la API.'}`);
    }
    const data = await res.json();

    shortsData = data.items || [];
    loadingMessage.style.display = 'none'; // Ocultar mensaje de carga

    if (shortsData.length > 0) {
      shortsData.forEach(item => {
        if (!item.id || !item.id.videoId) {
          console.warn("Item no es un video o no tiene videoId:", item);
          return;
        }
        createShortCard(item.id.videoId, item.snippet.title);
      });
      // Iniciar observación después de que todos los shorts estén en el DOM
      shortsContainer.querySelectorAll('.short-card').forEach(card => observer.observe(card));
    } else {
      shortsContainer.innerHTML = "<p class='loading-message'>No se encontraron Shorts.</p>";
      loadingMessage.style.display = 'block'; // Mostrar mensaje de no encontrados
    }

  } catch (error) {
    console.error("Error al cargar Shorts:", error);
    shortsContainer.innerHTML = `<p class='loading-message' style='color: red;'>Ocurrió un error al cargar los Shorts.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
    loadingMessage.style.display = 'block'; // Mostrar mensaje de error
  }
}

/**
 * Crea la tarjeta HTML para un short y lo inicializa con su reproductor.
 * @param {string} videoId - El ID del video de YouTube.
 * @param {string} title - El título del video.
 */
function createShortCard(videoId, title) {
  const shortCard = document.createElement("div");
  shortCard.className = "short-card";
  shortCard.dataset.videoId = videoId; // Almacenar el videoId en un data attribute

  shortCard.innerHTML = `
    <div class="short-player-wrapper">
      <div id="player-${videoId}"></div> <!-- Contenedor del reproductor -->
    </div>
    <div class="short-controls">
      <button class="short-play-pause-btn" data-video-id="${videoId}" aria-label="Reproducir/Pausar">
        <i class="material-icons">play_arrow</i>
      </button>
      <button class="short-mute-btn" data-video-id="${videoId}" aria-label="Silenciar/Desilenciar">
        <i class="material-icons">volume_off</i>
      </button>
    </div>
  `;
  shortsContainer.appendChild(shortCard);

  // Inicializar el reproductor después de que el elemento esté en el DOM
  allShortPlayers[videoId] = new YT.Player(`player-${videoId}`, {
    videoId: videoId,
    playerVars: {
      'autoplay': 0, // No autoplay inicialmente, lo controlará el IntersectionObserver
      'controls': 0,
      'modestbranding': 1,
      'rel': 0,
      'mute': 1, // ¡Importante! Inicia silenciado
      'loop': 0,
      'playlist': videoId, // Truco para que el 'loop' funcione (aunque lo controlamos manualmente)
      'playsinline': 1 // Para iOS
    },
    events: {
      'onReady': (event) => {
        console.log(`Short player ${videoId} ready.`);
        // Asegúrate de que el video esté silenciado al cargarse
        event.target.mute();
        updateShortControls(videoId, event.target.getPlayerState(), event.target.isMuted());
      },
      'onStateChange': (event) => {
        updateShortControls(videoId, event.data, allShortPlayers[videoId].isMuted());
      }
    }
  });

  // Añadir listeners a los botones de control específicos de este short
  shortCard.querySelector('.short-play-pause-btn').addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar que el clic en el botón se propague
    const player = allShortPlayers[e.currentTarget.dataset.videoId];
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  });

  shortCard.querySelector('.short-mute-btn').addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar que el clic en el botón se propague
    const player = allShortPlayers[e.currentTarget.dataset.videoId];
    if (player.isMuted()) {
      player.unMute();
    } else {
      player.mute();
    }
    updateShortControls(e.currentTarget.dataset.videoId, player.getPlayerState(), player.isMuted());
  });
}

/**
 * Actualiza los iconos de control de un short específico.
 * @param {string} videoId - ID del video.
 * @param {number} playerState - Estado del reproductor (YT.PlayerState).
 * @param {boolean} isMuted - Si el reproductor está silenciado.
 */
function updateShortControls(videoId, playerState, isMuted) {
  const shortCard = document.querySelector(`.short-card[data-video-id="${videoId}"]`);
  if (!shortCard) return;

  const playPauseIcon = shortCard.querySelector('.short-play-pause-btn .material-icons');
  const muteIcon = shortCard.querySelector('.short-mute-btn .material-icons');

  if (playPauseIcon) {
    playPauseIcon.textContent = (playerState === YT.PlayerState.PLAYING) ? 'pause' : 'play_arrow';
  }
  if (muteIcon) {
    muteIcon.textContent = isMuted ? 'volume_off' : 'volume_up';
  }
}

// Cargar shorts al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  // onYouTubeIframeAPIReady es llamado por el script de la API de YouTube
});
