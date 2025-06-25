const videoContainer = document.getElementById('video-container');
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <--- ¡REEMPLAZA ESTA CLAVE!
let nextPageToken = null;

async function fetchVideos(searchQuery = "", language = "", pageToken = null) {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=videos+para+niños&key=${API_KEY}`;
    if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
    if (language) url += `&videoCaption=closedCaption&videoDuration=any&videoSyndicated=true&type=video&videoCategoryId=22`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = await fetch(url);
    const data = await response.json();

    data.items.forEach(item => {
      const videoDiv = document.createElement('div');
      videoDiv.classList.add('bg-white', 'rounded-lg', 'shadow', 'mb-4', 'p-4', 'flex', 'flex-col'); // Flexbox para mejor diseño

      videoDiv.innerHTML = `
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${item.id.videoId}" title="${item.snippet.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        <h3 class="text-xl font-bold mt-2">${item.snippet.title}</h3>
        <p class="text-gray-600 flex items-center">
          <img src="${item.snippet.thumbnails.default.url}" alt="Channel Icon" class="rounded-full h-8 w-8 mr-2">
          ${item.snippet.channelTitle}
        </p>
      `;
      videoContainer.appendChild(videoDiv);
    });

    nextPageToken = data.nextPageToken;
  } catch (error) {
    console.error("Error al obtener videos:", error);
    videoContainer.innerHTML = "<p>Error al cargar los videos. Por favor, intenta más tarde.</p>";
  }
}

function handleScroll() {
  const scrollPosition = window.pageYOffset + window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  if (scrollPosition >= documentHeight && nextPageToken) {
    fetchVideos(searchInput.value, languageFilter.value, nextPageToken);
    nextPageToken = null;
  }
}

window.addEventListener('scroll', handleScroll);

const searchInput = document.getElementById('search-input');
const languageFilter = document.getElementById('language-filter');

searchInput.addEventListener('input', () => {
  videoContainer.innerHTML = ''; // Limpia el contenedor antes de una nueva busqueda
  nextPageToken = null;
  fetchVideos(searchInput.value, languageFilter.value);
});

languageFilter.addEventListener('change', () => {
  videoContainer.innerHTML = ''; // Limpia el contenedor antes de un nuevo filtro
  nextPageToken = null;
  fetchVideos(searchInput.value, languageFilter.value);
});

fetchVideos();
