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

        data.items.forEach(createAndAppendVideo);
        nextPageToken = data.nextPageToken;
    } catch (error) {
        console.error("Error fetching videos:", error);
        otherVideosContainer.innerHTML = `<p>Error al cargar videos: ${error.message}</p>`;
    }
}

function createAndAppendVideo(item) {
    const videoDiv = document.createElement('div');
    videoDiv.classList.add('bg-white', 'rounded-lg', 'shadow', 'p-4', 'cursor-pointer');
    videoDiv.addEventListener('click', () => handleVideoPlay(item.id.videoId));

    videoDiv.innerHTML = `
        <img src="${item.snippet.thumbnails.medium.url}" class="w-full h-auto mb-2 rounded-lg" alt="${item.snippet.title}">
        <h3 class="text-xl font-bold">${item.snippet.title}</h3>
        <p class="text-gray-600">${item.snippet.channelTitle}</p>
    `;

    otherVideosContainer.appendChild(videoDiv);
}

function handleVideoPlay(videoId) {
    if (currentPlayingVideo) {
        currentPlayingVideo.remove();
        currentPlayingVideo = null;
    }
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1`;
    iframe.width = '100%';
    iframe.height = '300'; // Altura del video en modo normal
    iframe.classList.add('w-full', 'rounded-lg', 'shadow'); // Estilos de Tailwind
    iframe.allowFullscreen = true;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    iframe.onload = function() {
        this.style.height = 'calc(100vh - 100px)'; // Ajusta la altura al cargar
    }

    videoContainer.appendChild(iframe);
    currentPlayingVideo = iframe;
}


function handleScroll() {
    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.body.scrollHeight;
    if (scrollPosition >= documentHeight - 100 && nextPageToken) {
        fetchVideos("", "", nextPageToken);
        nextPageToken = null;
    }
}

window.addEventListener('scroll', handleScroll);

const searchInput = document.getElementById('search-input');
const languageFilter = document.getElementById('language-filter');

searchInput.addEventListener('input', () => {
    otherVideosContainer.innerHTML = '';
    nextPageToken = null;
    fetchVideos(searchInput.value);
});

languageFilter.addEventListener('change', () => {
    otherVideosContainer.innerHTML = '';
    nextPageToken = null;
    fetchVideos("", languageFilter.value);
});

fetchVideos();
