const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const maxResults = 10;
let filters = {
  country: "",
  genre: "",
  religion: "",
  blockedChannels: []
};

const modalFiltros = document.getElementById("modalFiltros");
const btnFiltro = document.getElementById("btnFiltro");
const btnCerrarFiltros = document.getElementById("btnCerrarFiltros");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");

btnFiltro.onclick = () => {
  modalFiltros.classList.remove("hidden");
};
btnCerrarFiltros.onclick = () => {
  modalFiltros.classList.add("hidden");
};
btnAplicarFiltros.onclick = () => {
  filters.country = document.getElementById("filterCountry").value;
  filters.genre = document.getElementById("filterGenre").value;
  filters.religion = document.getElementById("filterReligion").value;
  filters.blockedChannels = document.getElementById("blockedChannels").value.split(",").map(s => s.trim()).filter(Boolean);
  modalFiltros.classList.add("hidden");
  loadVideos();
};

async function loadVideos(pageToken = "") {
  let q = "música para niños"; // Base search term
  
  if (filters.genre) {
    q += ` ${filters.genre}`;
  }
  if (filters.religion) {
    q += ` ${filters.religion}`;
  }
  if (filters.country) {
    q += ` ${filters.country}`;
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", maxResults);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url);
    const data = await response.json();

    const container = document.getElementById("videos");
    container.innerHTML = "";

    if (data.items) {
      data.items.forEach(item => {
        // Filtrar canales bloqueados
        if (filters.blockedChannels.includes(item.snippet.channelId)) return;

        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channel = item.snippet.channelTitle;
        const thumbnail = item.snippet.thumbnails.medium.url;

        const videoEl = document.createElement("div");
        videoEl.className = "video-item flex p-2 rounded hover:bg-gray-100 cursor-pointer";
        videoEl.innerHTML = `
          <img src="${thumbnail}" alt="${title}" class="w-40 h-24 object-cover rounded" />
          <div class="ml-3 flex flex-col justify-center">
            <h3 class="text-sm font-semibold">${title}</h3>
            <p class="text-xs text-gray-500">${channel}</p>
          </div>
        `;

        videoEl.onclick = () => {
          // Abrir modal o página con video embebido
          window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
        };

        container.appendChild(videoEl);
      });
    } else {
      container.innerHTML = `<p class="text-red-500">No se encontraron videos.</p>`;
    }
  } catch (err) {
    console.error(err);
    document.getElementById("videos").innerHTML = `<p class="text-red-500">Error al cargar videos.</p>`;
  }
}

loadVideos();
