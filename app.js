const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const API_URL = "https://www.googleapis.com/youtube/v3/search";

// Mapeo de filtros a parámetros (puedes personalizar esto según tu backend o tus reglas)
const CATEGORY_KEYWORDS = {
  all: '',
  music: 'música cristiana niños',
  stories: 'historias bíblicas niños'
};

const LANGUAGE_SUFFIX = {
  es: 'en español',
  en: 'in English'
};

document.addEventListener("DOMContentLoaded", () => {
  const filterForm = document.querySelector("form");
  filterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const category = document.getElementById("category").value;
    const language = document.getElementById("language").value;
    await fetchVideos(category, language);
    closeFilterModal();
  });

  // Carga inicial con filtros por defecto
  fetchVideos("all", "es");
});

async function fetchVideos(category, language) {
  const searchQuery = `${CATEGORY_KEYWORDS[category]} ${LANGUAGE_SUFFIX[language]}`.trim();

  const params = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    q: searchQuery,
    type: "video",
    maxResults: 10,
    videoEmbeddable: "true",
    safeSearch: "strict"
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.items) {
      renderVideos(data.items);
    } else {
      renderError("No se encontraron resultados.");
    }
  } catch (error) {
    console.error("Error al buscar videos:", error);
    renderError("Error al cargar videos.");
  }
}

function renderVideos(videos) {
  const main = document.querySelector("main");
  main.innerHTML = ""; // Limpiar contenido anterior

  videos.forEach((video) => {
    const videoId = video.id.videoId;
    const title = video.snippet.title;
    const thumbnail = video.snippet.thumbnails.medium.url;

    const card = document.createElement("div");
    card.style.margin = "1rem";
    card.style.textAlign = "center";

    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" style="text-decoration: none; color: inherit;">
        <img src="${thumbnail}" alt="${title}" style="border-radius: 0.75rem; width: 100%; max-width: 360px;">
        <p style="margin-top: 0.5rem;">${title}</p>
      </a>
    `;

    main.appendChild(card);
  });
}

function renderError(message) {
  const main = document.querySelector("main");
  main.innerHTML = `<p style="padding: 2rem; text-align: center; color: #b00020;">${message}</p>`;
}