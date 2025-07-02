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
  // Esperamos a que el API esté listo para crear reproductores
  players.forEach(entry => {
    if (!entry.ready) {
      entry.create();
      entry.ready = true;
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

  if (shortsContainer) {
    shortsContainer.appendChild(container);
  } else {
    console.error("shortsContainer es null");
    return;
  }

  // Configurar reproductor cuando API esté lista
  const playerEntry = {
    ready: false,
    create: () => {
      const player = new YT.Player(iframeWrapper.id, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1,
          loop: 1,
          playlist: videoId,
          playsinline: 1,
        },
        events: {
          onReady: event => {
            players.push({ player, container });

            // Solo el primero se reproduce con sonido
            if (players.length === 1) {
              event.target.unMute();
              event.target.playVideo();
            } else {
              event.target.mute();
            }

            // Botones
            setTimeout(() => hideControls(controls), 3000);

            container.addEventListener("click", () => {
              showControls(controls);
              setTimeout(() => hideControls(controls), 3000);
            });

            playBtn.addEventListener("click", () => {
              const isPaused = event.target.getPlayerState() !== 1;
              if (isPaused) {
                event.target.playVideo();
                playBtn.textContent = "⏸";
              } else {
                event.target.pauseVideo();
                playBtn.textContent = "▶️";
              }
            });

            muteBtn.addEventListener("click", () => {
              const isMuted = event.target.isMuted();
              if (isMuted) {
                event.target.unMute();
                muteBtn.textContent = "🔈";
              } else {
                event.target.mute();
                muteBtn.textContent = "🔇";
              }
            });
          }
        }
      });
    }
  };

  players.push(playerEntry);

  // Si API ya está lista, crea de inmediato
  if (window.YT && window.YT.Player) {
    playerEntry.create();
    playerEntry.ready = true;
  }
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

  if (shortsContainer.scrollHeight - scrollTop - containerHeight < 300) {
    fetchShortVideos();
  }
}

initShorts();