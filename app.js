const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const main = document.getElementById("main-content");

const endpoints = {
  home: "https://www.googleapis.com/youtube/v3/search?part=snippet&q=videos+cristianos+niños&type=video&maxResults=10&key=" + apiKey,
  shorts: (pageToken = "") =>
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=shorts+cristianos+niños&type=video&videoDuration=short&maxResults=5&pageToken=${pageToken}&key=${apiKey}`,
};

let nextPageToken = "";

async function fetchVideos(url, append = false) {
  const res = await fetch(url);
  const data = await res.json();
  const videos = data.items || [];
  if (!append) main.innerHTML = "";

  for (const video of videos) {
    const id = video.id.videoId;
    const title = video.snippet.title;
    const thumb = video.snippet.thumbnails.high.url;

    const card = document.createElement("div");
    card.className = "short-video";
    card.innerHTML = `
      <iframe src="https://www.youtube.com/embed/${id}?rel=0&playsinline=1&autoplay=0&mute=1&enablejsapi=1" 
              frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen loading="lazy">
      </iframe>
      <p>${title}</p>
    `;
    main.appendChild(card);
  }

  nextPageToken = data.nextPageToken || "";
}

function loadHome() {
  fetchVideos(endpoints.home);
}

function loadShorts(initial = false) {
  if (initial) nextPageToken = "";
  fetchVideos(endpoints.shorts(nextPageToken), initial ? false : true);
}

// Navegación
document.getElementById("btn-home").addEventListener("click", loadHome);
document.getElementById("btn-shorts").addEventListener("click", () => {
  main.innerHTML = "";
  main.className = "shorts-mode";
  loadShorts(true);
});
document.getElementById("btn-profile").addEventListener("click", () => {
  main.innerHTML = "<h2>Próximamente: Perfil de usuario</h2>";
  main.className = "";
});

// Scroll infinito en shorts
main.addEventListener("scroll", () => {
  if (main.className === "shorts-mode" && main.scrollTop + main.clientHeight >= main.scrollHeight - 10) {
    loadShorts();
  }
});

// Cargar al inicio
loadHome();