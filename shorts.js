const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI'; // Reemplaza con tu clave real
const container = document.getElementById('video-container');
const searchTerms = [
  "canciones cristianas para niños",
  "biblia para niños",
  "historias cristianas infantiles",
  "valores cristianos para niños",
  "escuela dominical niños",
];

let nextPageToken = null;
let videoIdsVistos = new Set();
let isLoading = false;

// Obtener término aleatorio
function getRandomSearchTerm() {
  const index = Math.floor(Math.random() * searchTerms.length);
  return searchTerms[index];
}

async function loadVideos(initialLoad = false) {
  if (isLoading) return;
  isLoading = true;

  const query = getRandomSearchTerm();
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoDuration=short&safeSearch=strict&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  if (nextPageToken && !initialLoad) {
    url += `&pageToken=${nextPageToken}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    nextPageToken = data.nextPageToken;

    for (const item of data.items) {
      const videoId = item.id.videoId;
      if (videoIdsVistos.has(videoId)) continue; // Evitar repeticiones
      videoIdsVistos.add(videoId);

      const videoFrame = document.createElement('div');
      videoFrame.className = 'video-item';
      videoFrame.innerHTML = `
        <div class="control-zone top-control" data-action="toggle-mute"></div>
        <div class="control-zone bottom-control" data-action="toggle-play"></div>
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&enablejsapi=1"
          allow="autoplay; encrypted-media"
          allowfullscreen
          frameborder="0"
        ></iframe>
      `;

      container.appendChild(videoFrame);
      setupControls(videoFrame, videoId);
    }
  } catch (err) {
    console.error('Error al cargar videos:', err);
  }

  isLoading = false;
}

// Controles invisibles: mute/desmute y play/pause
function setupControls(videoFrame, videoId) {
  const iframe = videoFrame.querySelector('iframe');
  const player = new YT.Player(iframe, {
    events: {
      onReady: (event) => {
        // Configura los controles invisibles
        const top = videoFrame.querySelector('.top-control');
        const bottom = videoFrame.querySelector('.bottom-control');

        top.addEventListener('click', () => {
          const muted = event.target.isMuted();
          muted ? event.target.unMute() : event.target.mute();
        });

        bottom.addEventListener('click', () => {
          const state = event.target.getPlayerState();
          if (state === YT.PlayerState.PLAYING) {
            event.target.pauseVideo();
          } else {
            event.target.playVideo();
          }
        });
      }
    }
  });
}

// Scroll infinito
container.addEventListener('scroll', () => {
  const bottomReached = container.scrollTop + container.clientHeight >= container.scrollHeight - 300;
  if (bottomReached) loadVideos();
});

// Carga inicial
window.addEventListener('load', () => {
  loadVideos(true);
});

// Carga API de YouTube JS para controlar el iframe
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}
loadYouTubeAPI();