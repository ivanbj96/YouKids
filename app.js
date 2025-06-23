const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu propia API Key de YouTube
let currentKeyword = "videos cristianos niños";

async function fetchVideos() {
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=100&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();

    const container = document.getElementById("video-list");
    container.innerHTML = "";

    for (let item of data.items) {
      const videoId = item.id.videoId;
      const title = item.snippet.title;
      const thumbnail = item.snippet.thumbnails.high.url;
      const channelTitle = item.snippet.channelTitle;
      const channelId = item.snippet.channelId;

      try {
        const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
        if (!channelRes.ok) {
          throw new Error(`HTTP error! status: ${channelRes.status}`);
        }
        const channelData = await channelRes.json();
        const channelImg = channelData.items[0]?.snippet?.thumbnails?.default?.url || '';

        const videoCardHTML = `
          <div class="video-card">
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1" frameborder="0" allowfullscreen></iframe>
            <div class="video-info">
              <img src="${channelImg}" class="channel-img" alt="${channelTitle}"/>
              <div>
                <strong>${title}</strong><br/>
                <small>${channelTitle}</small>
              </div>
            </div>
          </div>
        `;
        container.innerHTML += videoCardHTML;
      } catch (error) {
        console.error("Error fetching channel data:", error);
      }
    }
  } catch (error) {
    console.error("Error fetching videos:", error);
  }
}

function openFilterModal() {
  document.getElementById("search-modal").classList.add("show");
  document.getElementById("search-input").value = currentKeyword;
  document.getElementById("search-input").focus();
}

function applySearch() {
  const input = document.getElementById("search-input").value.trim();
  if (input !== "") {
    currentKeyword = input;
    fetchVideos();
  }
  closeModal();
}

function closeModal() {
  document.getElementById("search-modal").classList.remove("show");
}

document.addEventListener("DOMContentLoaded", fetchVideos);

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('Instalación aceptada');
  } else {
    console.log('Instalación rechazada');
  }
  installBtn.style.display = 'none';
  deferredPrompt = null;
});
