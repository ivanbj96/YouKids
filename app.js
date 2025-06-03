// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// Por razones de seguridad, NUNCA expongas tu clave API directamente en el código del lado del cliente en producción.
// Para proyectos reales, utiliza un proxy del lado del servidor para interactuar con la API de YouTube.
// Por ahora, para pruebas locales, reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const videosContainer = document.getElementById("videos-container");
const loadingIndicator = document.getElementById("loading-indicator");
const videoPlayer = document.getElementById("video-player");
const closePlayerButton = document.getElementById("close-player-button");

let currentVideoPlayer = null; // Para el reproductor de YouTube API
let nextVideosPageToken = null; // Para la paginación de videos de la búsqueda
let isLoading = false; // Para controlar la carga de videos

// ======================================================================
// Lógica para el botón de instalación de la PWA
// ======================================================================
let deferredPrompt;
const installButtonContainer = document.getElementById('install-button-container');
const installButton = document.getElementById('install-button');

// Este evento se dispara cuando el navegador detecta que la PWA es instalable.
window.addEventListener('beforeinstallprompt', (e) => {
  // Previene que el navegador muestre su propio mini-infobar por defecto.
  e.preventDefault();
  // Guarda el evento para que podamos dispararlo más tarde con un clic de usuario.
  deferredPrompt = e;
  // Muestra tu botón de instalación personalizado.
  if (installButtonContainer) {
    installButtonContainer.style.display = 'flex'; // O 'block' si no usas flexbox para centrar
    console.log('Evento beforeinstallprompt disparado. Botón de instalación visible.');
  }
});

// Listener para el clic en tu botón de instalación personalizado.
if (installButton) {
  installButton.addEventListener('click', async () => {
    // Oculta el botón una vez que el usuario intenta instalar.
    if (installButtonContainer) {
      installButtonContainer.style.display = 'none';
    }

    if (deferredPrompt) {
      // Muestra el prompt de instalación del navegador.
      deferredPrompt.prompt();
      // Espera a que el usuario responda al prompt.
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`Respuesta del usuario al prompt de instalación: ${outcome}`);

      // El prompt solo se puede usar una vez. Si el usuario lo ignora, necesitará reiniciar la página
      // o usar la opción "Añadir a pantalla de inicio" del navegador.
      deferredPrompt = null;

      if (outcome === 'accepted') {
        console.log('YouKids PWA fue instalada con éxito!');
      } else {
        console.log('Instalación de YouKids PWA fue cancelada.');
      }
    } else {
      console.warn('El deferredPrompt es nulo. No se pudo mostrar el prompt de instalación.');
      alert('Para instalar YouKids, usa la opción "Añadir a pantalla de inicio" en el menú de tu navegador (normalmente en los 3 puntos o el icono de compartir).');
    }
  });
}

// ======================================================================
// Registro del Service Worker
// ======================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js') // <-- ¡CAMBIADO A 'sw.js'!
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration);
      })
      .catch(error => {
        console.error('Fallo el registro del Service Worker:', error);
      });
  });
}

// ======================================================================
// Lógica de búsqueda de videos (lo que ya tenías)
// ======================================================================

function loadYouTubeIframeAPI() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for main app.");
  // No hay un reproductor inicial aquí, solo cuando se selecciona un video.
}

async function searchYouTubeVideos(query, pageToken = '') {
  if (isLoading) return;
  isLoading = true;
  loadingIndicator.style.display = 'block';

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=15&maxResults=10&key=${apiKey}`; // Categoría 15 es 'Pets & Animals', no 'Kids'
  // Considera usar una categoría más relevante si existe o confiar solo en la query.
  // Para niños, podría ser "20 - Gaming" si son videos de juegos, o simplemente sin categoryId.
  // La categoría "Education" (27) o "Howto & Style" (26) a veces tienen contenido infantil.
  // Si buscas niños cristianos, solo la query es lo más fiable.
  url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;


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

    nextVideosPageToken = data.nextPageToken || null;

    if (data.items && data.items.length > 0) {
      if (!pageToken) { // Clear existing videos only for a new search
        videosContainer.innerHTML = '';
      }
      data.items.forEach(item => {
        if (item.id.videoId) {
          createVideoCard(item.id.videoId, item.snippet.title, item.snippet.thumbnails.high.url);
        }
      });
    } else {
      if (!pageToken) {
        videosContainer.innerHTML = "<p class='no-results-message'>No se encontraron videos para esta búsqueda.</p>";
      } else {
        console.log("No hay más videos para cargar.");
      }
      nextVideosPageToken = null;
    }

  } catch (error) {
    console.error("Error al buscar videos:", error);
    videosContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los videos.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
  } finally {
    loadingIndicator.style.display = 'none';
    isLoading = false;
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
  videoPlayer.style.display = 'flex'; // Muestra el contenedor del reproductor

  if (currentVideoPlayer) {
    currentVideoPlayer.destroy(); // Destruye la instancia anterior del reproductor
  }

  currentVideoPlayer = new YT.Player('youtube-iframe', {
    videoId: videoId,
    playerVars: {
      'autoplay': 1,
      'controls': 1,
      'modestbranding': 1,
      'rel': 0
    },
    events: {
      'onReady': (event) => event.target.playVideo(),
      'onError': (event) => console.error('Error de YouTube Player:', event.data)
    }
  });
}

closePlayerButton.addEventListener("click", () => {
  videoPlayer.style.display = 'none';
  if (currentVideoPlayer) {
    currentVideoPlayer.stopVideo(); // Detiene el video al cerrar
  }
});

searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) {
    searchYouTubeVideos(query);
  }
});

// Implementación de Infinite Scroll para la búsqueda principal
videosContainer.addEventListener('scroll', () => {
  if (videosContainer.scrollTop + videosContainer.clientHeight >= videosContainer.scrollHeight - 100 && !isLoading && nextVideosPageToken) {
    searchYouTubeVideos(searchInput.value.trim(), nextVideosPageToken);
  }
});

// Cargar la API de YouTube al cargar la página principal
document.addEventListener("DOMContentLoaded", () => {
  loadYouTubeIframeAPI();
  searchYouTubeVideos("videos niños cristianos"); // Búsqueda inicial por defecto
});
