const apiKey = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const videoContainer = document.getElementById('videos');
let nextPageToken = '';
let filters = {
  regionCode: 'EC', // Por defecto Ecuador
  q: 'música cristiana para niños',
  blockedChannels: [],
};

async function fetchVideos() {
  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&videoEmbeddable=true&key=${apiKey}&q=${encodeURIComponent(filters.q)}&regionCode=${filters.regionCode}`;
  if (nextPageToken) url += `&pageToken=${nextPageToken}`;

  const res = await fetch(url);
  const data = await res.json();
  nextPageToken = data.nextPageToken || '';

  const videos = data.items.filter(
    item => !filters.blockedChannels.includes(item.snippet.channelId)
  );

  for (const video of videos) {
    const { videoId } = video.id;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&playsinline=1&rel=0`;
    iframe.className = 'w-full h-[calc(100vh-64px)] mb-4';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;

    videoContainer.appendChild(iframe);
  }
}

function showFilterModal() {
  document.getElementById('filterModal').classList.remove('hidden');
}

function hideFilterModal() {
  document.getElementById('filterModal').classList.add('hidden');
}

function applyFilters() {
  const region = document.getElementById('regionInput').value;
  const genre = document.getElementById('genreInput').value;
  const religion = document.getElementById('religionInput').value;
  const blocked = document.getElementById('blockInput').value.split(',');

  filters.regionCode = region;
  filters.q = `${genre} ${religion} para niños`;
  filters.blockedChannels = blocked.map(id => id.trim());

  videoContainer.innerHTML = '';
  nextPageToken = '';
  hideFilterModal();
  fetchVideos();
}

// Scroll infinito
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    fetchVideos();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  fetchVideos();
});