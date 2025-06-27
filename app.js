const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const videoContainer = document.getElementById("video-container");
const otherVideosContainer = document.getElementById("other-videos-container");
const searchInput = document.getElementById("search-input");
const languageFilter = document.getElementById("language-filter");
const searchBtn = document.getElementById("search-btn");
const searchContainer = document.getElementById("search-container");

let nextPageToken = null;
let currentVideoId = null;
let currentQuery = "videos para niños";
let currentLang = "";

// Mostrar/ocultar barra de búsqueda
searchBtn.addEventListener("click", () => {
  searchContainer.classList.toggle("hidden");
});

// Fetch de videos
async function fetchVideos(query = currentQuery, lang = currentLang, pageToken = null) {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`;
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

// Crear card de video
function createVideoCard(item) {
  const videoId = item.id.videoId;
  const { title, thumbnails, channelTitle } = item.snippet;

  const card = document.createElement("div");
  card.className = "video-card";
  card.onclick = () => playVideo(videoId);

  card.innerHTML = `
    <img src="${thumbnails.medium.url}" class="video-thumb" alt="${title}" />
    <div class="video-info">
      <p class="video-title">${title}</p>
      <p class="video-channel">${channelTitle}</p>
    </div>
  `;

  otherVideosContainer.appendChild(card);
}

// Reproducir video en player fijo
function playVideo(videoId) {
  if (currentVideoId === videoId) return;

  videoContainer.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1"
      allow="autoplay; encrypted-media"
      allowfullscreen
    ></iframe>
  `;
  currentVideoId = videoId;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Eventos de búsqueda y filtro
searchInput.addEventListener("input", () => {
  currentQuery = searchInput.value.trim() || "videos para niños";
  otherVideosContainer.innerHTML = "";
  nextPageToken = null;
  fetchVideos(currentQuery, currentLang);
});

languageFilter.addEventListener("change", () => {
  currentLang = languageFilter.value;
  otherVideosContainer.innerHTML = "";
  nextPageToken = null;
  fetchVideos(currentQuery, currentLang);
});

// Scroll infinito
window.addEventListener("scroll", () => {
  const bottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (bottom && nextPageToken) {
    const pageToken = nextPageToken;
    nextPageToken = null; // Evitar múltiples llamadas
    fetchVideos(currentQuery, currentLang, pageToken);
  }
});

// Inicial
fetchVideos();