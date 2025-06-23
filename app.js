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
    const card = document.createElement('div