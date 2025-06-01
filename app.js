const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const baseUrl = "https://www.googleapis.com/youtube/v3/search";

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const searchForm = document.getElementById("search-form");

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      fetchVideos(query);
    }
  });

  // Búsqueda inicial por defecto
  fetchVideos("videos cristianos para niños");
});

async function fetchVideos(query) {
  try {
    const url = `${baseUrl}?key=${apiKey}&part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log("YouTube API response:", data); // Para debug

    if (data.error) {
      renderError(`Error de API: ${data.error.message}`);
      return;
    }

    renderVideos(data.items);
  } catch (error) {
    console.error("Error al buscar videos:", error);
    renderError("Ocurrió un error al cargar los videos.");
  }
}

function renderVideos(videos) {
  const main = document.querySelector("main");
  main.innerHTML = "";

  videos.forEach((video) => {
    if (!video.id || !video.id.videoId) return; // Aseguramos que sea video válido

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
  main.innerHTML = `<p style="color: red; text-align: center;">${message}</p>`;
}