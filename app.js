const videoContainer = document.getElementById('video-container');
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <--- ¡REEMPLAZA ESTA CLAVE!

// ... (API_KEY permanece igual)

async function fetchVideos(searchQuery = "", language = "") { // Añadido searchQuery y language
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=cristianismo&key=${API_KEY}`;
    if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`; // Añade la consulta de búsqueda
    if (language) url += `&videoCaption=closedCaption&videoDuration=any&videoSyndicated=true&type=video&videoCategoryId=22`; // filtros básicos



    const response = await fetch(url);
    const data = await response.json();

    videoContainer.innerHTML = ''; // Limpia el contenedor antes de añadir nuevos videos

    data.items.forEach(item => {
      const videoDiv = document.createElement('div');
      videoDiv.classList.add('bg-white', 'rounded-lg', 'shadow', 'mb-4', 'p-4');


      videoDiv.innerHTML = `
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${item.id.videoId}" title="${item.snippet.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        <h3 class="text-xl font-bold mt-2">${item.snippet.title}</h3>
        <p class="text-gray-600">${item.snippet.channelTitle}</p>
        <img src="${item.snippet.thumbnails.default.url}" alt="Channel Icon" class="rounded-full h-8 w-8 inline mr-2"> <!-- imagen circular del canal -->
      `;
      videoContainer.appendChild(videoDiv);
    });
  } catch (error) {
    console.error("Error al obtener videos:", error);
    videoContainer.innerHTML = "<p>Error al cargar los videos. Por favor, intenta más tarde.</p>";
  }
}


//Eventos para el buscador y el filtro
const searchInput = document.getElementById('search-input');
const languageFilter = document.getElementById('language-filter');

searchInput.addEventListener('input', () => {
  fetchVideos(searchInput.value, languageFilter.value);
});

languageFilter.addEventListener('change', () => {
  fetchVideos(searchInput.value, languageFilter.value);
});

fetchVideos(); // Carga inicial
