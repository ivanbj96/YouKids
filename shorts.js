// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// Por razones de seguridad, NUNCA expongas tu clave API directamente en el código del lado del cliente en producción.
// Para proyectos reales, utiliza un proxy del lado del servidor para interactuar con la API de YouTube.
// Por ahora, para pruebas locales, reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "TU_CLAVE_API_DE_YOUTUBE"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!
const shortsQuery = "youtube shorts niños cristianos"; // Query para videos verticales/cortos
const shortsContainer = document.getElementById("shorts-container");
const initialLoadingMessage = shortsContainer.querySelector('.initial-loading-message');
const shortsLoadingIndicator = document.getElementById("shorts-loading");

let allShortPlayers = {}; // Para almacenar instancias de YT.Player para cada short
let currentActiveShortId = null; // ID del short actualmente activo/reproduciéndose
let shortsData = []; // Para almacenar los datos de los shorts cargados (solo los válidos)

// Infinite scroll variables
let nextPageToken = null; // Token para la siguiente página de resultados de la API
let isLoadingShorts = false; // Bandera para evitar múltiples solicitudes simultáneas
let shortsToLoadExtra = 0; // Contador de videos eliminados para cargar extras
const MAX_RESULTS_PER_PAGE = 10; // Número de resultados por cada llamada a la API

// --- IntersectionObserver para la reproducción de Shorts ---
// Este observador se encarga de reproducir/pausar videos cuando entran/salen del viewport.
const playShortObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const shortCard = entry.target;
    const videoId = shortCard.dataset.videoId;
    const player = allShortPlayers[videoId];

    if (!player || !player.playVideo || !player.pauseVideo) { // Verificar si el reproductor está listo
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

// --- IntersectionObserver para el Scroll Infinito ---
// Este observador se encarga de cargar más shorts cuando se llega al final.
const loadMoreObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !isLoadingShorts && nextPageToken !== null) {
      console.log("Activando carga de más shorts...");
      loadShorts(nextPageToken);
    } else if (nextPageToken === null) {
      shortsLoadingIndicator.style.display = 'none'; // No hay más shorts para cargar
    }
  });
}, { threshold: 0.1 }); // Se activa cuando el 10% del elemento es visible

/**
 * Esta función es llamada automáticamente por el IFrame Player API de YouTube
 * cuando el código del reproductor ha sido cargado.
 */
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for Shorts.");
  loadShorts(); // Iniciar la carga de shorts cuando la API esté lista
  loadMoreObserver.observe(shortsLoadingIndicator); // Empezar a observar el cargador
}

/**
 * Carga videos "Shorts" de YouTube.
 * @param {string} [pageToken=null] - Token para la siguiente página de resultados.
 */
async function loadShorts(pageToken = null) {
  if (isLoadingShorts) return;
  isLoadingShorts = true;

  initialLoadingMessage.style.display = pageToken ? 'none' : 'block'; // Ocultar mensaje inicial si no es la primera carga
  shortsLoadingIndicator.style.display = 'flex'; // Mostrar spinner de carga de más shorts

  // Ajustar maxResults para compensar videos eliminados
  const actualMaxResults = MAX_RESULTS_PER_PAGE + shortsToLoadExtra;
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(shortsQuery)}&type=video&videoDuration=short&maxResults=${actualMaxResults}&key=${apiKey}`;

  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  console.log(`Cargando shorts con URL: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Error HTTP: ${res.status} - ${errorBody.error?.message || errorBody.message || 'Error desconocido de la API.'}`);
    }
    const data = await res.json();

    nextPageToken = data.nextPageToken || null; // Actualizar el token para la próxima carga
    shortsToLoadExtra = 0; // Resetear el contador de extras después de una carga exitosa

    if (data.items && data.items.length > 0) {
      // Limpiar mensaje de carga inicial solo si se encontraron videos
      if (!pageToken) {
        initialLoadingMessage.style.display = 'none';
      }

      for (const item of data.items) {
        if (!item.id || !item.id.videoId) {
          console.warn("Item no es un video o no tiene videoId:", item);
          continue;
        }
        await createShortCard(item.id.videoId, item.snippet.title); // Usar await para asegurar que el DOM se actualice
      }
    } else {
      if (!pageToken) { // Si es la primera carga y no hay resultados
        shortsContainer.innerHTML = "<p class='initial-loading-message'>No se encontraron Shorts para esta búsqueda.</p>";
      } else { // Si no hay más resultados en cargas posteriores
        console.log("No hay más shorts para cargar.");
      }
      nextPageToken = null; // Indicar que no hay más páginas
    }

  } catch (error) {
    console.error("Error al cargar Shorts:", error);
    if (!pageToken) {
      shortsContainer.innerHTML = `<p class='initial-loading-message' style='color: red;'>Ocurrió un error al cargar los Shorts.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
    } else {
      console.error("Error al cargar más shorts:", error);
    }
    nextPageToken = null; // No intentar cargar más si hay un error
  } finally {
    isLoadingShorts = false;
    shortsLoadingIndicator.style.display = nextPageToken ? 'flex' : 'none'; // Ocultar si no hay más páginas
  }
}

/**
 * Crea la tarjeta HTML para un short y lo inicializa con su reproductor.
 * @param {string} videoId - El ID del video de YouTube.
 * @param {string} title - El título del video.
 */
async function createShortCard(videoId, title) {
  const shortCard = document.createElement("div");
  shortCard.className = "short-card";
  shortCard.dataset.videoId = videoId; // Almacenar el videoId en un data attribute

  // Insertar antes del indicador de carga
  shortsContainer.insertBefore(shortCard, shortsLoadingIndicator);

  // El contenido real del short se cargará en el onReady del reproductor
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

  // Retrasar la creación del reproductor para que el DOM esté listo
  await new Promise(resolve => setTimeout(resolve, 50)); // Pequeño retraso para asegurar el DOM

  allShortPlayers[videoId] = new YT.Player(`player-${videoId}`, {
    videoId: videoId,
    playerVars: {
      'autoplay': 0, // No autoplay inicialmente, lo controlará el IntersectionObserver
      'controls': 0,
      'modestbranding': 1,
      'rel': 0,
      'mute': 1, // ¡Importante! Inicia silenciado por defecto
      'loop': 0,
      'playlist': videoId, // Truco para que el 'loop' funcione (aunque lo controlamos manualmente)
      'playsinline': 1 // Para iOS
    },
    events: {
      'onReady': (event) => {
        console.log(`Short player ${videoId} ready.`);
        event.target.mute(); // Asegúrate de que el video esté silenciado al cargarse
        updateShortControls(videoId, event.target.getPlayerState(), event.target.isMuted());
        playShortObserver.observe(shortCard); // Empezar a observar este short
      },
      'onStateChange': (event) => {
        updateShortControls(videoId, event.data, allShortPlayers[videoId].isMuted());
        // Si el video termina, podemos decidir si queremos loop o cargar el siguiente
        if (event.data === YT.PlayerState.ENDED) {
          // Si quieres que un short haga loop indefinidamente:
          allShortPlayers[videoId].seekTo(0);
          allShortPlayers[videoId].playVideo();
        }
      },
      'onError': (event) => {
        console.error(`Error en el short ${videoId}:`, event.data);
        // Códigos de error de YouTube:
        // 100: Video no encontrado/privado/borrado
        // 101/150: No se permite la reproducción en el reproductor embebido
        if (event.data === 100 || event.data === 101 || event.data === 150) {
          console.warn(`Short ${videoId} no disponible o no reproducible. Eliminando...`);
          shortCard.remove(); // Eliminar la tarjeta del DOM
          delete allShortPlayers[videoId]; // Eliminar el reproductor de la lista
          shortsToLoadExtra++; // Contar que un video no válido fue cargado
          // Si el video eliminado era el actualmente activo, reinicia la lógica del observador
          if (currentActiveShortId === videoId) {
            currentActiveShortId = null;
            // Buscar el siguiente video visible para activar su reproducción
            shortsContainer.querySelectorAll('.short-card').forEach(card => {
              if (card.offsetWidth > 0 && card.offsetHeight > 0) { // Solo si es visible
                playShortObserver.unobserve(card); // Desobserva temporalmente
                playShortObserver.observe(card); // Re-observa para forzar la verificación
              }
            });
          }
          // Para asegurar que el scroll infinito intente cargar más rápido
          if (!isLoadingShorts && nextPageToken !== null) {
            loadShorts(nextPageToken);
          }
        }
      }
    }
  });

  // Añadir listeners a los botones de control específicos de este short
  shortCard.querySelector('.short-play-pause-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const player = allShortPlayers[e.currentTarget.dataset.videoId];
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  });

  shortCard.querySelector('.short-mute-btn').addEventListener('click', (e) => {
    e.stopPropagation();
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

// Cargar shorts al cargar la página (la API de YouTube llama a onYouTubeIframeAPIReady)
document.addEventListener("DOMContentLoaded", () => {
  // Nada aquí, ya que onYouTubeIframeAPIReady maneja la carga inicial
});
