// shorts.js (versión corregida y mejorada)

const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Sustituye por tu clave real const container = document.getElementById("shorts-container"); let nextPageToken = null;

async function fetchShorts() { const query = "shorts para niños"; let url = https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}; if (nextPageToken) url += &pageToken=${nextPageToken};

try { const res = await fetch(url); const data = await res.json(); nextPageToken = data.nextPageToken || null;

data.items?.forEach(item => {
  const id = item.id.videoId;
  createShortCard(id);
});

} catch (error) { console.error("Error al cargar shorts:", error); } }

function createShortCard(videoId) { const wrapper = document.createElement("div"); wrapper.className = "short-video";

wrapper.innerHTML = <div class="short-frame-wrapper"> <iframe class="short-frame" src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&showinfo=0&modestbranding=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen ></iframe> <div class="controls-overlay"> <button class="btn-control btn-play">▶️</button> <button class="btn-control btn-mute">🔈</button> </div> </div>;

container.appendChild(wrapper); initPlayer(wrapper, videoId); }

function initPlayer(wrapper, videoId) { const iframe = wrapper.querySelector("iframe"); const overlay = wrapper.querySelector(".controls-overlay"); const playBtn = overlay.querySelector(".btn-play"); const muteBtn = overlay.querySelector(".btn-mute");

let player;

const showControls = () => { overlay.classList.add("visible"); clearTimeout(overlay._hideTimeout); overlay._hideTimeout = setTimeout(() => overlay.classList.remove("visible"), 3000); };

wrapper.addEventListener("click", showControls);

const onYouTubeIframeAPIReady = () => { player = new YT.Player(iframe, { events: { onReady: (event) => { player.mute(); player.playVideo(); } } }); };

if (typeof YT === "undefined" || typeof YT.Player === "undefined") { const tag = document.createElement("script"); tag.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(tag); window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady; } else { onYouTubeIframeAPIReady(); }

playBtn.addEventListener("click", (e) => { e.stopPropagation(); if (!player) return; const state = player.getPlayerState(); if (state === YT.PlayerState.PLAYING) { player.pauseVideo(); playBtn.textContent = "▶️"; } else { player.playVideo(); playBtn.textContent = "⏸️"; } });

muteBtn.addEventListener("click", (e) => { e.stopPropagation(); if (!player) return; if (player.isMuted()) { player.unMute(); muteBtn.textContent = "🔊"; } else { player.mute(); muteBtn.textContent = "🔈"; } }); }

function setupInfiniteScroll() { window.addEventListener("scroll", () => { const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300; if (nearBottom) { fetchShorts(); } }); }

function setupSnapScroll() { document.documentElement.style.scrollSnapType = "y mandatory"; container.querySelectorAll(".short-video").forEach(video => { video.style.scrollSnapAlign = "start"; }); }

window.addEventListener("load", () => { fetchShorts(); setupInfiniteScroll(); setupSnapScroll(); });

