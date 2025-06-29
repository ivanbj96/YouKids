document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('short-video');

  function loadRandomVideo() {
    // Aquí debes integrar tu API para obtener un video aleatorio para niños.
    // Ejemplo (reemplaza con tu API):
    fetch('/api/getKidsShort')
      .then(response => response.json())
      .then(data => {
        if (data.url) {
          video.src = data.url;
          video.load();
          video.play();
        } else {
          console.error('Error fetching video');
        }
      })
      .catch(error => console.error('Error:', error));
  }

  // Cargar video aleatorio al cargar la página y al recargarla
  loadRandomVideo();
  window.addEventListener('beforeunload', () => video.pause()); // Pause before leaving
});
