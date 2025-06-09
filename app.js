const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu clave API
let currentKeyword = "videos cristianos niños";

async function fetchVideos() {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`);
  try {
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      displayVideos(data.items);
    } else {
      alert('No se encontraron videos. Intenta con otras palabras clave.');
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
    alert('Ocurrió un error al obtener los videos. Por favor, intenta de nuevo más tarde.');
  }
}

function displayVideos(items) {
  const container = document.getElementById("video-list");
  container.innerHTML = ''; // Limpiar contenido anterior

  items.forEach(item => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumbnail = item.snippet.thumbnails.high.url;
    const channelTitle = item.snippet.channelTitle;

    const videoCard = document.createElement('div');
    videoCard.classList.add('video-card');
    videoCard.innerHTML = `
      <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1" frameborder="0" allowfullscreen></iframe>
      <div class="video-info">
        <img src="${item.snippet.thumbnails.default.url}" class="channel-img" />
        <div>
          <strong>${title}</strong><br/>
          <small>${channelTitle}</small>
        </div>
      </div>
    `;
    container.appendChild(videoCard);
  });
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
