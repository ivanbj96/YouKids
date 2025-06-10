// --- Configuración de la API de YouTube ---
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // ¡IMPORTANTE! Reemplaza esto con tu clave API real de YouTube
let currentKeyword = "canciones cristianas para niños"; // Palabra clave inicial
let currentContentType = 'videos'; // 'videos' o 'shorts'

// --- Funciones de Fetching y Display de Contenido ---

/**
 * Fetches and displays regular YouTube videos.
 */
async function fetchVideos() {
    const videoListContainer = document.getElementById("video-list");
    videoListContainer.innerHTML = '<p class="loading-message">Cargando videos...</p>';

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            displayContent(data.items, videoListContainer);
        } else {
            videoListContainer.innerHTML = '<p class="no-results-message">No se encontraron videos con esa búsqueda. Intenta con otras palabras clave.</p>';
            alert('No se encontraron videos. Intenta con otras palabras clave.');
        }
    } catch (error) {
        console.error('Error al obtener videos:', error);
        videoListContainer.innerHTML = '<p class="error-message">Ocurrió un error al cargar los videos. Por favor, inténtalo de nuevo más tarde.</p>';
        alert('Ocurrió un error al obtener los videos. Por favor, intenta de nuevo más tarde. Revisa tu clave API.');
    }
}

/**
 * Fetches and displays YouTube Shorts.
 */
async function fetchShorts() {
    const shortsListContainer = document.getElementById("shorts-list");
    shortsListContainer.innerHTML = '<p class="loading-message">Cargando Shorts...</p>';

    try {
        // Query para shorts: type=video, videoDuration=short
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(currentKeyword)}&type=video&videoDuration=short&key=${apiKey}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            displayContent(data.items, shortsListContainer); // Usa la misma función de display
        } else {
            shortsListContainer.innerHTML = '<p class="no-results-message">No se encontraron Shorts con esa búsqueda. Intenta con otras palabras clave.</p>';
            alert('No se encontraron Shorts. Intenta con otras palabras clave.');
        }
    } catch (error) {
        console.error('Error al obtener Shorts:', error);
        shortsListContainer.innerHTML = '<p class="error-message">Ocurrió un error al cargar los Shorts. Por favor, inténtalo de nuevo más tarde.</p>';
        alert('Ocurrió un error al obtener los Shorts. Por favor, intenta de nuevo más tarde. Revisa tu clave API.');
    }
}

/**
 * Displays fetched video items into a specified container.
 * @param {Array} items - Array of video items from YouTube API.
 * @param {HTMLElement} targetContainer - The DOM element where videos will be displayed.
 */
function displayContent(items, targetContainer) {
    targetContainer.innerHTML = ''; // Limpiar contenido anterior

    items.forEach(item => {
        if (!item.id || !item.id.videoId || !item.snippet) {
            console.warn('Skipping malformed video item:', item);
            return;
        }

        const videoId = item.id.videoId;
        const title = item.snippet.title || 'Título desconocido';
        const channelTitle = item.snippet.channelTitle || 'Canal desconocido';
        const channelThumbnail = item.snippet.thumbnails?.default?.url || 'https://via.placeholder.com/36'; // Placeholder si no hay imagen

        const videoCard = document.createElement('div');
        videoCard.classList.add('video-card');
        videoCard.innerHTML = `
            <iframe
                width="100%"
                height="200"
                src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                loading="lazy" <!-- Carga perezosa del iframe -->
            ></iframe>
            <div class="video-info">
                <img src="${channelThumbnail}" class="channel-img" alt="Logo de ${channelTitle}" />
                <div>
                    <strong>${title}</strong><br/>
                    <small>${channelTitle}</small>
                </div>
            </div>
        `;
        targetContainer.appendChild(videoCard);
    });
}

// --- Lógica de Navegación de Contenido (Videos vs Shorts) ---
function showContent(type) {
    currentContentType = type;

    // Quita la clase 'active' de todos los botones de navegación
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    // Quita la clase 'active-content' de todas las secciones de contenido
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-content'));

    // Añade la clase 'active' al botón seleccionado y 'active-content' a la sección de contenido correspondiente
    if (type === 'videos') {
        document.getElementById('showVideosBtn').classList.add('active');
        document.getElementById('video-list').classList.add('active-content');
        fetchVideos(); // Carga videos cuando la sección 'Videos' es seleccionada
    } else if (type === 'shorts') {
        document.getElementById('showShortsBtn').classList.add('active');
        document.getElementById('shorts-list').classList.add('active-content');
        fetchShorts(); // Carga shorts cuando la sección 'Shorts' es seleccionada
    }
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
        // Aplica la búsqueda a la sección actualmente activa
        if (currentContentType === 'videos') {
            fetchVideos();
        } else if (currentContentType === 'shorts') {
            fetchShorts();
        }
    }
    closeModal(); // Asegura que el modal se cierra después de aplicar la búsqueda
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

// --- Carga inicial de contenido al cargar la página ---
document.addEventListener("DOMContentLoaded", () => {
    showContent('videos'); // Muestra los videos por defecto al cargar la aplicación
});
