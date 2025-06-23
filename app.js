// Configuración inicial
const API_KEY = 'AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI'; // Reemplaza con tu clave de API de YouTube
const VIDEOS_PER_PAGE = 12;
const SEARCH_QUERY = 'música cristiana | predicaciones cristianas -cover -tutorial'; // Filtro para contenido cristiano
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';
let currentPageToken = null;
let videoIds = new Set(); // Para evitar duplicados
let isLoading = false;
let currentPlayer = null;
let currentVideoData = null;

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
const progressBar = playerControls.querySelector('.progress-bar input');
const currentMediaImg = playerControls.querySelector('.current-media');

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

    // Actualizar progreso del video
    setInterval(updateProgressBar, 1000);
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
        currentPlayer = null;
        currentVideoData = null;
        updatePlayerControls();
        fetchVideos(true, query + ' cristiano');
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
        if (!response.ok) throw new Error('API request failed');
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
        videosContainer.innerHTML += '<p style="color: #ff0000; text-align: center;">Error al cargar videos. Intenta de nuevo.</p>';
    } finally {
        isLoading = false;
    }
}

// Renderizar carrusel
function renderCarousel(videos) {
    carouselContainer.innerHTML = videos.map(video => `
        <div class="carousel-item" data-video-id="${video.id.videoId}">
            <div class="video-player" id="player-${video.id.videoId}"></div>
        </div>
    `).join('');
    initializePlayers('.carousel-item .video-player', videos);
}

// Renderizar reels
function renderReels(videos) {
    reelsContainer.innerHTML = videos.map(video => `
        <div class="reel" data-video-id="${video.id.videoId}">
            <div class="video-player" id="player-${video.id.videoId}"></div>
            <div class="reel-overlay">
                <img src="${video.snippet.thumbnails.default.url}" alt="${video.snippet.channelTitle}">
            </div>
        </div>
    `).join('');
    initializePlayers('.reel .video-player', videos);
}

// Renderizar videos
function renderVideos(videos) {
    videosContainer.innerHTML += videos.map(video => `
        <div class="video-card" data-video-id="${video.id.videoId}">
            <div class="video-player" id="player-${video.id.videoId}"></div>
            <div class="video-info">
                <img src="${video.snippet.thumbnails.default.url}" alt="${video.snippet.channelTitle}">
            </div>
        </div>
    `).join('');
    initializePlayers('.video-card .video-player', videos);
}

// Inicializar reproductores
function initializePlayers(selector, videos) {
    document.querySelectorAll(selector).forEach(playerElement => {
        const videoId = playerElement.id.split('player-')[1];
        const videoData = videos.find(v => v.id.videoId === videoId);
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
                'onReady': (event) => onPlayerReady(event, videoData),
                'onStateChange': onPlayerStateChange
            }
        });
    });
}

// Cuando el reproductor está listo
function onPlayerReady(event, videoData) {
    const player = event.target;
    player.getIframe().addEventListener('click', () => {
        currentPlayer = player;
        currentVideoData = videoData;
        updatePlayerControls();
    });
}

// Cuando cambia el estado del reproductor
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        currentPlayer = event.target;
        const videoId = currentPlayer.getVideoData().video_id;
        const videoElement = document.querySelector(`[data-video-id="${videoId}"]`);
        const thumbnail = videoElement.querySelector('img').src;
        currentVideoData = { snippet: { thumbnails: { default: { url: thumbnail } } } };
        updatePlayerControls();
    } else if (event.data === YT.PlayerState.ENDED) {
        playNextVideo();
    }
}

// Actualizar controles del reproductor
function updatePlayerControls() {
    if (currentPlayer && currentVideoData) {
        const isPlaying = currentPlayer.getPlayerState() === YT.PlayerState.PLAYING;
        playPauseButton.querySelector('img').src = isPlaying ? '/pause-icon.png' : '/play-icon.png';
        currentMediaImg.src = currentVideoData.snippet.thumbnails.default.url;
        const isMuted = currentPlayer.isMuted();
        volumeButton.querySelector('img').src = isMuted ? '/mute-icon.png' : '/volume-icon.png';
    } else {
        playPauseButton.querySelector('img').src = '/play-icon.png';
        currentMediaImg.src = '/default-media.jpg';
        volumeButton.querySelector('img').src = '/volume-icon.png';
        progressBar.value = 0;
    }
}

// Actualizar barra de progreso
function updateProgressBar() {
    if (currentPlayer && currentPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        const duration = currentPlayer.getDuration();
        const currentTime = currentPlayer.getCurrentTime();
        progressBar.value = (currentTime / duration) * 100;
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
        const allVideos = document.querySelectorAll('[data-video-id]');
        const currentIndex = Array.from(allVideos).findIndex(item => item.dataset.videoId === currentId);
        const nextVideo = allVideos[currentIndex + 1];
        if (nextVideo) {
            const nextVideoId = nextVideo.dataset.videoId;
            currentPlayer = YT.get(`player-${nextVideoId}`);
            currentVideoData = {
                snippet: {
                    thumbnails: {
                        default: { element: nextVideo.querySelector('img').src }
                    }
                }
            };
            currentPlayer.playVideoById(nextVideoId);
            updatePlayerControls();
            nextVideo.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Si no hay más videos, cargar más
            fetchVideos();
        }
    }
}

// Alternar volumen
function toggleMute() {
    if (currentPlayer) {
        const isMuted = currentPlayer.isMuted();
        if (isMuted) {
            currentPlayer.unMute();
        } else {
            currentPlayer.mute();
        }
        updatePlayerControls();
    }
}

// Actualizar el progreso
function updateProgress() {
    if (currentPlayer) {
        const progress = progressBar.value / 100;
        currentPlayer.seekTo(progress * currentPlayer.getDuration(), true);
        updatePlayerControls();
    }
}

// Manejar scroll infinito
function handleInfiniteScroll() {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500 && !isLoading) {
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
    currentPlayer = null;
    currentVideoData = null;
    updatePlayerControls();
    fetchVideos(true);
}

// Iniciar cuando la API de YouTube esté lista
window.onYouTubeIframeAPIReady = () => init();