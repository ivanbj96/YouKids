const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const query = "música cristiana para niños";
const maxResults = 6;

async function loadVideos() {
  const response = await fetch(
    \`https://www.googleapis.com/youtube/v3/search?key=\${API_KEY}&part=snippet&q=\${encodeURIComponent(query)}&type=video&maxResults=\${maxResults}\`
  );
  const data = await response.json();
  const container = document.getElementById("videos") || document.getElementById("shorts");
  container.innerHTML = "";
  data.items.forEach((item) => {
    const iframe = document.createElement("iframe");
    iframe.src = \`https://www.youtube.com/embed/\${item.id.videoId}\`;
    iframe.className = "w-full aspect-video mb-4 rounded-xl";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    container.appendChild(iframe);
  });
}
loadVideos();
