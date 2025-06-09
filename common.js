// common.js 
const API_KEY = "AIzaSyC9EVsb-yOvbGe1dvi8m_nEakxklMrusAI"; // Reemplaza con tu clave API

// Función para obtener videos de YouTube
async function getYoutubeVideos(language, preferredChannels, videoType = 'video') {
  let searchQuery = `niños cristianos`; // Query base
  if (videoType === 'video'){
      searchQuery = `niños cristianos`;
  } else if (videoType === 'short'){
      searchQuery = `niños cristianos shorts`;
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=${videoType}&maxResults=20&q=${searchQuery}&key=${API_KEY}&videoCategoryId=22&regionCode=${language}`; //Ajustar regionCode para el idioma

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Filtrado (esto necesita ser expandido considerablemente)
    let filteredVideos = data.items.filter(video => {
      const titleLower = video.snippet.title.toLowerCase();
      return !titleLower.includes("regueton") && !titleLower.includes("violencia") && !titleLower.includes("pelea") ; //Añade más palabras clave negativas según sea necesario
    });


    //Priorizar canales preferidos (si están disponibles en los resultados)
    if (preferredChannels && Array.isArray(preferredChannels)) {
      filteredVideos.sort((a,b) => {
          const channelA = a.snippet.channelId;
          const channelB = b.snippet.channelId;
          if(preferredChannels.includes(channelA)) return -1;
          if(preferredChannels.includes(channelB)) return 1;
          return 0;
      })
    }

    return filteredVideos.map(video => ({
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      videoId: video.id.videoId,
      channelId: video.snippet.channelId,
    }));
  } catch (error) {
    console.error("Error al obtener videos de YouTube:", error);
    return [];
  }
}


//Almacenamiento de preferencias en localStorage (más sencillo que cookies)
function setPreferences(preferences) {
    localStorage.setItem('preferences', JSON.stringify(preferences));
}

function getPreferences() {
    const storedPreferences = localStorage.getItem('preferences');
    return storedPreferences ? JSON.parse(storedPreferences) : { language: 'es', preferredChannels: [] };
}


export { getYoutubeVideos, setPreferences, getPreferences };
