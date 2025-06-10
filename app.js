// --- Constantes y Variables Globales ---
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // ¡IMPORTANTE! Reemplaza esto con tu clave API real de YouTube
let currentKeyword = "canciones cristianas para niños";
let currentContentType = 'videos'; // 'videos' o 'shorts'

const SEEN_VIDEO_IDS = new Set(); // Para evitar videos repetidos
let videoNextPageToken = null; // Para paginación de videos
let shortsNextPageToken = null; // Para paginación de shorts

const youtubePlayers = []; // Almacena instancias de YT.Player para los shorts
let currentShortPlayer = null; // El reproductor de short actualmente visible y en reproducción
let currentShortIndex = 0; // Índice del short actualmente visible
let isFetchingMoreContent = false; // Bandera para evitar múltiples solicitudes de carga

// Definición de estados del reproductor de YouTube (para mayor claridad)
const PLAYER_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
};

// --- Funciones de Fetching y Display de Contenido ---

/**
 * Fetches and displays content based on currentContentType.
 * @param {string} type - 'videos' or 'shorts'.
 * @param {string|null} pageToken - Token para la siguiente página de resultados.
 * @param {boolean} append - Si es true, añade al contenido existente; si es false, lo reemplaza.
 */
async function fetchContent(type, pageToken = null, append = false) {
    if (isFetchingMoreContent) return;
    isFetchingMoreContent = true;

    const containerId = type === 'videos' ? "video-list" : "shorts-list";
    const targetContainer = document.getElementById(containerId);

    // Muestra mensaje de carga solo si es la primera carga o no hay contenido previo
    if (!append || targetContainer.children.length === 0) {
        targetContainer.innerHTML = `<p class="loading-message">Cargando ${type}...</p>`;
    }

    try {
        let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`;
        if (type === 'shorts') {
            apiUrl += `&videoDuration=short`;
        }
        if (pageToken) {
            apiUrl += `&pageToken=${pageToken}`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!append || targetContainer.children.length === 0) {
            targetContainer.innerHTML = ''; // Limpiar mensaje de carga después de una carga exitosa
        }

        // Almacena el token para la siguiente página
        if (type === 'videos') {
            videoNextPageToken = data.nextPageToken || null;
        } else {
            shortsNextPageToken = data.nextPageToken || null;
        }

        if (data.items && data.items.length > 0) {
            // Filtrar videos ya vistos
            const newItems = data.items.filter(item => {
                if (item.id && item.id.videoId && !SEEN_VIDEO_IDS.has(item.id.videoId)) {
                    SEEN_VIDEO_IDS.add(item.id.videoId);
                    return true;
                }
                return false;
            });

            if (newItems.length > 0) {
                displayContent(newItems, targetContainer, type);
            } else if (!pageToken) { // Si es la primera carga y no hay items nuevos (o todos son repetidos)
                targetContainer.innerHTML = `<p class="no-results-message">No se encontraron ${type} con esa búsqueda o todos ya fueron vistos. Intenta con otras palabras clave.</p>`;
            }
        } else if (!pageToken) { // Si no hay items en la primera carga
            targetContainer.innerHTML = `<p class="no-results-message">No se encontraron ${type} con esa búsqueda. Intenta con otras palabras clave.</p>`;
        }
    } catch (error) {
        console.error(`Error al obtener ${type}:`, error); // No usar alert() aquí
        if (!pageToken || targetContainer.children.length === 0) { // Mostrar mensaje de error solo si es la carga inicial o no hay contenido
            targetContainer.innerHTML = `<p class="error-message">Ocurrió un error al cargar los ${type}. Por favor, inténtalo de nuevo más tarde. Revisa tu clave API en la consola (F12) o tu conexión a Internet.</p>`;
        }
    } finally {
        isFetchingMoreContent = false;
    }
}


/**
 * Displays fetched video items into a specified container.
 * @param {Array} items - Array of video items from YouTube API.
 * @param {HTMLElement} targetContainer - The DOM element where videos will be displayed.
 * @param {string} contentType - 'videos' or 'shorts'.
 */
function displayContent(items, targetContainer, contentType) {
    items.forEach((item) => {
        if (!item.id || !item.id.videoId || !item.snippet) {
            console.warn('Skipping malformed video item:', item);
            return;
        }

        const videoId = item.id.videoId;
        const title = item.snippet.title || 'Título desconocido';
        const channelTitle = item.snippet.channelTitle || 'Canal desconocido';
        const channelThumbnail = item.snippet.thumbnails?.default?.url || 'https://via.placeholder.com/36';

        const card = document.createElement('div');
        card.classList.add(contentType === 'videos' ? 'video-card' : 'short-card');

        if (contentType === 'videos') {
            card.innerHTML = `
                <iframe
                    width="100%"
                    height="200"
                    src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    loading="lazy"
                ></iframe>
                <div class="video-info">
                    <img src="${channelThumbnail}" class="channel-img" alt="Logo de ${channelTitle}" />
                    <div>
                        <strong>${title}</strong><br/>
                        <small>${channelTitle}</small>
                    </div>
                </div>
            `;
        } else { // Shorts
            const shortId = `ytplayer-${videoId}-${Date.now()}-${Math.random().toString(36).substring(7)}`; // Unique ID
            card.innerHTML = `
                <div id="${shortId}" class="youtube-player"></div>
                <div class="short-overlay" data-player-id="${shortId}" data-video-id="${videoId}">
                    <div class="short-controls" data-player-id="${shortId}">
                        <i class="fas fa-play"></i>
                        <i class="fas fa-volume-mute"></i>
                    </div>
                </div>
            `;
            card.dataset.videoId = videoId;
            card.dataset.playerId = shortId;
        }
        targetContainer.appendChild(card);
    });

    if (contentType === 'shorts' && isYoutubeApiReady) {
        // Inicializar o añadir reproductores para los nuevos shorts
        initShortsCarousel();
    }
}

// --- Lógica de Navegación de Contenido (Videos vs Shorts) ---
function showContent(type) {
    if (currentContentType === type) return;

    currentContentType = type;

    // Quita la clase 'active' de todos los botones de navegación
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    // Quita la clase 'active-content' de todas las secciones de contenido
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-content'));

    // Controla el overflow global del body/html
    if (type === 'videos') {
        document.getElementById('showVideosBtn').classList.add('active');
        document.getElementById('video-list').classList.add('active-content');
        document.documentElement.style.overflowY = 'auto'; // Permitir scroll en html para videos
        document.body.style.overflowY = 'auto'; // Permitir scroll en body para videos
        resetShortsPlayers(); // Pausa y destruye reproductores de shorts
        fetchContent('videos'); // Carga videos
    } else if (type === 'shorts') {
        document.getElementById('showShortsBtn').classList.add('active');
        document.getElementById('shorts-list').classList.add('active-content');
        document.documentElement.style.overflowY = 'hidden'; // Ocultar scroll en html para shorts
        document.body.style.overflowY = 'hidden'; // Ocultar scroll en body para shorts
        fetchContent('shorts'); // Carga shorts
    }
    // Asegurar que la barra de navegación sea visible al cambiar de sección
    mainNav.classList.remove('hidden');
    clearTimeout(navHideTimeout); // Limpiar cualquier temporizador de ocultación pendiente
}


// --- Funciones del Modal de Búsqueda ---
function openFilterModal() {
    document.getElementById("search-modal").classList.add("show");
    document.getElementById("search-input").value = currentKeyword;
    document.getElementById("search-input").focus();
}

function applySearch() {
    const input = document.getElementById("search-input").value.trim();
    if (input !== "") {
        currentKeyword = input;
        SEEN_VIDEO_IDS.clear(); // Limpiar IDs vistos en nueva búsqueda
        videoNextPageToken = null;
        shortsNextPageToken = null;

        // Limpiar contenedores existentes
        document.getElementById("video-list").innerHTML = '';
        document.getElementById("shorts-list").innerHTML = '';

        resetShortsPlayers(); // Limpiar reproductores existentes (importante antes de cargar nuevos shorts)

        // Aplica la búsqueda a la sección actualmente activa
        fetchContent(currentContentType);
    }
    closeModal();
}

function closeModal() {
    document.getElementById("search-modal").classList.remove("show");
}

// --- Lógica de Instalación de PWA (botón "Instalar") ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        console.log('Instalación aceptada por el usuario');
    } else {
        console.log('Instalación rechazada por el usuario');
    }
    installBtn.style.display = 'none';
    deferredPrompt = null;
});

// --- Registro del Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.error('Fallo el registro del Service Worker:', error);
            });
    });
}

// --- Lógica de YouTube IFrame Player API (para Shorts) ---
let isYoutubeApiReady = false;

function onYouTubeIframeAPIReady() {
    isYoutubeApiReady = true;
    console.log('YouTube IFrame API is ready.');
    // Si ya estamos en shorts y la sección está activa, inicializamos los reproductores
    if (currentContentType === 'shorts' && document.getElementById('shorts-list').classList.contains('active-content')) {
        initShortsCarousel();
    }
}

function initShortsCarousel() {
    if (!isYoutubeApiReady) {
        console.warn('YouTube IFrame API no está lista. No se pueden inicializar los reproductores.');
        return;
    }

    const shortsList = document.getElementById('shorts-list');
    const existingPlayersCount = youtubePlayers.length; // Contar reproductores ya creados
    const shortCards = Array.from(shortsList.querySelectorAll('.short-card'));

    // Solo crear reproductores para las nuevas tarjetas (las que no tienen un reproductor asociado aún)
    for (let i = existingPlayersCount; i < shortCards.length; i++) {
        const card = shortCards[i];
        const videoId = card.dataset.videoId;
        const playerId = card.dataset.playerId;

        const player = new YT.Player(playerId, {
            videoId: videoId,
            playerVars: {
                controls: 0,
                disablekb: 1,
                showinfo: 0,
                rel: 0,
                modestbranding: 1,
                autoplay: 0,
                mute: 1, // Empezar siempre muteado, lo controlaremos
                loop: 1,
                playlist: videoId, // Para que el loop funcione
                origin: window.location.origin // *** SOLUCIÓN ERROR 2 ***
            },
            events: {
                'onReady': onShortPlayerReady,
                'onStateChange': onShortPlayerStateChange,
                'onError': onShortPlayerError
            }
        });
        youtubePlayers.push(player);

        // Configurar eventos de clic en el overlay y controles
        const overlay = card.querySelector('.short-overlay');
        const controls = card.querySelector('.short-controls');
        const playIcon = controls.querySelector('.fa-play') || controls.querySelector('.fa-pause');
        const volumeIcon = controls.querySelector('.fa-volume-mute') || controls.querySelector('.fa-volume-up');

        overlay.onclick = (e) => {
            e.stopPropagation();
            if (player && typeof player.getPlayerState === 'function') { // *** SOLUCIÓN ERROR 1 ***
                if (player.getPlayerState() === PLAYER_STATES.PLAYING) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
            }
            if (controls) {
                controls.classList.add('visible'); // Mostrar controles brevemente
                clearTimeout(controls.hideTimeout);
                controls.hideTimeout = setTimeout(() => controls.classList.remove('visible'), 1500);
            }
        };

        volumeIcon.onclick = (e) => {
            e.stopPropagation();
            if (player) { // Solo si el reproductor existe
                if (player.isMuted()) {
                    player.unMute();
                    volumeIcon.classList.remove('fa-volume-mute');
                    volumeIcon.classList.add('fa-volume-up');
                } else {
                    player.mute();
                    volumeIcon.classList.remove('fa-volume-up');
                    volumeIcon.classList.add('fa-volume-mute');
                }
            }
        };

        // Mostrar controles al pasar el mouse por encima (opcional, útil en desktop)
        card.onmouseenter = () => { if (controls) controls.classList.add('visible'); };
        card.onmouseleave = () => {
            if (controls) {
                clearTimeout(controls.hideTimeout);
                controls.hideTimeout = setTimeout(() => controls.classList.remove('visible'), 500);
            }
        };
    }

    // El primer short se reproducirá a través del scroll listener
    // Esto se elimina de aquí: if (!currentShortPlayer && youtubePlayers.length > 0) { scrollToShort(0); playShortAtIndex(0); }
}

function onShortPlayerReady(event) {
    console.log(`Player ${event.target.h.id} ready.`);
    // Ya no se auto-reproduce el primer short aquí. El scroll listener lo manejará.
}

function onShortPlayerStateChange(event) {
    const player = event.target;
    // *** SOLUCIÓN ERROR 4 ***: Asegurarse de que player.a y su parentNode existan
    const playerIframe = player && player.a;
    const playerDiv = playerIframe && playerIframe.parentNode;
    const card = playerDiv && playerDiv.parentNode;
    const controls = card && card.querySelector('.short-controls');

    if (!controls) return; // Si no hay controles, salimos

    const playIcon = controls.querySelector('.fa-play') || controls.querySelector('.fa-pause');
    const volumeIcon = controls.querySelector('.fa-volume-mute') || controls.querySelector('.fa-volume-up');

    // Sincronizar iconos con el estado del reproductor
    if (player.getPlayerState() === PLAYER_STATES.PLAYING) {
        if (playIcon) {
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
        }
        controls.classList.remove('visible'); // Ocultar controles automáticamente al reproducir
    } else {
        if (playIcon) {
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
        }
        controls.classList.add('visible'); // Mostrar controles al pausar
    }

    if (volumeIcon) {
        if (player.isMuted()) {
            volumeIcon.classList.remove('fa-volume-up');
            volumeIcon.classList.add('fa-volume-mute');
        } else {
            volumeIcon.classList.remove('fa-volume-mute');
            volumeIcon.classList.add('fa-volume-up');
        }
    }
}

function onShortPlayerError(event) {
    console.error('YouTube Player Error:', event.data, event.target.h.id); // *** SOLUCIÓN ERROR 3 ***: No usar alert()
    const playerIframe = event.target && event.target.a;
    const playerDiv = playerIframe && playerIframe.parentNode;
    const card = playerDiv && playerDiv.parentNode;

    if (card) {
        card.innerHTML = `<p class="error-message" style="color:white; text-align:center;">No se pudo cargar este Short. (Error: ${event.data})</p>`;
    }
}

function playShortAtIndex(index) {
    if (index < 0 || index >= youtubePlayers.length) return;

    const nextPlayer = youtubePlayers[index];

    // Pausar y mutear el reproductor actual si existe y es diferente al siguiente
    if (currentShortPlayer && currentShortPlayer !== nextPlayer) {
        if (typeof currentShortPlayer.pauseVideo === 'function') currentShortPlayer.pauseVideo();
        if (typeof currentShortPlayer.mute === 'function') currentShortPlayer.mute();
    }

    currentShortPlayer = nextPlayer;
    currentShortIndex = index;

    // Solo intentar reproducir y mutear si el reproductor existe y está listo
    if (currentShortPlayer && typeof currentShortPlayer.playVideo === 'function' && currentShortPlayer.getPlayerState() !== PLAYER_STATES.UNSTARTED) {
        currentShortPlayer.playVideo();
        currentShortPlayer.mute(); // Asegurar que el nuevo short empiece muteado
    } else {
        // Si el reproductor no está listo, intentaremos reproducirlo cuando lo esté
        // Esto se manejará implícitamente por el onShortPlayerStateChange o al reintentar en el scroll
        console.log(`Short ${index} no está listo todavía, esperando...`);
    }

    // Mostrar controles brevemente para el nuevo short
    const playerIframe = currentShortPlayer && currentShortPlayer.a;
    const playerDiv = playerIframe && playerIframe.parentNode;
    const card = playerDiv && playerDiv.parentNode;
    const controls = card && card.querySelector('.short-controls');

    if (controls) {
        controls.classList.add('visible');
        clearTimeout(controls.hideTimeout);
        controls.hideTimeout = setTimeout(() => controls.classList.remove('visible'), 1500);
    }
}


function resetShortsPlayers() {
    youtubePlayers.forEach(player => {
        try {
            if (player && typeof player.destroy === 'function') {
                player.destroy();
            }
        } catch (e) {
            console.warn("Error destroying player:", e);
        }
    });
    youtubePlayers.length = 0;
    currentShortPlayer = null;
    currentShortIndex = 0;
}

// --- Infinite Scroll para Shorts ---
const shortsListElement = document.getElementById('shorts-list');
if (shortsListElement) {
    shortsListElement.addEventListener('scroll', debounce(() => {
        if (currentContentType !== 'shorts') return;

        const scrollPosition = shortsListElement.scrollTop;
        const totalHeight = shortsListElement.scrollHeight;
        const visibleHeight = shortsListElement.clientHeight;

        const shortCards = Array.from(shortsListElement.querySelectorAll('.short-card'));
        let newCurrentShortIndex = 0;

        // Calcular el índice del short visible por su centro
        for (let i = 0; i < shortCards.length; i++) {
            const card = shortCards[i];
            const cardTop = card.offsetTop;
            const cardHeight = card.clientHeight;
            const cardCenter = cardTop + (cardHeight / 2);

            if (cardCenter >= scrollPosition + visibleHeight / 2) {
                newCurrentShortIndex = i;
                break; // Encontramos el primer short que está en el centro o más abajo
            }
            newCurrentShortIndex = i; // En caso de que el último short sea el único visible
        }


        if (newCurrentShortIndex !== currentShortIndex) {
            scrollToShort(newCurrentShortIndex); // Forzar el snap al short actual
            playShortAtIndex(newCurrentShortIndex); // Reproducir el short recién visible
        }

        // Cargar más shorts si el usuario se acerca al final
        const scrollThreshold = visibleHeight * 1; // Cargar más cuando queda 1 pantalla para el final
        if (!isFetchingMoreContent && shortsNextPageToken && (scrollPosition + visibleHeight >= totalHeight - scrollThreshold)) {
            console.log("Cargando más shorts...");
            fetchContent('shorts', shortsNextPageToken, true); // Añadir al contenido existente
        }
    }, 200)); // Debounce para no ejecutar demasiado seguido
}


// --- Infinite Scroll para Videos ---
const videoListElement = document.getElementById('video-list');
if (videoListElement) {
    videoListElement.addEventListener('scroll', debounce(() => {
        if (currentContentType !== 'videos') return;

        const scrollPosition = videoListElement.scrollTop;
        const totalHeight = videoListElement.scrollHeight;
        const visibleHeight = videoListElement.clientHeight;
        const scrollThreshold = visibleHeight * 1; // Cargar más cuando queda 1 pantalla para el final

        if (!isFetchingMoreContent && videoNextPageToken && (scrollPosition + visibleHeight >= totalHeight - scrollThreshold)) {
            console.log("Cargando más videos...");
            fetchContent('videos', videoNextPageToken, true); // Añadir al contenido existente
        }
    }, 200));
}


// Función para debouncing
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


// Función para desplazar a un short específico
function scrollToShort(index) {
    const shortsList = document.getElementById('shorts-list');
    const shortCards = shortsList.querySelectorAll('.short-card');
    if (shortCards[index]) {
        // Usar requestAnimationFrame para asegurar que el scroll se haga después de que el DOM esté listo
        requestAnimationFrame(() => {
            shortsList.scrollTo({
                top: shortCards[index].offsetTop,
                behavior: 'smooth'
            });
        });
    }
}


// --- Lógica de Ocultar/Mostrar Barra de Navegación ---
const mainNav = document.querySelector('.main-nav');
let lastScrollY = 0; // Inicializar en 0 para que siempre se muestre al cargar
let navHideTimeout;

// Para videos, la barra de navegación se oculta con el scroll del BODY/HTML
window.addEventListener('scroll', () => {
    if (currentContentType !== 'videos') {
        // En modo Shorts, la barra de navegación debe estar siempre visible
        mainNav.classList.remove('hidden');
        clearTimeout(navHideTimeout);
        return;
    }

    const currentScrollY = window.scrollY;
    // Si el scroll es hacia abajo y ya no estamos en la parte superior del header
    if (currentScrollY > lastScrollY && currentScrollY > 56) {
        mainNav.classList.add('hidden');
    } else { // Si el scroll es hacia arriba
        mainNav.classList.remove('hidden');
    }
    lastScrollY = currentScrollY;

    // Resetea el temporizador para ocultar si se mueve el scroll
    clearTimeout(navHideTimeout);
    navHideTimeout = setTimeout(() => {
        if (currentContentType === 'videos') { // Solo ocultar si sigue en vista de videos
            mainNav.classList.add('hidden');
        }
    }, 5000); // Ocultar después de 5 segundos de inactividad
});


// --- Carga inicial de contenido al cargar la página ---
document.addEventListener("DOMContentLoaded", () => {
    showContent('videos'); // Muestra los videos por defecto al cargar la aplicación
    // La barra de navegación se mostrará por showContent('videos') y el scroll listener
});
