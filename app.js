const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
let currentKeyword = "videos cristianos niños";
let filters = {
  language: "",
  genres: [],
  blockedChannels: []
};

function openSearchModal() {
  const newKeyword = prompt("¿Qué quieres buscar? (ej: alabanzas, historias bíblicas, etc)", currentKeyword);
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
  container.innerHTML = "";

  for (let item of data.items) {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const description = item.snippet.description.toLowerCase();
    const thumbnail = item.snippet.thumbnails.high.url;
    const channelTitle = item.snippet.channelTitle;
    const channelId = item.snippet.channelId;

    if (filters.language && !description.includes(filters.language.toLowerCase())) continue;
    if (filters.genres.length > 0 && !filters.genres.some(genre => description.includes(genre))) continue;
    if (filters.blockedChannels.includes(channelId)) continue;

    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();
    const channelImg = channelData.items[0]?.snippet?.thumbnails?.default?.url || '';

    const videoCard = `
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
    container.innerHTML += videoCard;
  }
}

document.addEventListener("DOMContentLoaded", fetchVideos);