const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const shortsContainer = document.getElementById("shorts-container");

let nextPageToken = null;
let isLoading = false;
let currentLang = "";
let loadedVideos = new Set();
let players = [];

function initShorts() {
  fetchShortVideos();
  shortsContainer.addEventListener("scroll", handleScrollSnap);
}

async function fetchShortVideos() {
  if (isLoading) return;
  isLoading = true;

  let query = "shorts para niños";
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&videoDuration=short&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  if (nextPageToken) url += `&pageToken=${nextPageToken}`;
  if (currentLang) url += `&relevanceLanguage=${currentLang}`;

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

  const iframe = document.createElement("div");
  iframe.id = `player-${videoId}`;
  iframe.className = "video-frame";

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
  container.appendChild(iframe);
  container.appendChild(controls);
  shortsContainer.appendChild(container);

  function onPlayerReady(event) {
    players.push({ player: event.target, container });

    // Si es el primero, lo dejamos sonar, los demás en mute
    if (players.length === 1) {
      event.target.playVideo();
      event.target.unMute();
    } else {
      event.target.mute();
    }

    // Controles
    setTimeout(() => hideControls(controls), 3000);
    container.addEventListener("click", () => {
      showControls(controls);
      setTimeout(() => hideControls(controls), 3000);
    });

    playBtn.addEventListener("click", () => {
      const isPaused = playBtn.textContent === "▶️";
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

  function onYouTubeIframeAPIReady() {
    new YT.Player(iframe.id, {
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
        onReady: onPlayerReady
      }
    });
  }

  if (!window.YT) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  } else {
    onYouTubeIframeAPIReady();
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

    // Controlar cuál video se reproduce con sonido
    players.forEach(({ player, container }) => {
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