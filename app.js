document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
  const videoContainer = document.getElementById("video-container");
  const otherVideosContainer = document.getElementById("other-videos-container");
  const searchInput = document.getElementById("search-input");
  const searchToggle = document.getElementById("search-toggle");
  const languageBtn = document.getElementById("language-btn");
  const languageModal = document.getElementById("language-modal");
  const closeModal = document.getElementById("close-modal");
  const searchBar = document.getElementById("search-bar");

  let nextPageToken = null;
  let currentVideoId = null;
  let currentQuery = "videos para niños";
  let currentLang = "";
  let scrollPosition = 0;

  // Alternar barra de búsqueda con la lupa
  searchToggle?.addEventListener("click", () => {
    searchBar.classList.toggle("hidden");
    if (!searchBar.classList.contains("hidden")) {
      searchInput.focus();
    }
  });

  // Buscar al escribir
  searchInput?.addEventListener("input", () => {
    const inputValue = searchInput.value.trim();
    currentQuery = inputValue || "videos para niños";
    otherVideosContainer.innerHTML = "";
    nextPageToken = null;
    fetchVideos(currentQuery, currentLang);
  });

  // Buscar al presionar Enter
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputValue = searchInput.value.trim();
      currentQuery = inputValue || "videos para niños";
      otherVideosContainer.innerHTML = "";
      nextPageToken = null;
      fetchVideos(currentQuery, currentLang);
    }
  });

  // Mostrar modal de idioma
  languageBtn?.addEventListener("click", () => {
    languageModal.classList.add("show");
  });

  // Cerrar modal
  closeModal?.addEventListener("click", () => {
    languageModal.classList.remove("show");
  });

  // Selección de idioma
  document.querySelectorAll("#language-modal button[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentLang = btn.dataset.lang;
      currentQuery = searchInput.value.trim() || "videos para niños";
      otherVideosContainer.innerHTML = "";
      nextPageToken = null;
      fetchVideos(currentQuery, currentLang);
      languageModal.classList.remove("show");
    });
  });

  async function fetchVideos(query = currentQuery, lang = currentLang, pageToken = null) {
    try {
      const safeQuery = query.toLowerCase().includes("niños") ? query : `${query} para niños`;

      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(safeQuery)}&key=${API_KEY}`;
      if (pageToken) url += `&pageToken=${pageToken}`;
      if (lang) url += `&relevanceLanguage=${lang}`;

      const res = await fetch(url);
      const data = await res.json();

      // Limpiar mensaje anterior solo si es una nueva búsqueda (sin paginación)
      if (!pageToken) {
        otherVideosContainer.innerHTML = "";
      }

      // Si no hay resultados
      if (!data.items || data.items.length === 0) {
        if (!pageToken) {
          otherVideosContainer.innerHTML = "<p>No se encontraron videos.</p>";
        }
        return;
      }

      data.items.forEach(createVideoCard);
      nextPageToken = data.nextPageToken || null;

    } catch (err) {
      console.error("Error al cargar videos:", err);
      if (!pageToken) {
        otherVideosContainer.innerHTML = `<p>Error: ${err.message}</p>`;
      }
    }
  }

  function createVideoCard(item) {
    const videoId = item.id.videoId;
    const { title, thumbnails, channelTitle } = item.snippet;

    const card = document.createElement("div");
    card.className = "video-card";
    card.onclick = () => {
      playVideo(videoId);
      // Ocultar barra al seleccionar un video
      if (!searchBar.classList.contains("hidden")) {
        searchBar.classList.add("hidden");
      }
    };

    card.innerHTML = `
      <img src="${thumbnails.medium.url}" class="video-thumb" alt="${title}" />
      <div class="video-info">
        <p class="video-title">${title}</p>
        <p class="video-channel">${channelTitle}</p>
      </div>
    `;

    otherVideosContainer.appendChild(card);
  }

  function playVideo(videoId) {
    if (currentVideoId === videoId) return;
    scrollPosition = window.scrollY;
    videoContainer.classList.add("active");
    videoContainer.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?autoplay=1"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>
    `;
    currentVideoId = videoId;
    window.scrollTo({ top: scrollPosition, behavior: 'auto' });
  }

  // Scroll infinito
  window.addEventListener("scroll", () => {
    const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
    if (bottom && nextPageToken) {
      const token = nextPageToken;
      nextPageToken = null;
      fetchVideos(currentQuery, currentLang, token);
    }
  });

  // Carga inicial
  fetchVideos();
});