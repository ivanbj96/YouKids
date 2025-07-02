const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const shortsContainer = document.getElementById("shorts-container");

let nextPageToken = null;
let isLoading = false;
let loadedVideos = new Set();
let players = [];

function initShorts() {
  if (!shortsContainer) {
    console.error("Elemento #shorts-container no encontrado.");
    return;
  }

  loadYouTubeAPI();
  fetchShortVideos();
  shortsContainer.addEventListener("scroll", handleScrollSnap);
}

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
  // Si la API ya está lista, inicializar todos los players pendientes
  players.forEach(entry => {
    if (!entry.player) {
      entry.init();
    }
  });
};

async function fetchShortVideos() {
  if (isLoading) return;
  isLoading = true;

  const query = "shorts para niños";
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&videoDuration=short&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  if (nextPageToken) url += `&pageToken=${nextPageToken}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    nextPageToken = data.nextPageToken || null;

    for (const item of data.items) {
      const videoId = item.id.videoId;
      if (!loadedVideos.has(videoId)) {
        loadedVideos.add(videoId);
        queueShort(videoId);
      }
    }
  } catch (err) {
    console.error("Error cargando shorts:", err);
  } finally {
    isLoading = false;
  }
}

function queueShort(videoId) {
  const container = document.createElement("div");
  container.className = "shorts-video";

  const iframeWrapper = document.createElement("div");
  iframeWrapper.id = `player-${videoId}`;
  iframeWrapper.className = "video-frame";

  const controls = document.createElement("div");
  controls.className = "video-controls";

  const playBtn = document.createElement("button");
  playBtn.className = "play-btn";
  playBtn.textContent = "⏸";

  const muteBtn = document.createElement("button");
  muteBtn.className = "mute-btn";
  muteBtn.textContent = "🔈";

  controls.appendChild(playBtn);
  controls.appendChild(muteBtn);
  container.appendChild(iframeWrapper);
  container.appendChild(controls);
  shortsContainer.appendChild(container);

  const entry = {
    container,
    player: null,
    init: () => {
      const player = new YT.Player(iframeWrapper.id, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1,
          loop: 1,
          playlist: videoId,
          playsinline: 1
        },
        events: {
          onReady: event => {
            entry.player = event.target;
            // Solo reproduce el primero visible con sonido
            if (players.length === 0) {
              event.target.unMute();
              event.target.playVideo();
            }
            setupControls(event.target, container, playBtn, muteBtn, controls);
          }
        }
      });
    }
  };

  players.push(entry);

  // Si la API ya está lista, inicializa el player de inmediato
  if (window.YT && window.YT.Player) {
    entry.init();
  }
}

function setupControls(player, container, playBtn, muteBtn, controls) {
  // Ocultar controles automáticamente
  setTimeout(() => hideControls(controls), 3000);

  container.addEventListener("click", () => {
    showControls(controls);
    setTimeout(() => hideControls(controls), 3000);
  });

  playBtn.addEventListener("click", () => {
    const isPaused = player.getPlayerState() !== 1;
    if (isPaused) {
      player.playVideo();
      playBtn.textContent = "⏸";
    } else {
      player.pauseVideo();
      playBtn.textContent = "▶️";
    }
  });

  muteBtn.addEventListener("click", () => {
    const isMuted = player.isMuted();
    if (isMuted) {
      player.unMute();
      muteBtn.textContent = "🔈";
    } else {
      player.mute();
      muteBtn.textContent = "🔇";
    }
  });
}

function hideControls(controls) {
  controls.style.opacity = "0";
  controls.style.pointerEvents = "none";
}

function showControls(controls) {
  controls.style.opacity = "1";
  controls.style.pointerEvents = "auto";
}

function handleScrollSnap() {
  if (!shortsContainer) return;

  const shorts = document.querySelectorAll(".shorts-video");
  const scrollTop = shortsContainer.scrollTop;
  const containerHeight = shortsContainer.clientHeight;

  let closest = null;
  let minDistance = Infinity;

  shorts.forEach(short => {
    const offset = short.offsetTop;
    const distance = Math.abs(offset - scrollTop);
    if (distance < minDistance) {
      closest = short;
      minDistance = distance;
    }
  });

  if (closest) {
    shortsContainer.scrollTo({
      top: closest.offsetTop,
      behavior: "smooth"
    });

    players.forEach(({ player, container }) => {
      if (!player) return;
      if (container === closest) {
        player.playVideo();
        player.unMute();
      } else {
        player.pauseVideo();
        player.mute();
      }
    });
  }

  // Scroll infinito
  if (shortsContainer.scrollHeight - scrollTop - containerHeight < 300) {
    fetchShortVideos();
  }
}

initShorts();