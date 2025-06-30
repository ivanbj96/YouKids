const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const shortsContainer = document.getElementById("shorts-container");

async function fetchShorts() {
  const randomQueries = ["juguetes", "cuentos", "aprender colores", "niños pequeños", "educativo infantil", "canciones infantiles"];
  const query = randomQueries[Math.floor(Math.random() * randomQueries.length)];

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=5&q=${encodeURIComponent(query)}&relevanceLanguage=es&safeSearch=strict&key=${API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.items) {
      data.items.forEach(item => {
        createShort(item.id.videoId);
      });
    }
  } catch (error) {
    console.error("Error al cargar shorts:", error);
  }
}

function createShort(videoId) {
  const short = document.createElement("div");
  short.className = "short-video";

  short.innerHTML = `
    <div class="video-wrapper">
      <iframe
        src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1"
        allow="autoplay; encrypted-media"
        allowfullscreen
        class="short-iframe"
      ></iframe>
      <div class="controls">
        <button class="short-btn playpause">⏸</button>
        <button class="short-btn mute">🔇</button>
      </div>
    </div>
  `;

  const iframe = short.querySelector("iframe");
  const playPauseBtn = short.querySelector(".playpause");
  const muteBtn = short.querySelector(".mute");

  let isPaused = false;
  let isMuted = true;

  // Controlador Play/Pause
  playPauseBtn.addEventListener("click", () => {
    const message = isPaused ? "playVideo" : "pauseVideo";
    iframe.contentWindow.postMessage(`{"event":"command","func":"${message}","args":""}`, "*");
    playPauseBtn.textContent = isPaused ? "⏸" : "▶️";
    isPaused = !isPaused;
  });

  // Controlador Mute/Unmute
  muteBtn.addEventListener("click", () => {
    const message = isMuted ? "unMute" : "mute";
    iframe.contentWindow.postMessage(`{"event":"command","func":"${message}","args":""}`, "*");
    muteBtn.textContent = isMuted ? "🔊" : "🔇";
    isMuted = !isMuted;
  });

  shortsContainer.appendChild(short);
}

fetchShorts();