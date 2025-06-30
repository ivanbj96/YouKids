const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const shortsContainer = document.getElementById("shorts-container");

let nextPageToken = null;
let isLoading = false;
let currentLang = "";
let loadedVideos = new Set();

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

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowfullscreen", "1");
  iframe.setAttribute("allow", "autoplay; encrypted-media");
  iframe.className = "video-frame";

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
  container.appendChild(iframe);
  container.appendChild(controls);
  shortsContainer.appendChild(container);

  let player;
  function onYouTubeIframeAPIReady() {
    player = new YT.Player(iframe, {
      events: {
        onReady: (event) => {
          setTimeout(() => hideControls(controls), 3000);

          container.addEventListener("click", () => {
            showControls(controls);
            setTimeout(() => hideControls(controls), 3000);
          });

          playBtn.addEventListener("click", () => {
            const isPaused = playBtn.textContent === "▶️";
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
  }

  if (shortsContainer.scrollHeight - scrollTop - containerHeight < 300) {
    fetchShortVideos();
  }
}

initShorts();