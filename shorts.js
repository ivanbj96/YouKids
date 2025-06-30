const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const shortsContainer = document.getElementById("shorts-container");

let nextPageToken = null;
let isLoading = false;
let loadedVideos = new Set();
let youtubeAPIReady = false;

// Palabras clave aleatorias para variar los resultados
const queries = [
  "videos cristianos para niños"
  "canciones cristianas para niños"
  "educación preescolar",
  "videos educativos para niños",
  "shorts de canciones infantiles",
  "juegos para niños",
  "videos para bebés"
];

function getRandomQuery() {
  const index = Math.floor(Math.random() * queries.length);
  return queries[index];
}

function initShorts() {
  loadYouTubeIframeAPI();
  shortsContainer.addEventListener("scroll", handleScrollSnap);
}

function loadYouTubeIframeAPI() {
  if (!window.YT) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      youtubeAPIReady = true;
      fetchShortVideos(); // inicia después de que esté lista la API
    };
  } else {
    youtubeAPIReady = true;
    fetchShortVideos();
  }
}

async function fetchShortVideos() {
  if (isLoading || !youtubeAPIReady) return;
  isLoading = true;

  const query = getRandomQuery(); // keyword aleatoria
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&videoDuration=short&q=${encodeURIComponent(query)}&key=${API_KEY}&relevanceLanguage=es`;

  if (nextPageToken) url += `&pageToken=${nextPageToken}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    nextPageToken = data.nextPageToken || null;

    for (const item of data.items) {
      const videoId = item.id.videoId;
      if (!loadedVideos.has(videoId)) {
        loadedVideos.add(videoId);
        createShort(videoId);
      }
    }
  } catch (err) {
    console.error("Error cargando shorts:", err);
  } finally {
    isLoading = false;
  }
}

function createShort(videoId) {
  const container = document.createElement("div");
  container.className = "shorts-video";

  const iframeDiv = document.createElement("div");
  iframeDiv.id = `ytplayer-${videoId}`;
  iframeDiv.className = "video-frame";

  const controls = document.createElement("div");
  controls.className = "video-controls";

  const playBtn = document.createElement("button");
  playBtn.className = "play-btn";
  playBtn.textContent = "⏸";

  const muteBtn = document.createElement("button");
  muteBtn.className = "mute-btn";
  muteBtn.textContent = "🔇";

  controls.appendChild(playBtn);
  controls.appendChild(muteBtn);
  container.appendChild(iframeDiv);
  container.appendChild(controls);
  shortsContainer.appendChild(container);

  let player;
  const onPlayerReady = (event) => {
    player = event.target;
    player.playVideo();

    container.addEventListener("click", () => {
      showControls(controls);
      setTimeout(() => hideControls(controls), 3000);
    });

    playBtn.addEventListener("click", () => {
      const state = player.getPlayerState();
      if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
        player.playVideo();
        playBtn.textContent = "⏸";
      } else {
        player.pauseVideo();
        playBtn.textContent = "▶️";
      }
    });

    muteBtn.addEventListener("click", () => {
      if (player.isMuted()) {
        player.unMute();
        muteBtn.textContent = "🔈";
      } else {
        player.mute();
        muteBtn.textContent = "🔇";
      }
    });

    setTimeout(() => hideControls(controls), 3000);
  };

  new YT.Player(`ytplayer-${videoId}`, {
    height: "100%",
    width: "100%",
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      mute: 1,
      playsinline: 1,
      controls: 0,
      loop: 1,
      playlist: videoId,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onPlayerReady
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
  }

  if (shortsContainer.scrollHeight - scrollTop - containerHeight < 300) {
    fetchShortVideos();
  }
}

initShorts();