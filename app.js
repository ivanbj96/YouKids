// script.js

// Configuración inicial
const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI'; // Reemplaza con tu clave de API de YouTube
const VIDEOS_PER_PAGE = 10;
const SEARCH_QUERY = 'música cristiana | predicaciones cristianas -cover -tutorial'; // Filtro para contenido cristiano
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';
let currentPageToken = null;
let videoIds = new Set(); // Para evitar duplicados
let isLoading = false;

// Elementos del DOM
const videosContainer = document.querySelector('.videos-container');
const reelsContainer = document.querySelector('.reels-container');
const carouselContainer = document.querySelector('.carousel');
const searchInput = document.querySelector('.search-bar input');
const searchButton = document.querySelector('.search-bar button');
const playerControls = document.querySelector('.player-controls');
const playPauseButton = playerControls.querySelector('button[aria-label="Reproducir/Pausar"]');
const nextButton = playerControls.querySelector('button[aria-label="Siguiente"]');
const volumeButton = playerControls.querySelector('button[aria-label="Volumen"]');
const progressBar = playerControls.querySelector('input[type="range"]');
let currentPlayer = null;

// Cargar YouTube IFrame API
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Inicializar la aplicación
function init() {
    loadYouTubeAPI();
    fetchVideos(true); // Carga inicial
    setupEventListeners();
}

// Configurar eventos
function setupEventListeners() {
    // Búsqueda
    searchButton.addEventListener('click', () => performSearch());
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Scroll infinito
    window.addEventListener('scroll', handleInfiniteScroll);

    // Controles del reproductor
    playPauseButton.addEventListener('click', togglePlayPause);
    nextButton.addEventListener('click', playNextVideo);
    volumeButton.addEventListener('click', toggleMute);
    progressBar.addEventListener('input', updateProgress);

    // Navegación lateral
    document.querySelectorAll('aside ul li a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            resetAndReload();
        });
    });
}

// Realizar búsqueda
function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
        videoIds.clear();
        currentPageToken = null;
        videosContainer.innerHTML = '';
        reelsContainer.innerHTML = '';
        carouselContainer.innerHTML = '';
        fetchVideos(true, query);
    }
}

// Obtener videos de la API
async function fetchVideos(isInitial = false, customQuery = SEARCH_QUERY) {
    if (isLoading) return;
    isLoading = true;

    try {
        const url = new URL(BASE_URL);
        url.searchParams.append('key', API_KEY);
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('q', customQuery);
        url.searchParams.append('maxResults', VIDEOS_PER_PAGE);
        url.searchParams.append('type', 'video');
        url.searchParams.append('videoEmbeddable', 'true');
        url.searchParams.append('order', 'relevance');
        if (currentPageToken) {
            url.searchParams.append('pageToken', currentPageToken);
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const newVideos = data.items.filter(item => !videoIds.has(item.id.videoId));
            newVideos.forEach(item => videoIds.add(item.id.videoId));

            if (isInitial) {
                renderCarousel(newVideos.slice(0, 3));
                renderReels(newVideos.slice(3, 6));
                renderVideos(newVideos.slice(6));
            } else {
                renderVideos(newVideos);
            }

            currentPageToken = data.nextPageToken || null;
        } else if (!currentPageToken) {
            resetAndReload();
        }
    } catch (error) {
        console.error('Error fetching videos:', error);
    } finally {
        isLoading = false;
    }
}

// Renderizar carrusel
function renderCarousel(videos) {
    carouselContainer.innerHTML = videos.map(video => `
        <div class="carousel-item">
            <div class="video-player" id="player-${video.id.videoId}"></div>
        </div>
    `).join('');
    initializePlayers('.carousel-item .video-player');
}

// Renderizar reels
function renderReels(videos) {
    reelsContainer.innerHTML = videos.map(video => `
        <div class="reel">
            <div class="video-player" id="player-${video.id.videoId}"></div>
            <div class="reel-overlay">
                <img src="${video.snippet.thumbnails.default.url}" alt="${video.snippet.channelTitle}">
            </div>
        </div>
    `).join('');
    initializePlayers('.reel .video-player');
}

// Renderizar videos
function renderVideos(videos) {
    videosContainer.innerHTML += videos.map(video => `
        <div class="video-card">
            <div class="video-player" id="player-${video.id.videoId}"></div>
            <div class="video-info">
                <img src="${video.snippet.thumbnails.default.url}" alt="${video.snippet.channelTitle}">
            </div>
        </div>
    `).join('');
    initializePlayers('.video-card .video-player');
}

// Inicializar reproductores
function initializePlayers(selector) {
    document.querySelectorAll(selector).forEach(playerElement => {
        const videoId = playerElement.id.split('player-')[1];
        new YT.Player(playerElement.id, {
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    });
}

// Cuando el reproductor está listo
function onPlayerReady(event) {
    const player = event.target;
    player.getIframe().addEventListener('click', () => {
        currentPlayer = player;
        updatePlayerControls();
    });
}

// Cuando cambia el estado del reproductor
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        currentPlayer = event.target;
        updatePlayerControls();
    }
}

// Actualizar controles del reproductor
function updatePlayerControls() {
    if (currentPlayer) {
        const isPlaying = currentPlayer.getPlayerState() === YT.PlayerState.PLAYING;
        playPauseButton.querySelector('img').src = isPlaying ? '/pause-icon.png' : '/play-icon.png';
        progressBar.value = (currentPlayer.getCurrentTime() / currentPlayer.getDuration()) * 100;
    }
}

// Alternar reproducir/pausar
function togglePlayPause() {
    if (currentPlayer) {
        const isPlaying = currentPlayer.getPlayerState() === YT.PlayerState.PLAYING;
        if (isPlaying) {
            currentPlayer.pauseVideo();
        } else {
            currentPlayer.playVideo();
        }
        updatePlayerControls();
    }
}

// Reproducir siguiente video
function playNextVideo() {
    if (currentPlayer) {
        const currentId = currentPlayer.getVideoData().video_id;
        const allPlayers = document.querySelectorAll('.video-player');
        const currentIndex = Array.from(allPlayers).findIndex(player => player.id === `player-${currentId}`);
        const nextPlayer = allPlayers[currentIndex + 1];
        if (nextPlayer) {
            const nextVideoId = nextPlayer.id.split('player-')[1];
            currentPlayer = YT.get(`player-${nextVideoId}`);
            currentPlayer.playVideo();
            updatePlayerControls();
        }
    }
}

// Alternar mute
function toggleMute() {
    if (currentPlayer) {
        const isMuted = currentPlayer.isMuted();
        if (isMuted) {
            currentPlayer.unMute();
            volumeButton.querySelector('img').src = '/volume-icon.png';
        } else {
            currentPlayer.mute();
            volumeButton.querySelector('img').src = '/mute-icon.png';
        }
    }
}

// Actualizar progreso
function updateProgress() {
    if (currentPlayer) {
        const progress = progressBar.value / 100;
        currentPlayer.seekTo(progress * currentPlayer.getDuration());
    }
}

// Manejar scroll infinito
function handleInfiniteScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading) {
        if (currentPageToken) {
            fetchVideos();
        } else {
            resetAndReload();
        }
    }
}

// Resetear y recargar
function resetAndReload() {
    videoIds.clear();
    currentPageToken = null;
    videosContainer.innerHTML = '';
    reelsContainer.innerHTML = '';
    carouselContainer.innerHTML = '';
    fetchVideos(true);
}

// Iniciar cuando la API de YouTube esté lista
window.onYouTubeIframeAPIReady = init;