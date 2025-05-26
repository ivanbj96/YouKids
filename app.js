const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
let currentKeyword = "videos cristianos niños";
let filters = {
  region: "",
  videoGenre: "",
  musicGenre: "",
  religion: "",
  blockedChannels: []
};

async function fetchVideos() {
  const query = `${currentKeyword} ${filters.videoGenre} ${filters.musicGenre} ${filters.religion}`;
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`);
  const data = await res.json();

  const container = document.getElementById("video-list");
  container.innerHTML = "";

  for (let item of data.items) {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumbnail = item.snippet.thumbnails.high.url;
    const channelTitle = item.snippet.channelTitle;
    const channelId = item.snippet.channelId;

    if (filters.blockedChannels.includes(channelTitle)) continue;

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

document.addEventListener("DOMContentLoaded", () => {
  fetchVideos();

  const searchModal = document.getElementById("searchModal");
  const filterModal = document.getElementById("filterModal");

  document.getElementById("searchBtn").onclick = () => {
    searchModal.style.display = "block";
  };

  document.getElementById("filterBtn").onclick = () => {
    filterModal.style.display = "block";
  };

  document.getElementById("closeSearch").onclick = () => {
    searchModal.style.display = "none";
  };

  document.getElementById("closeFilter").onclick = () => {
    filterModal.style.display = "none";
  };

  window.onclick = function(event) {
    if (event.target == searchModal) {
      searchModal.style.display = "none";
    }
    if (event.target == filterModal) {
      filterModal.style.display = "none";
    }
  };

  document.getElementById("searchSubmit").onclick = () => {
    const input = document.getElementById("searchInput").value.trim();
    if (input) {
      currentKeyword = input;
      fetchVideos();
      searchModal.style.display = "none";
    }
  };

  document.getElementById("applyFilters").onclick = () => {
    filters.region = document.getElementById("regionFilter").value;
    filters.videoGenre = document13