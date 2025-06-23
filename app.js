const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu clave API de YouTube
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const videoContainer = document.getElementById('videoContainer');

searchButton.addEventListener('click', searchVideos);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchVideos();
    }
});

async function searchVideos() {
    const query = searchInput.value;
    if (!query) return;

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}&type=video`);
        const data = await response.json();

        videoContainer.innerHTML = ''; // Limpia resultados anteriores
        data.items.forEach(item => {
            const videoId = item.id.videoId;
            const title = item.snippet.title;
            const thumbnail = item.snippet.thumbnails.high.url;
            const channelTitle = item.snippet.channelTitle;


            const videoItem = `
                <div class="videoItem">
                    <img src="${thumbnail}" alt="${title}">
                    <div class="info">
                        <h3>${title}</h3>
                        <p>Canal: ${channelTitle}</p>
                        <iframe width="100%" height="300" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                    </div>
                </div>
            `;
            videoContainer.innerHTML += videoItem;
        });
    } catch (error) {
        console.error('Error al buscar videos:', error);
        videoContainer.innerHTML = '<p>Error al buscar videos. Intenta de nuevo más tarde.</p>';
    }
}

// ... (código para la instalación PWA, igual que antes)
