const videoContainer = document.getElementById('video-container');
const otherVideosContainer = document.getElementById('other-videos-container');
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <-- ¡REEMPLAZA ESTA CLAVE!
let nextPageToken = null;
let currentPlayingVideo = null;

async function fetchVideos(searchQuery = "", language = "", pageToken = null) {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=videos+para+niños&key=${API_KEY}`;
    if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
    if (language) url += `&videoCaption=closedCaption&videoDuration=any&videoSyndicated=true&type=video&videoCategoryId=22`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = await fetch(url);
    const data = await response.json();

    const fragments = data.items.map(item => {
        const videoDiv = document.createElement('div');
        videoDiv.classList.add('bg-white', 'rounded-lg', 'shadow', 'mb-4', 'p-4', 'relative', 'cursor-pointer');
        videoDiv.addEventListener("click", handleVideoPlay);

        videoDiv.innerHTML = `
          <div class="overflow-hidden aspect-video">
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${item.id.videoId}?enablejsapi=1" title="${item.snippet.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
          <h3 class="text-xl font-bold mt-2">${item.snippet.title}</h3>
          <p class="text-gray-600 flex items-center">
            <img src="${item.snippet.thumbnails.default.url}" alt="Channel Icon" class="rounded-full h-8 w-8 mr-2">
            ${item.snippet.channelTitle}
          </p>
        `;
        return videoDiv;
    });

    otherVideosContainer.append(...fragments); // Agregar eficientemente varios nodos
    nextPageToken = data.nextPageToken;
  } catch (error) {
    console.error("Error al obtener videos:", error);
    videoContainer.innerHTML = "<p>Error al cargar videos. Intenta de nuevo más tarde.</p>";
  }
}


function handleVideoPlay(event) {
    const iframe = event.target.querySelector('iframe');
    if (currentPlayingVideo && currentPlayingVideo !== iframe) {
      currentPlayingVideo.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
    currentPlayingVideo = iframe;
    videoContainer.innerHTML = ''; // Limpiar el contenedor principal
    videoContainer.appendChild(iframe.parentElement); // Mover el video al contenedor principal
    iframe.parentElement.classList.add('w-screen'); // Expandir el video a pantalla completa
}

function handleScroll() {
  const scrollPosition = window.pageYOffset + window.innerHeight;
  const documentHeight = document.body.scrollHeight;

  if (scrollPosition + 1 >= documentHeight && nextPageToken) {
    fetchVideos(searchInput.value, languageFilter.value, nextPageToken);
    nextPageToken = null;
  }
}

window.addEventListener('scroll', handleScroll);

const searchInput = document.getElementById('search-input');
const languageFilter = document.getElementById('language-filter');

searchInput.addEventListener('input', () => {
  otherVideosContainer.innerHTML = ''; //Limpiar el contenedor
  nextPageToken = null;
  fetchVideos(searchInput.value, languageFilter.value);
});

languageFilter.addEventListener('change', () => {
    otherVideosContainer.innerHTML = ''; //Limpiar el contenedor
    nextPageToken = null;
    fetchVideos(searchInput.value, languageFilter.value);
});

fetchVideos();
