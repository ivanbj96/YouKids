// Reemplaza con tu clave API de YouTube
const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// Variable para el reproductor de YouTube
let player;

// Carga inicial de videos
window.onload = () => {
  searchVideos('educativo cristiano niños');
  // Registra el Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.error('Error al registrar Service Worker:', err));
  }
};

// Función para buscar videos
async function searchVideos(query = '') {
  try {
    const response = await fetch(`${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&safeSearch=strict&key=${API_KEY}`);
    const data = await response.json();
    if (data.items) {
      displayVideos(data.items);
    } else {
      alert('No se encontraron videos.');
    }
  } catch (error) {
    console.error('Error al buscar videos:', error);
    alert('Error al cargar videos. Intenta de nuevo.');
  }
}

// Muestra los videos en la interfaz
function displayVideos(videos) {
  const container = document.getElementById('videos-container');
  container.innerHTML = '';
  videos.forEach(video => {
    const videoId = video.id.videoId;
    const title = video.snippet.title;
    const thumbnail = video.snippet.thumbnails.medium.url;
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <img src="${thumbnail}" alt="${title}">
      <h3>${title}</h3>
    `;
    card.onclick = () => playVideo(videoId);
    container.appendChild(card);
  });
}

// Reproduce un video
function playVideo(videoId) {
  const playerSection = document.getElementById('player-section');
  playerSection.style.display = 'block';
  if (player) {
    player.loadVideoById(videoId);
  } else {
    player = new YT.Player('player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 1,
        enablejsapi: 1
      },
      events: {
        onReady: (event) => event.target.playVideo()
      }
    });
  }
  window.scrollTo(0, playerSection.offsetTop);
}

// Cierra el reproductor
function closePlayer() {
  document.getElementById('player-section').style.display = 'none';
  if (player) {
    player.stopVideo();
  }
}

// Maneja la búsqueda
document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value;
    if (query) {
      searchVideos(`${query} educativo cristiano niños`);
    }
  }
});

// Alternar barra lateral en móviles
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}