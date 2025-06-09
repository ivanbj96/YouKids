// --- Configuración de la API de YouTube ---
const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // ¡IMPORTANTE! Reemplaza esto con tu clave API real de YouTube
let currentKeyword = "canciones cristianas para niños"; // Palabra clave inicial

// --- Funciones de Fetching y Display de Videos ---
async function fetchVideos() {
    const videoListContainer = document.getElementById("video-list");
    videoListContainer.innerHTML = '<p class="loading-message">Cargando videos...</p>'; // Mensaje de carga

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(currentKeyword)}&type=video&key=${apiKey}`);

        if (!response.ok) {
            // Manejo de errores HTTP
            const errorText = await response.text();
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            displayVideos(data.items);
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

function displayVideos(items) {
    const container = document.getElementById("video-list");
    container.innerHTML = ''; // Limpiar contenido anterior

    items.forEach(item => {
        // Validación básica de datos
        if (!item.id || !item.id.videoId || !item.snippet) {
            console.warn('Skipping malformed video item:', item);
            return;
        }

        const videoId = item.id.videoId;
        const title = item.snippet.title || 'Título desconocido';
        const thumbnail = item.snippet.thumbnails?.high?.url || '';
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
        container.appendChild(videoCard);
    });
}

// --- Funciones del Modal de Búsqueda ---
function openFilterModal() {
    document.getElementById("search-modal").classList.add("show");
    document.getElementById("search-input").value = currentKeyword; // Carga la palabra clave actual
    document.getElementById("search-input").focus(); // Pone el foco en el input
}

function applySearch() {
    const input = document.getElementById("search-input").value.trim();
    if (input !== "") {
        currentKeyword = input;
        fetchVideos();
    }
    closeModal(); // Asegura que el modal se cierra después de aplicar la búsqueda
}

function closeModal() {
    document.getElementById("search-modal").classList.remove("show");
}

// --- Evento DOMContentLoaded para cargar videos al inicio ---
document.addEventListener("DOMContentLoaded", fetchVideos);


// --- Lógica de Instalación de PWA (botón "Instalar") ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // Previene que la mini-barra de información aparezca
    deferredPrompt = e;
    installBtn.style.display = 'block'; // Muestra el botón de instalación
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // Muestra el diálogo de instalación
    const { outcome } = await deferredPrompt.userChoice; // Espera la respuesta del usuario
    if (outcome === 'accepted') {
        console.log('Instalación aceptada por el usuario');
    } else {
        console.log('Instalación rechazada por el usuario');
    }
    installBtn.style.display = 'none'; // Oculta el botón después de la interacción
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
