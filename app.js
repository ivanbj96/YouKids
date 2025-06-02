// **IMPORTANTE: Esta clave API está expuesta públicamente. NO USAR ASÍ EN PRODUCCIÓN.**
// Para aplicaciones en producción, use un proxy del lado del servidor para interactuar con la API.
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakKklMrusAI";
const defaultSearchQuery = "canciones cristianas para niños";

/**
 * Carga videos de YouTube usando la API y los muestra en la lista.
 * @param {string} query - El término de búsqueda para los videos.
 */
async function loadVideos(query = defaultSearchQuery) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    const data = await res.json();

    const container = document.getElementById("videoList");
    container.innerHTML = ""; // Limpiar videos existentes

    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        const video = document.createElement("div");
        video.className = "video";

        // Aquí puedes hacer que el video sea clickeable para abrirlo en YouTube si quieres
        // video.onclick = () => window.open(`https://www.youtube.com/watch?v=${item.id.videoId}`, '_blank');

        video.innerHTML = `
          <img class="video-thumbnail" src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}">
          <div class="video-title">${item.snippet.title}</div>
          <div class="channel-info">
            <!-- La favicon de YouTube es genérica; si quieres el avatar del canal, requiere otra llamada a la API -->
            <img src="https://www.google.com/s2/favicons?domain=youtube.com&sz=64" alt="Canal">
            <span>${item.snippet.channelTitle}</span>
          </div>
        `;
        container.appendChild(video);
      });
    } else {
      container.innerHTML = "<p style='text-align: center; margin-top: 20px;'>No se encontraron videos para esta búsqueda.</p>";
    }

  } catch (error) {
    console.error("Error al cargar videos:", error);
    const container = document.getElementById("videoList");
    container.innerHTML = "<p style='text-align: center; margin-top: 20px; color: red;'>Ocurrió un error al cargar los videos. Por favor, inténtalo de nuevo más tarde o verifica tu conexión.</p>";
  }
}

/**
 * Filtra los videos basados en el término de búsqueda ingresado por el usuario.
 */
function filterVideos() {
  const searchTerm = document.getElementById("search").value.trim();
  if (searchTerm) {
    loadVideos(searchTerm);
  } else {
    // Si el campo de búsqueda está vacío, carga los videos por defecto
    loadVideos(defaultSearchQuery);
  }
}

// Cargar videos al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
  loadVideos(); // Carga los videos por defecto al cargar la página

  // --- REGISTRO DEL SERVICE WORKER para la PWA ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registrado con éxito:', registration.scope);
        })
        .catch(error => {
          console.error('Fallo el registro del Service Worker:', error);
        });
    });
  }
});
