const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI'; // Reemplázalo con tu clave real
const container = document.getElementById('video-container');

// Términos seguros y amigables para niños
const searchTerms = [
  "dibujos animados para niños",
  "cuentos infantiles",
  "videos educativos para niños",
  "aprender colores niños",
  "números y letras",
  "canciones infantiles"
];

// Estado
let nextPageToken = null;
let isLoading = false;

function getRandomSearchTerm() {
  const randomIndex = Math.floor(Math.random() * searchTerms.length);
  return searchTerms[randomIndex];
}

async function loadVideos(initialLoad = false) {
  if (isLoading) return;
  isLoading = true;

  const query = getRandomSearchTerm();
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&videoEmbeddable=true&safeSearch=strict&maxResults=5&q=${encodeURIComponent(
    query
  )}&key=${API_KEY}`;

  if (nextPageToken && !initialLoad) {
    url += `&pageToken=${nextPageToken}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    nextPageToken = data.nextPageToken;

    data.items.forEach((item) => {
      const videoId = item.id.videoId;
      const videoFrame = document.createElement('div');
      videoFrame.className = 'video-item';
      videoFrame.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}" 
          allow="autoplay; encrypted-media" 
          allowfullscreen>
        </iframe>`;
      container.appendChild(videoFrame);
    });
  } catch (error) {
    console.error('Error al cargar los videos:', error);
  }

  isLoading = false;
}

// Scroll infinito
container.addEventListener('scroll', () => {
  const bottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 200;
  if (bottom) {
    loadVideos();
  }
});

// Carga inicial aleatoria
window.addEventListener('load', () => {
  loadVideos(true);
});