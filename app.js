// **ADVERTENCIA DE SEGURIDAD: NO USAR ASÍ EN PRODUCCIÓN.**
// Esta clave API está expuesta públicamente en el lado del cliente.
// Para una aplicación real, usa un proxy del lado del servidor para interactuar con la API.
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakKklMrusAI";
let currentKeyword = "videos cristianos niños";

/**
 * Carga videos de YouTube usando la API y los muestra en la lista.
 * **NOTA DE CUOTA API:** Esta función realiza una llamada API adicional por cada canal para obtener su imagen,
 * lo que puede agotar rápidamente tu cuota diaria de YouTube API si cargas muchos videos.
 * Considera optimizar esto para producción.
 * @param {string} query - El término de búsqueda para los videos.
 */
async function fetchVideos(query = currentKeyword) {
  const container = document.getElementById("video-list");
  container.innerHTML = '<p style="text-align: center; margin-top: 20px;">Cargando videos...</p>';

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=100&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

  try {
    const res = await fetch(searchUrl);
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status} - ${res.statusText}`);
    }
    const data = await res.json();

    container.innerHTML = ""; // Limpiar mensaje de carga

    if (data.items && data.items.length > 0) {
      // Recopilar IDs de canales únicos para hacer una sola llamada de canales
      const channelIds = new Set();
      data.items.forEach(item => {
        if (item.snippet.channelId) {
          channelIds.add(item.snippet.channelId);
        }
      });

      const channelImages = {};
      if (channelIds.size > 0) {
        const channelIdsString = Array.from(channelIds).join(',');
        const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelIdsString)}&key=${apiKey}`;
        const channelRes = await fetch(channelsUrl);
        if (channelRes.ok) {
          const channelData = await channelRes.json();
          channelData.items.forEach(channel => {
            channelImages[channel.id] = channel.snippet.thumbnails.default.url;
          });
        } else {
          console.warn('No se pudieron obtener imágenes de los canales:', channelRes.status, channelRes.statusText);
        }
      }

      for (let item of data.items) {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channelTitle = item.snippet.channelTitle;
        const channelId = item.snippet.channelId;
        const channelImg = channelImages[channelId] || 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64'; // Fallback a favicon de YouTube

        const videoCard = `
          <div class="video-card">
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            <div class="video-info">
              <img src="${channelImg}" class="channel-img" alt="${channelTitle}" />
              <div>
                <strong>${title}</strong><br/>
                <small>${channelTitle}</small>
              </div>
            </div>
          </div>
        `;
        container.innerHTML += videoCard;
      }
    } else {
      container.innerHTML = "<p style='text-align: center; margin-top: 20px;'>No se encontraron videos para esta búsqueda.</p>";
    }

  } catch (error) {
    console.error("Error al cargar videos:", error);
    container.innerHTML = "<p style='text-align: center; margin-top: 20px; color: red;'>Ocurrió un error al cargar los videos. Por favor, inténtalo de nuevo más tarde o verifica tu conexión.</p>";
  }
}

/**
 * Abre el modal de búsqueda.
 */
function openFilterModal() {
  document.getElementById("search-modal").classList.add("show");
  document.getElementById("search-input").value = currentKeyword;
  document.getElementById("search-input").focus();
}

/**
 * Aplica la búsqueda de videos con la palabra clave ingresada en el modal.
 */
function applySearch() {
  const input = document.getElementById("search-input").value.trim();
  if (input !== "" && input !== currentKeyword) { // Solo si la palabra clave ha cambiado
    currentKeyword = input;
    fetchVideos();
  }
  closeModal();
}

/**
 * Cierra el modal de búsqueda.
 */
function closeModal() {
  document.getElementById("search-modal").classList.remove("show");
}

// Variables y lógica para la instalación de la PWA
let deferredPrompt;
const installBtn = document.getElementById('installBtn'); // Asegúrate de que este ID existe en tu HTML

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene que el navegador muestre su propio mensaje de instalación
  e.preventDefault();
  // Almacena el evento para poder activarlo más tarde
  deferredPrompt = e;
  // Muestra tu botón de instalación
  if (installBtn) {
    installBtn.style.display = 'block';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    // Muestra el mensaje de instalación
    deferredPrompt.prompt();
    // Espera la elección del usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('Instalación de PWA aceptada por el usuario');
    } else {
      console.log('Instalación de PWA rechazada por el usuario');
    }

    // Oculta el botón después de la interacción (independientemente del resultado)
    installBtn.style.display = 'none';
    deferredPrompt = null;
  });
}

// Listener para cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
  fetchVideos(); // Carga los videos por defecto al iniciar

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
