const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
let currentKeyword = "videos cristianos niños";
let blockedChannels = [];

document.addEventListener("DOMContentLoaded", () => {
  if (location.pathname.includes("shorts.html")) {
    loadShorts();
  } else {
    fetchVideos();
    setupInstallPrompt();
  }
});

function fetchVideos() {
  fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`)
    .then(res => res.json())
    .then(async data => {
      const container = document.getElementById("video-list");
      container.innerHTML = "";

      for (let item of data.items) {
        const { videoId } = item.id;
        const { title, thumbnails, channelTitle, channelId } = item.snippet;

        if (blockedChannels.some(b => channelTitle.toLowerCase().includes(b.trim().toLowerCase()))) continue;

        const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
        const channelData = await channelRes.json();
        const channelImg = channelData.items[0]?.snippet?.thumbnails?.default?.url || '';

        const videoCard = `
          <div class="video-card">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1" frameborder="0" allowfullscreen></iframe>
            <div class="video-info">
              <img src="${channelImg}" class="channel-img" />
              <div><strong>${title}</strong><br/><small>${channelTitle}</small></div>
            </div>
          </div>`;
        container.innerHTML += videoCard;
      }
    });
}

function openFilterModal() {
  document.getElementById("search-modal").classList.add("show");
  document.getElementById("search-input").value = currentKeyword;
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

function applyFilters() {
  const blocked = document.getElementById("blockedChannels").value;
  blockedChannels = blocked.split(",");
  fetchVideos();
}

function setupInstallPrompt() {
  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';

    installBtn.addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(outcome === 'accepted' ? 'Instalación aceptada' : 'Instalación rechazada');
      installBtn.style.display = 'none';
      deferredPrompt = null;
    });
  });
}

function loadShorts() {
  // Aquí implementas autoplay y scroll infinito de videos verticales estilo reels
  const container = document.getElementById("shorts-container");
  container.innerHTML = "<p>Shorts aún en desarrollo...</p>"; // Placeholder
}