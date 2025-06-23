// Reemplaza con tu clave API de YouTube
const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

let player;
let nextPageToken = '';
let currentQuery = 'educativo cristiano niños';
let isLoading = false;
let isShortsMode = false;

window.onload = () => {
  searchVideos();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.error('Error al registrar Service Worker:', err));
  }
  // Configura el scroll infinito
  window.addEventListener('scroll', handleScroll);
};

function handleScroll() {
  if (isLoading) return;
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    loadMoreVideos();
  }
}

async function searchVideos(query = currentQuery, append = false) {
  isShortsMode = false;
  currentQuery = query;
  nextPageToken = '';
  isLoading = true;
  document.getElementById('loading').style.display = 'block';
  try {
    const response = await fetch(`${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=24&safeSearch=strict&key=${API_KEY}`);
    const data = await response.json();
    nextPageToken = data.nextPageToken || '';
    if (data.items) {
      displayVideos(data.items, append);
    } else {
      document.getElementById('videos-container').innerHTML = '<p>No se encontraron videos.</p>';
    }
  } catch (error) {
    console.error('Error al buscar videos:', error);
    document.getElementById('videos-container').innerHTML = '<p>Error al cargar videos.</p>';
  } finally {
    isLoading = false;
    document.getElementById('loading').style.display = 'none';
  }
}

async function searchShorts() {
  isShortsMode = true;
  currentQuery = 'shorts educativos niños';
  nextPageToken = '';
  isLoading = true;
  document.getElementById('loading').style.display = 'block';
  try {
    const response = await fetch(`${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(currentQuery)}&type=video&videoDuration=short&maxResults=24&safeSearch=strict&key=${API_KEY}`);
    const data = await response.json();
    nextPageToken = data.nextPageToken || '';
    if (data.items) {
      displayVideos(data.items, false);
    } else {
      document.getElementById('videos-container').innerHTML = '<p>No se encontraron Shorts.</p>';
    }
  } catch (error) {
    console.error('Error al buscar Shorts:', error);
    document.getElementById('videos-container').innerHTML = '<p>Error al cargar Shorts.</p>';
  } finally {
    isLoading = false;
    document.getElementById('loading').style.display = 'none';
  }
}

async function loadMoreVideos() {
  if (!nextPageToken || isLoading) return;
  isLoading = true;
  document.getElementById('loading').style.display = 'block';
  try {
    const url = `${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(currentQuery)}&type=video&maxResults=24&safeSearch=strict&key=${API_KEY}&pageToken=${nextPageToken}${isShortsMode ? '&videoDuration=short' : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    nextPageToken = data.nextPageToken || '';
    if (data.items) {
      displayVideos(data.items, true);
    }
  } catch (error) {
    console.error('Error al cargar más videos:', error);
  } finally {
    isLoading = false;
    document.getElementById('loading').style.display = 'none';
  }
}

function displayVideos(videos, append = false) {
  const container = document.getElementById('videos-container');
  if (!append) container.innerHTML = '';
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
        iv_load_policy: 3
      },
      events: {
        onReady: (event) => event.target.playVideo()
      }
    });
  }
  window.scrollTo(0, 0);
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