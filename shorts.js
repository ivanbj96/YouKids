const shortsContainer = document.getElementById("shorts-container");

async function loadShorts() {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=shorts+para+niños&key=${API_KEY}`
  );
  const data = await response.json();

  const videos = shuffleArray(data.items);
  shortsContainer.innerHTML = "";

  videos.forEach(video => {
    const videoId = video.id.videoId;
    const wrapper = document.createElement("div");
    wrapper.className = "short-wrapper";

    wrapper.innerHTML = `
      <video class="short-video" playsinline muted>
        <source src="https://www.youtube.com/embed/${videoId}" type="video/mp4" />
        Tu navegador no soporta video.
      </video>
      <div class="controls">
        <button class="play-toggle">⏯</button>
        <button class="mute-toggle">🔇</button>
      </div>
    `;

    const videoElement = wrapper.querySelector("video");
    const playBtn = wrapper.querySelector(".play-toggle");
    const muteBtn = wrapper.querySelector(".mute-toggle");

    playBtn.addEventListener("click", () => {
      videoElement.paused ? videoElement.play() : videoElement.pause();
    });

    muteBtn.addEventListener("click", () => {
      videoElement.muted = !videoElement.muted;
      muteBtn.textContent = videoElement.muted ? "🔇" : "🔊";
    });

    shortsContainer.appendChild(wrapper);
  });
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

loadShorts();