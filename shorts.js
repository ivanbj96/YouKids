const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const MAX_RESULTS = 10;
const QUERY = 'shorts cristianos para niños';
const API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&type=video&videoEmbeddable=true&videoDuration=short&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(QUERY)}&relevanceLanguage=es`;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('shorts-container');
  const loading = document.getElementById('loading');

  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      loading.remove();
      data.items.forEach(item => {
        const videoId = item.id.videoId;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&controls=1&modestbranding=1&rel=0`;
        iframe.setAttribute('allowfullscreen', '');
        iframe.className = 'short-video';
        container.appendChild(iframe);
      });
    })
    .catch(err => {
      loading.textContent = 'Error al cargar los Shorts 😔';
      console.error('Error:', err);
    });
});