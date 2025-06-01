
const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const MAX_RESULTS = 10;
const QUERY = 'videos cristianos para niños';
const API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&type=video&videoEmbeddable=true&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(QUERY)}&relevanceLanguage=es`;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('video-list');
  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      container.innerHTML = '';
      data.items.forEach(item => {
        const videoId = item.id.videoId;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`;
        iframe.setAttribute('allowfullscreen', '');
        iframe.className = 'video';
        container.appendChild(iframe);
      });
    })
    .catch(err => {
      container.innerHTML = `<p>Error al cargar videos. Verifica tu conexión o clave API.</p>`;
      console.error("Error al cargar videos:", err);
    });
});