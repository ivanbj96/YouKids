const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu clave API de YouTube
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const videoContainer = document.getElementById('videoContainer');

searchButton.addEventListener('click', searchVideos);
searchInput.addEventListener('keydown', (e) => e.key === 'Enter' && searchVideos());

// Llamada inicial a searchVideos para cargar videos al inicio
window.addEventListener('load', () => searchVideos('videos cristianos para niños'));


async function searchVideos(query = 'videos cristianos para niños') { // query tiene un valor por defecto
    if (!query) return;

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}&type=video`);
        const data = await response.json();

        videoContainer.innerHTML = ''; // Limpia resultados anteriores
        const videoItems = data.items.map(item => createVideoItem(item));
        videoContainer.append(...videoItems);

    } catch (error) {
        console.error('Error al buscar videos:', error);
        videoContainer.innerHTML = '<p>Error al buscar videos. Intenta de nuevo más tarde.</p>';
    }
}


function createVideoItem(item) {
    // ... (Esta función permanece igual)
}