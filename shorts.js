const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI'; // Reemplaza con tu clave real
const container = document.getElementById('video-container');
const searchTerms = [
  "canciones cristianas para niños",
  "biblia para niños",
  "historias cristianas infantiles",
  "valores cristianos para niños",
  "escuela dominical niños"
];

let nextPageToken = null;
let videoIdsVistos = new Set();
let isLoading = false;
let players = []; // Array de instancias YT.Player

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
      if (videoIdsVistos.has(videoId)) continue;
      videoIdsVistos.add(videoId);

      const videoFrame = document.createElement('div');
      videoFrame.className = 'video-item';
      const frameId = `player-${videoId}`;

      videoFrame.innerHTML = `
        <div class="control-zone top-control" data-action="toggle-mute"></div>
        <div class="control-zone bottom-control" data-action="toggle-play"></div>
        <div id="${frameId}"></div>
      `;

      container.appendChild(videoFrame);

      // Inicializa el reproductor de forma dinámica
      createPlayer(frameId, videoId, videoFrame);
    }
  } catch (err) {
    console.error('Error al cargar videos:', err);
  }

  isLoading = false;
}

// Inicializa el reproductor y configura controles
function createPlayer(containerId, videoId, wrapper) {
  const player = new YT.Player(containerId, {
    height: "100%",
    width: "100%",
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      mute: 1,
      controls: 0,
      loop: 1,
      playlist: videoId,
      playsinline: 1
    },
    events: {
      onReady: (event) => {
        const top = wrapper.querySelector('.top-control');
        const bottom = wrapper.querySelector('.bottom-control');

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

        players.push(event.target); // guarda instancia para control global
        updatePlayback(); // actualiza playback según scroll
      }
    }
  });
}

// Detecta el video visible y gestiona reproducción automática
function updatePlayback() {
  const scrollPosition = container.scrollTop;
  const viewportHeight = window.innerHeight;

  players.forEach((player) => {
    const playerElement = player.getIframe().parentElement;
    const rect = playerElement.getBoundingClientRect();

    if (rect.top >= 0 && rect.top < viewportHeight * 0.5) {
      if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
        player.playVideo();
      }
    } else {
      if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      }
    }
  });
}

// Scroll infinito + detección de reproducción activa
container.addEventListener('scroll', () => {
  const bottomReached = container.scrollTop + container.clientHeight >= container.scrollHeight - 300;
  if (bottomReached) loadVideos();
  updatePlayback();
});

// Carga inicial
window.addEventListener('load', () => {
  loadVideos(true);
});