const videoContainer = document.getElementById('video-container');
const otherVideosContainer = document.getElementById('other-videos-container');
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu clave API
let nextPageToken = null;
let currentPlayingVideo = null;

async function fetchVideos(searchQuery = "", language = "", pageToken = null) {
    // ... (Este bloque permanece igual) ...
}

function createVideoElement(item) {
    const videoDiv = document.createElement('div');
    videoDiv.classList.add('video-card');
    videoDiv.dataset.videoId = item.id.videoId; // Agrega el videoId al dataset
    videoDiv.addEventListener("click", handleVideoPlay);

    // ... (Este bloque permanece igual) ...
}

function handleVideoPlay(event) {
    const videoCard = event.target.closest('.video-card');
    const videoId = videoCard.dataset.videoId;

    if (currentPlayingVideo) {
        currentPlayingVideo.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }

    currentPlayingVideo = createIframe(videoId);
    videoContainer.innerHTML = '';
    videoContainer.appendChild(currentPlayingVideo);
    videoContainer.classList.add('fixed', 'top-0', 'left-0', 'z-50', 'w-screen'); // Fija el video en la parte superior
    videoCard.classList.add('playing'); // Agregar clase para indicar que se está reproduciendo
}

function createIframe(videoId){
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1`; // autoplay agregado
    iframe.title = videoId;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.frameborder = "0";
    iframe.classList.add('w-screen', 'h-[400px]'); //Añadimos clases para el tamaño del video
    return iframe;
}

// ... (handleScroll permanece igual) ...

// ... (Eventos de escucha para searchInput y languageFilter permanecen iguales) ...

fetchVideos();