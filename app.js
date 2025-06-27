const videoContainer = document.getElementById('video-container');
const otherVideosContainer = document.getElementById('other-videos-container');
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu clave API
let nextPageToken = null;
let currentPlayingVideo = null;

async function fetchVideos(searchQuery = "", language = "", pageToken = null) {
    try {
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=videos+para+niños&key=${API_KEY}`;
        if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
        if (language) url += `&videoCaption=closedCaption&videoDuration=any&videoSyndicated=true&type=video&videoCategoryId=22`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            otherVideosContainer.innerHTML = "<p>No se encontraron videos.</p>";
            return;
        }

        const fragments = data.items.map(createVideoElement);
        otherVideosContainer.append(...fragments);
        nextPageToken = data.nextPageToken;
    } catch (error) {
        console.error("Error al obtener videos:", error);
        otherVideosContainer.innerHTML = `<p>Error al cargar videos: ${error.message}</p>`;
    }
}

function createVideoElement(item) {
    const videoDiv = document.createElement('div');
    videoDiv.classList.add('video-card'); // Usar la clase video-card
    videoDiv.addEventListener("click", handleVideoPlay);

    videoDiv.innerHTML = `
        <div class="video-thumbnail">
            <img src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}">
        </div>
        <h3 class="video-title">${item.snippet.title}</h3>
        <div class="channel-info">
            <img src="${item.snippet.thumbnails.default.url}" alt="Channel Icon" class="channel-avatar">
            <span>${item.snippet.channelTitle}</span>
        </div>
    `;
    return videoDiv;
}

function handleVideoPlay(event) {
    const videoId = event.target.closest('.video-card').querySelector('img').dataset.videoid; // Obtener videoId desde el dataset

    if (currentPlayingVideo) {
        currentPlayingVideo.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
    currentPlayingVideo = createIframe(videoId); //Crear el iframe en una funcion
    videoContainer.innerHTML = '';
    videoContainer.appendChild(currentPlayingVideo);
    currentPlayingVideo.classList.add('w-screen');
}

function createIframe(videoId){
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    iframe.title = videoId;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.frameborder = "0";
    return iframe;
}

function handleScroll() {
    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.body.scrollHeight;

    if (scrollPosition + 1 >= documentHeight && nextPageToken) {
        fetchVideos(searchInput.value, languageFilter.value, nextPageToken);
        nextPageToken = null;
    }
}

window.addEventListener('scroll', handleScroll);

const searchInput = document.getElementById('search-input');
const languageFilter = document.getElementById('language-filter');

searchInput.addEventListener('input', () => {
    otherVideosContainer.innerHTML = '';
    nextPageToken = null;
    fetchVideos(searchInput.value, languageFilter.value);
});

languageFilter.addEventListener('change', () => {
    otherVideosContainer.innerHTML = '';
    nextPageToken = null;
    fetchVideos(searchInput.value, languageFilter.value);
});

fetchVideos();
