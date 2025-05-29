const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
let currentKeyword = "videos cristianos niños";
let filters = {
  language: "",
  genres: [],
  blockedChannels: []
};

function openSearchModal() {
  const newKeyword = prompt("¿Qué quieres buscar?", currentKeyword);
  if (newKeyword) {
    currentKeyword = newKeyword;
    fetchVideos();
  }
}

function openFilterModal() {
  document.getElementById("filterModal").style.display = "flex";
  document.getElementById("langFilter").value = filters.language;
  document.getElementById("genreFilter").value = filters.genres.join(", ");
  document.getElementById("blockedChannels").value = filters.blockedChannels.join(", ");
}

function saveFilters() {
  filters.language = document.getElementById("langFilter").value.trim();
  filters.genres = document.getElementById("genreFilter").value.split(",").map(x => x.trim().toLowerCase());
  filters.blockedChannels = document.getElementById("blockedChannels").value.split(",").map(x => x.trim());
  document.getElementById("filterModal").style.display = "none";
  fetchVideos();
}

async function fetchVideos() {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`);
  const data = await res.json();
  const container = document.getElementById("video-list");
  if (!container) return;
  container.innerHTML = "";

  for (let item of data.items) {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const description = item.snippet.description.toLowerCase();
    const thumbnail = item.snippet.thumbnails.high.url;
    const channelId = item.snippet.channelId;
    const channelTitle = item.snippet.channelTitle;

    if (filters.language && !description.includes(filters.language.toLowerCase())) continue;
    if (filters.genres.length > 0 && !filters.genres.some(g => description.includes(g))) continue;
    if (filters.blockedChannels.includes(channelId)) continue;

    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();
    const channelImg = channelData.items[0]?.snippet?.thumbnails?.default?.url || '';

    container.innerHTML += `
      <div class="video-card">
        <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1" frameborder="0" allowfullscreen></iframe>
        <div class="video-info">
          <img src="${channelImg}" class="channel-img" />
          <div>
            <strong>${title}</strong><br/>
            <small>${channelTitle}</small>
          </div>
        </div>
      </div>
    `;
  }
}

async function fetchShorts() {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=shorts cristianos niños&type=video&videoDuration=short&key=${apiKey}`);
  const data = await res.json();
  const container = document.getElementById("shorts-container");
  if (!container) return;
  container.innerHTML = "";

  for (let item of data.items) {
    const videoId = item.id.videoId;
    const description = item.snippet.description.toLowerCase();
    const channelId = item.snippet.channelId;

    if (filters.language && !description.includes(filters.language.toLowerCase())) continue;
    if (filters.genres.length > 0 && !filters.genres.some(g => description.includes(g))) continue;
    if (filters.blockedChannels.includes(channelId)) continue;

    const video = document.createElement("div");
    video.className = "short-video";
    video.innerHTML = `
      <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&playsinline=1" frameborder="0" allowfullscreen></iframe>
    `;
    container.appendChild(video);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("video-list")) {
    fetchVideos();
  }
  if (document.getElementById("shorts-container")) {
    fetchShorts();
  }
});