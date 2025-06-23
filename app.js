// Reemplaza con tu clave API de YouTube
const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

let player;

window.onload = () => {
  searchVideos('educativo cristiano niños');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.error('Error al registrar Service Worker:', err));
  }
};

async function searchVideos(query = '') {
  try {
    const response = await fetch(`${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=24&safeSearch=strict&key=${API_KEY}`);
    const data = await response.json();
    if (data.items) {
      displayVideos(data.items);
    } else {
      document.getElementById('videos-container').innerHTML = '<p>No se encontraron videos.</p>';
    }
  } catch (error) {
    console.error('Error al buscar videos:', error);
    document.getElementById('videos-container').innerHTML = '<p>Error al cargar videos. Intenta de nuevo.</p>';
  }
}

function displayVideos(videos) {
  const container = document.getElementById('videos-container');
  container.innerHTML = '';
  videos.forEach(video => {
    const videoId = video.id.videoId;
    const title = video.snippet.title;
    const thumbnail = video.snippet.thumbnails.high.url;
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
        enablejsapi: 1,
        iv_load_policy: 3 // Desactiva anotaciones
      },
      events: {
        onReady: (event) => event.target.playVideo()
      }
    });
  }
  window.scrollTo(0, playerSection.offsetTop);
}

function closePlayer() {
  document.getElementById('player-section').style.display = 'none';
  if (player) {
    player.stopVideo();
  }
}

document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value;
    searchVideos(query ? `${query} educativo cristiano niños` : 'educativo cristiano niños');
  }
});

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}