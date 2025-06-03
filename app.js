// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// ¡¡REEMPLAZA ESTO CON TU CLAVE REAL DE LA API DE YOUTUBE!!
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// Sin una clave válida, la búsqueda de videos NO FUNCIONARÁ.
// ======================================================================
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡¡VERIFICA Y REEMPLAZA!!

// ======================================================================
// Elementos del DOM para la página principal (index.html)
// ======================================================================
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const videosContainer = document.getElementById("videos-container");
const loadingIndicator = document.getElementById("loading-indicator");
const videoPlayerOverlay = document.getElementById("video-player"); // El div que contiene el iframe y el botón de cerrar
const closePlayerButton = document.getElementById("close-player-button");

let currentVideoPlayer = null; // Para la instancia del reproductor de YouTube API
let nextVideosPageToken = null; // Para la paginación de videos de la búsqueda
let isLoading = false; // Para controlar la carga de videos y evitar solicitudes duplicadas

// ======================================================================
// Lógica para el botón de instalación de la PWA (compartido entre index y shorts)
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
    installButtonContainer.style.display = 'flex'; // Usar 'flex' para estilos CSS
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
      deferredPrompt = null; // Resetea deferredPrompt

      if (outcome === 'accepted') {
        console.log('YouKids PWA fue instalada con éxito!');
      } else {
        console.log('Instalación de YouKids PWA fue cancelada.');
      }
    } else {
      console.warn('El deferredPrompt es nulo. No se pudo mostrar el prompt de instalación.');
      // Fallback para iOS o navegadores que no soportan beforeinstallprompt directamente
      alert('Para instalar YouKids, usa la opción "Añadir a pantalla de inicio" en el menú de tu navegador (normalmente en los 3 puntos o el icono de compartir).');
    }
  });
}

// ======================================================================
// Registro del Service Worker (Solo se registra una vez en app.js)
// ======================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js') // Asegúrate que tu service worker se llama sw.js
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration);
      })
      .catch(error => {
        console.error('Fallo el registro del Service Worker:', error);
      });
  });
}

// ======================================================================
// Lógica de búsqueda y reproducción de videos para la página principal (index.html)
// ======================================================================

// onYouTubeIframeAPIReady es una función global que la API de YouTube llama cuando está lista.
// Necesitamos que esté definida para que la API la encuentre.
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API Ready for main app.");
  // No inicializamos un reproductor hasta que el usuario selecciona un video
}

async function searchYouTubeVideos(query, pageToken = '') {
  if (isLoading) return; // Evita búsquedas múltiples mientras una está en progreso
  isLoading = true;
  loadingIndicator.style.display = 'block'; // Muestra el indicador de carga

  // Modifica la URL para buscar contenido infantil cristiano.
  // Es difícil filtrar directamente por "cristiano" vía API, así que confiaremos en la query.
  // Eliminamos categoryId para no restringir demasiado y ampliamos el término.
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " para niños cristianos")}&type=video&maxResults=10&key=${apiKey}`;

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
      if (!pageToken) { // Si es una nueva búsqueda, limpia los videos anteriores
        videosContainer.innerHTML = '';
      }
      data.items.forEach(item => {
        if (item.id.videoId) { // Asegúrate de que es un video (no un canal o playlist)
          createVideoCard(item.id.videoId, item.snippet.title, item.snippet.thumbnails.high.url);
        }
      });
    } else {
      if (!pageToken) {
        videosContainer.innerHTML = "<p class='no-results-message'>No se encontraron videos para esta búsqueda.</p>";
      } else {
        console.log("No hay más videos para cargar.");
      }
      nextVideosPageToken = null; // No hay más páginas
    }

  } catch (error) {
    console.error("Error al buscar videos:", error);
    videosContainer.innerHTML = `<p class='error-message'>Ocurrió un error al cargar los videos.<br>Verifica tu clave API y conexión.<br>Detalle: ${error.message}</p>`;
  } finally {
    loadingIndicator.style.display = 'none'; // Oculta el indicador de carga
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
  videoPlayerOverlay.classList.add('active'); // Añade la clase 'active' para mostrar el overlay

  if (currentVideoPlayer) {
    currentVideoPlayer.destroy(); // Destruye la instancia anterior del reproductor si existe
  }

  // Crea un nuevo reproductor de YouTube dentro del elemento 'youtube-iframe'
  currentVideoPlayer = new YT.Player('youtube-iframe', {
    videoId: videoId,
    playerVars: {
      'autoplay': 1,      // Inicia la reproducción automáticamente
      'controls': 1,      // Muestra los controles del reproductor
      'modestbranding': 1, // Oculta el logo de YouTube en la barra de control
      'rel': 0            // No muestra videos relacionados al final
    },
    events: {
      'onReady': (event) => event.target.playVideo(), // Asegura que el video se reproduzca al estar listo
      'onError': (event) => console.error('Error de YouTube Player:', event.data)
    }
  });
}

// Cierra el reproductor y detiene el video
closePlayerButton.addEventListener("click", () => {
  videoPlayerOverlay.classList.remove('active'); // Elimina la clase 'active' para ocultar el overlay
  if (currentVideoPlayer) {
    currentVideoPlayer.stopVideo(); // Detiene el video
  }
});

// Event listener para el botón de búsqueda
searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) {
    searchYouTubeVideos(query); // Inicia una nueva búsqueda
  }
});

// Event listener para la tecla Enter en el campo de búsqueda
searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    searchButton.click(); // Simula un clic en el botón de búsqueda
  }
});

// Implementación de Infinite Scroll para la búsqueda principal
// Detecta cuando el usuario llega al final del contenedor de videos
videosContainer.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = videosContainer;
  // Carga más videos cuando quedan 100px para el final del scroll
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoading && nextVideosPageToken) {
    searchYouTubeVideos(searchInput.value.trim(), nextVideosPageToken);
  }
});

// Cargar la API de YouTube y realizar la búsqueda inicial al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  // Crea el script para la API de YouTube
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // Realiza la búsqueda inicial. Esto se ejecutará después de que el DOM esté listo.
  searchYouTubeVideos("canciones infantiles cristianas");
});
