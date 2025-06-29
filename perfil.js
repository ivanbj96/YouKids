document.addEventListener('DOMContentLoaded', () => {
  const channelSearch = document.getElementById('channel-search');
  const channelList = document.getElementById('channel-list');
  const languageSelect = document.getElementById('language-select');

  // Carga canales preferidos desde el backend (necesita integración con tu API)
  fetch('/api/getPreferredChannels')
    .then(response => response.json())
    .then(channels => {
      channels.forEach(channel => {
        addChannelToList(channel);
      });
    })
    .catch(error => console.error('Error loading channels:', error));

  channelSearch.addEventListener('input', () => {
    const searchTerm = channelSearch.value.toLowerCase();
    //Busca canales en tu backend, luego agrega o actualiza en la lista.
  });

  // Agregar funcionalidad para guardar canales preferidos. Necesita tu API
  channelList.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
      const channelId = event.target.dataset.channelId;
      // Llama a tu API para eliminar el canal de la lista de preferencias
    }
  });


  languageSelect.addEventListener('change', () => {
    const selectedLanguage = languageSelect.value;
    // Guarda la preferencia del idioma usando tu API
  });

  function addChannelToList(channel) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `${channel.name} <button data-channel-id="${channel.id}">Eliminar</button>`;
    channelList.appendChild(listItem);
  }
});
