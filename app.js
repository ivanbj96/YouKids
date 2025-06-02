// ======================================================================
// !!! IMPORTANTE: CLAVE API DE YOUTUBE !!!
// ======================================================================
// Por razones de seguridad, NUNCA expongas tu clave API directamente en el código del lado del cliente en producción.
// Para proyectos reales, utiliza un proxy del lado del servidor para interactuar con la API de YouTube.
// Por ahora, para pruebas locales, reemplaza "TU_CLAVE_API_DE_YOUTUBE" con tu clave real.
// Asegúrate de que la "YouTube Data API v3" esté habilitada en tu proyecto de Google Cloud Console.
// ======================================================================
const apiKey = "TU_CLAVE_API_DE_YOUTUBE"; // <-- ¡REEMPLAZA ESTO CON TU CLAVE REAL!
const defaultSearchQuery = "canciones cristianas para niños";

// Elementos del DOM
const videoListContainer = document.getElementById("video-list");
const searchButton = document.getElementById("search-button");
const filterButton = document.getElementById("filter-button");
const searchModal = document.getElementById("search-modal");
const filterModal = document.getElementById("filterModal");
const searchInput = document.getElementById("search-input");
const applySearchButton = document.getElementById("apply-search");
const cancelSearchButton = document.getElementById("cancel-search");
const closeFilterButton = document.getElementById("closeFilter");
const applyFiltersButton = document.getElementById("applyFilters");

// Elementos del modal de filtros
const regionFilter = document.getElementById("regionFilter");
const videoGenreFilter = document.getElementById("videoGenreFilter");
const musicGenreFilter = document.getElementById("musicGenreFilter");
const religionFilter = document.getElementById("religionFilter");
const blockedChannelsInput = document.getElementById("blockedChannels");

// --- Funciones de Utilidad ---

/**
 * Muestra u oculta un modal añadiendo/quitando la clase 'show'.
 * @param {HTMLElement} modalElement - El elemento del modal a mostrar/ocultar.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function toggleModal(modalElement, show) {
  if (show) {
    modalElement.classList.add("show");
  } else {
    modalElement.classList.remove("show");
  }
}

/**
 * Abre la URL de un video en YouTube en una nueva pestaña/ventana.
 * @param {string} videoId - El ID del video de YouTube.
 */
function openYouTubeVideo(videoId) {
  window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// --- Lógica de Carga y Filtrado de Videos ---

/**
 * Carga videos de YouTube usando la API y los muestra en la lista.
 * Aplica filtros si se proporcionan.
 * @param {Object} options - Objeto con opciones de búsqueda y filtrado.
 * @param {string} [options.query=defaultSearchQuery] - El término de búsqueda.
 * @param {string} [options.region=''] - Código de región (ej: 'EC', 'MX').
 * @param {string} [options.videoGenre=''] - Género de video (se añade a la query).
 * @param {string} [options.musicGenre=''] - Género de música (se añade a la query).
 * @param {string} [options.religion=''] - Religión (se añade a la query).
 * @param {string[]} [options.blockedChannels=[]] - Lista de canales a prohibir.
 */
async function loadVideos({
  query = defaultSearchQuery,
  region = '',
  videoGenre = '',
  musicGenre = '',
  religion = '',
  blockedChannels = []
} = {}) {

  // Construye la query completa añadiendo los términos de filtro
  let fullQuery = query;
  if (videoGenre) fullQuery += ` ${videoGenre}`;
  if (musicGenre) fullQuery += ` ${musicGenre}`;
  if (religion) fullQuery += ` ${religion}`;

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(fullQuery)}&type=video&maxResults=20&key=${apiKey}`;

  if (region) {
    url += `&regionCode=${region}`;
  }

  videoListContainer.innerHTML = "<p style='text-align: center; margin-top: 20px;'>Cargando videos...</p>";

  try {
    const res = await fetch(url);

    if (!res.ok) {
      // Intenta leer el cuerpo de la respuesta para obtener más detalles del error
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Error HTTP: ${res.status} - ${errorBody.error?.message || errorBody.message || 'Error desconocido de la API.'}`);
    }

    const data = await res.json();

    videoListContainer.innerHTML = ""; // Limpiar videos existentes
    let filteredItems = data.items || [];

    // Filtrado de canales bloqueados (client-side)
    if (blockedChannels.length > 0) {
      const lowercasedBlockedChannels = blockedChannels.map(c => c.toLowerCase());
      filteredItems = filteredItems.filter(item => {
        return !lowercasedBlockedChannels.includes(item.snippet.channelTitle.toLowerCase());
      });
    }

    if (filteredItems.length > 0) {
      for (const item of filteredItems) {
        // Asegúrate de que el item sea un video y tenga un ID válido
        if (!item.id || !item.id.videoId) {
          console.warn("Item no es un video o no tiene videoId:", item);
          continue; // Saltar este item
        }

        const videoCard = document.createElement("div");
        videoCard.className = "video-card";
        videoCard.onclick = () => openYouTubeVideo(item.id.videoId); // Hacer la tarjeta clickeable

        // La favicon de YouTube es genérica. Para avatares reales, necesitarías otra llamada a la API
        const channelAvatarUrl = `https://www.google.com/s2/favicons?domain=youtube.com&sz=64`;

        videoCard.innerHTML = `
          <img class="video-thumbnail" src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}">
          <div class="video-info">
            <img class="channel-img" src="${channelAvatarUrl}" alt="Canal">
            <div class="video-details">
              <div class="video-title">${item.snippet.title}</div>
              <div class="channel-name">${item.snippet.channelTitle}</div>
            </div>
          </div>
        `;
        videoListContainer.appendChild(videoCard);
      }
    } else {
      videoListContainer.innerHTML = "<p style='text-align: center; margin-top: 20px;'>No se encontraron videos para esta búsqueda y filtros.</p>";
    }

  } catch (error) {
    console.error("Error al cargar videos:", error);
    videoListContainer.innerHTML = `<p style='text-align: center; margin-top: 20px; color: red;'>Ocurrió un error al cargar los videos.<br>Por favor, verifica tu clave API y conexión a internet.<br>Detalle: ${error.message}</p>`;
  }
}

/**
 * Recoge los valores de los filtros y el término de búsqueda, y llama a loadVideos.
 * Esta función es el punto central para iniciar una nueva búsqueda/filtrado.
 */
function applyFiltersAndSearch() {
  const currentSearchTerm = searchInput.value.trim();
  const blockedChannels = blockedChannelsInput.value.split(',').map(ch => ch.trim()).filter(ch => ch !== '');

  loadVideos({
    query: currentSearchTerm || defaultSearchQuery, // Si la búsqueda está vacía, usa la query por defecto
    region: regionFilter.value,
    videoGenre: videoGenreFilter.value,
    musicGenre: musicGenreFilter.value,
    religion: religionFilter.value,
    blockedChannels: blockedChannels
  });

  // Cerrar ambos modales después de aplicar los filtros/búsqueda
  toggleModal(searchModal, false);
  toggleModal(filterModal, false);
}


// --- Event Listeners para la UI ---

// Botón de búsqueda en el header
searchButton.addEventListener("click", () => {
  toggleModal(searchModal, true);
  searchInput.focus(); // Enfoca el input al abrir
});

// Botón "Buscar" dentro del modal de búsqueda
applySearchButton.addEventListener("click", applyFiltersAndSearch);

// Botón "Cancelar" dentro del modal de búsqueda
cancelSearchButton.addEventListener("click", () => {
  toggleModal(searchModal, false);
});

// Permitir buscar con Enter en el modal de búsqueda
searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    applyFiltersAndSearch();
  }
});

// Botón de filtro en el header
filterButton.addEventListener("click", () => {
  toggleModal(filterModal, true);
});

// Botón para cerrar el modal de filtros
closeFilterButton.addEventListener("click", () => {
  toggleModal(filterModal, false);
});

// Botón "Aplicar Filtros" dentro del modal de filtros
applyFiltersButton.addEventListener("click", applyFiltersAndSearch);


// --- Inicialización ---

// Cargar videos al iniciar la página con la query por defecto
document.addEventListener("DOMContentLoaded", () => {
  loadVideos({ query: defaultSearchQuery });
});
