import { getYoutubeVideos, setPreferences, getPreferences } from './common.js';

const videoContainer = document.getElementById('videoContainer');
const preferencesButton = document.getElementById('preferencesButton');
const preferencesModal = document.getElementById('preferencesModal');


let preferences = getPreferences(); //Obtener preferencias al iniciar

function displayVideos(videos) {
    videoContainer.innerHTML = ''; //Limpiar el contenedor antes de añadir nuevos videos
    videos.forEach(video => {
        const videoElement = document.createElement('div');
        videoElement.classList.add('video-item');
        videoElement.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}">
            <h3>${video.title}</h3>
        `;
        videoContainer.appendChild(videoElement);
    });
}


async function loadVideos() {
    const videos = await getYoutubeVideos(preferences.language, preferences.preferredChannels);
    displayVideos(videos);
}


preferencesButton.addEventListener('click', () => {
    preferencesModal.style.display = 'block'; //Mostrar el modal
});


// ... (Falta implementar la lógica del modal de preferencias, guardar preferencias, etc.) ...

loadVideos();
