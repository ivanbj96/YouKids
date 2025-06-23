const videoContainer = document.getElementById('video-container');
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // <--- ¡REEMPLAZA ESTA CLAVE!

async function fetchVideos() {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=cristianismo&key=${API_KEY}`);
    const data = await response.json();

    data.items.forEach(item => {
      const iframe = document.createElement('iframe');
      iframe.width = '560';
      iframe.height = '315';
      iframe.src = `https://www.youtube.com/embed/${item.id.videoId}`;
      iframe.title = item.snippet.title;
      iframe.frameborder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      videoContainer.appendChild(iframe);
    });
  } catch (error) {
    console.error("Error al obtener videos:", error);
    // Aquí podrías mostrar un mensaje de error al usuario
    videoContainer.innerHTML = "<p>Error al cargar los videos. Por favor, intenta más tarde.</p>";
  }
}


fetchVideos();