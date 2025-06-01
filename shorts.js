const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const MAX_RESULTS = 10;
const QUERY = 'shorts cristianos para niños';
let nextPageToken = '';
let isLoading = false;

function fetchShorts() {
  if (isLoading) return;
  isLoading = true;

  const API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&type=video&videoEmbeddable=true&videoDuration=short&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(QUERY)}&relevanceLanguage=es&pageToken=${nextPageToken}`;

  fetch(API_URL)
    .then(res => res.json())
    .then(data => {
      nextPageToken = data.nextPageToken || '';
      const container = document.getElementById('shorts-container');
      data.items.forEach(item => {
        const videoId = item.id.videoId;
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'short-video-wrapper';

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1`;
        iframe.setAttribute('allowfullscreen', '');
        iframe.className = 'short-video';

        const controls = document.createElement('div');
        controls.className = 'video-controls';

        const playPauseBtn = document.createElement('button');
        playPauseBtn.className = 'play-pause';
        playPauseBtn.innerText = '⏸️';
        playPauseBtn.onclick = () => {
          const player = iframe.contentWindow;
          player.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        };

        const muteBtn = document.createElement('button');
        muteBtn.className = 'mute';
        muteBtn.innerText = '🔇';
        muteBtn.onclick = () => {
          const player = iframe.contentWindow;
          player.postMessage('{"event":"command","func":"mute","args":""}', '*');
        };

        controls.appendChild(playPauseBtn);
        controls.appendChild(muteBtn);

        videoWrapper.appendChild(iframe);
        videoWrapper.appendChild(controls);
        container.appendChild(videoWrapper);
      });
      isLoading = false;
    })
    .catch(err => {
      console.error('Error al cargar Shorts:', err);
      isLoading = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchShorts();
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      fetchShorts();
    }
  });
});