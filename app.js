/* ========= CONFIG ========= */
const apiKey = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI';
const maxResults = 10;

/* ========= ESTADO GLOBAL ========= */
let filters = {
  regionCode: '',
  genre: '',
  religion: '',
  blocked: []
};
let pageToken = '';

/* ========= FUNCIONES DE INICIO ========= */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('feed')) loadHome();
  if (document.getElementById('shorts')) loadShorts(true);

  // Modal
  document.getElementById('btnFilter')?.addEventListener('click', showModal);
});

/* ========= MODAL FILTROS ========= */
function showModal() {
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}
function applyFilters() {
  filters.regionCode = document.getElementById('region').value.trim();
  filters.genre      = document.getElementById('genre').value.trim();
  filters.religion   = document.getElementById('religion').value.trim();
  filters.blocked    = document.getElementById('blocked').value.split(',').map(x => x.trim()).filter(Boolean);
  closeModal();
  // Recargar Home
  document.getElementById('feed').innerHTML = '';
  pageToken = '';
  loadHome();
}

/* ========= HOME: MINIATURAS ========= */
async function loadHome() {
  const q = `${filters.genre || 'música'} ${filters.religion || ''} para niños`.trim();
  let url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(q)}`;
  if (filters.regionCode) url += `&regionCode=${filters.regionCode}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const res  = await fetch(url);
  const data = await res.json();
  pageToken  = data.nextPageToken || '';

  data.items.forEach(item => {
    if (filters.blocked.includes(item.snippet.channelId)) return;

    const thumb = item.snippet.thumbnails.high.url;
    const title = item.snippet.title;
    const channel = item.snippet.channelTitle;
    const vidId = item.id.videoId;

    document.getElementById('feed').insertAdjacentHTML('beforeend', `
      <div class="mb-6">
        <img src="${thumb}" class="w-full rounded-xl" />
        <div class="mt-2">
          <h3 class="text-sm font-semibold leading-5 line-clamp-2">${title}</h3>
          <p class="text-xs text-gray-400">${channel}</p>
        </div>
      </div>
    `);
  });
}

/* ========= SHORTS: VIDEO VERTICAL ========= */
let shortsToken = '';
let loadingShorts = false;
async function loadShorts(initial = false) {
  if (loadingShorts) return;
  loadingShorts = true;
  if (initial) shortsToken = '';

  const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=video&videoDuration=short&maxResults=5&q=shorts+niños+cristianos${shortsToken ? `&pageToken=${shortsToken}` : ''}`;
  const res  = await fetch(url);
  const data = await res.json();
  shortsToken = data.nextPageToken || '';

  data.items.forEach(item => {
    const vidId = item.id.videoId;
    document.getElementById('shorts').insertAdjacentHTML('beforeend', `
      <div class="relative">
        <iframe class="w-full h-full" src="https://www.youtube.com/embed/${vidId}?playsinline=1&autoplay=0&mute=0&controls=0&loop=1&rel=0" allowfullscreen></iframe>
      </div>
    `);
  });
  loadingShorts = false;
}

/* Scroll infinito en Shorts */
document.getElementById('shorts')?.addEventListener('scroll', e => {
  const el = e.target;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) loadShorts();
});