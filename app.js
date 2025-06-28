document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
  const videoContainer = document.getElementById("video-container");
  const otherVideosContainer = document.getElementById("other-videos-container");
  const searchInput = document.getElementById("search-input");
  const searchToggle = document.getElementById("search-toggle");
  const searchBar = document.getElementById("search-bar");
  const languageBtn = document.getElementById("language-btn");
  const languageModal = document.getElementById("language-modal");
  const closeModal = document.getElementById("close-modal");

  let nextPageToken = null;
  let currentVideoId = null;
  let currentQuery = "videos para niños";
  let currentLang = "";
  let scrollPosition = 0;

  // Mostrar barra al hacer clic en lupa
  searchToggle?.addEventListener("click", () => {
    searchBar.classList.remove("hidden");
    searchInput.focus();
  });

  // Ocultar barra al hacer scroll
  let lastScrollTop = 0;
  window.addEventListener("scroll", () => {
    if (!searchBar.classList.contains("hidden")) {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (Math.abs(scrollTop - lastScrollTop) > 20) {
        searchBar.classList.add("hidden");
      }
      lastScrollTop = scrollTop;
    }

    // Scroll infinito
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
    if (nearBottom && nextPageToken) {
      const token = nextPageToken;
      nextPageToken = null;
      fetchVideos(currentQuery, currentLang, token);
    }
  });

  // Ocultar barra al hacer clic en un video
  function hideSearchBar() {
    searchBar.classList.add("hidden");
  }

  languageBtn?.addEventListener("click", () => {
    languageModal.classList.add("show");
  });

  closeModal?.addEventListener("click", () => {
    languageModal.classList.remove("show");
  });

  document.querySelectorAll("#language-modal button[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentLang = btn.dataset.lang;
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
      hideSearchBar();
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

  searchInput?.addEventListener("input", () => {
    currentQuery = searchInput.value.trim() || "videos para niños";
    otherVideosContainer.innerHTML = "";
    nextPageToken = null;
    fetchVideos(currentQuery, currentLang);
  });

  fetchVideos();
});