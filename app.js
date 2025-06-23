const apiKey = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI";
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const videoContainer = document.getElementById('videoContainer');

searchButton.addEventListener('click', searchVideos);
searchInput.addEventListener('keydown', (e) => e.key === 'Enter' && searchVideos());

async function searchVideos() {
    const query = searchInput.value;
    if (!query) return;

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}&type=video`);
        const data = await response.json();

        videoContainer.innerHTML = ''; // Limpia resultados anteriores
        const videoItems = data.items.map(item => createVideoItem(item));
        videoContainer.append(...videoItems); // Agrega los elementos al contenedor


    } catch (error) {
        console.error('Error al buscar videos:', error);
        videoContainer.innerHTML = '<p>Error al buscar videos. Intenta de nuevo más tarde.</p>';
    }
}


function createVideoItem(item) {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumbnail = item.snippet.thumbnails.high.url;
    const channelTitle = item.snippet.channelTitle;

    const videoItem = document.createElement('div');
    videoItem.classList.add('videoItem');

    const img = document.createElement('img');
    img.src = thumbnail;
    img.alt = title;
    videoItem.appendChild(img);

    const info = document.createElement('div');
    info.classList.add('info');

    const h3 = document.createElement('h3');
    h3.textContent = title;
    info.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = `Canal: ${channelTitle}`;
    info.appendChild(p);

    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '300';
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.frameborder = '0';
    iframe.allowFullscreen = true;
    info.appendChild(iframe);

    videoItem.appendChild(info);
    return videoItem;
}


// ... (código para la instalación PWA, igual que antes)
