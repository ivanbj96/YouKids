const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const videoContainer = document.getElementById("video-container");
const otherVideosContainer = document.getElementById("other-videos-container");
const searchInput = document.getElementById("search-input");
const languageFilter = document.getElementById("language-filter");

let nextPageToken = null;
let currentPlayingVideo = null;

async function fetchVideos(query = "videos para niños", lang = "", pageToken = null) {
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    if (lang) url += "&relevanceLanguage=" + lang;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items.length) {
      otherVideosContainer.innerHTML = "<p>No se encontraron videos.</p>";
      return;
    }

    data.items.forEach(createVideoCard);
    nextPageToken = data.nextPageToken;
  } catch (err) {
    console.error(err);
    otherVideosContainer.innerHTML = `<p>Error al cargar videos: ${err.message}</p>`;
  }
}

function createVideoCard(item) {
  const videoId = item.id.videoId;
  const { title, thumbnails, channelTitle } = item.snippet;

  const card = document.createElement("div");
  card.className = "video-card";
  card.onclick = () => playVideo(videoId);

  card.innerHTML = `
    <img src="${thumbnails.medium.url}" alt="${title}" class="video-thumb" />
    <div class="video-info">
      <p class="video-title">${title}</p>
      <p class="video-channel">${channelTitle}</p>
    </div>
  `;

  otherVideosContainer.appendChild(card);
}

function playVideo(videoId) {
  videoContainer.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1"
      allow="autoplay; encrypted-media"
      allowfullscreen
    ></iframe>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

searchInput.addEventListener("input", () => {
  otherVideosContainer.innerHTML = "";
  fetchVideos(searchInput.value, languageFilter.value);
});

languageFilter.addEventListener("change", () => {
  otherVideosContainer.innerHTML = "";
  fetchVideos(searchInput.value, languageFilter.value);
});

window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (nearBottom && nextPageToken) {
    fetchVideos(searchInput.value, languageFilter.value, nextPageToken);
    nextPageToken = null;
  }
});

fetchVideos();