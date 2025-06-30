// DOM Elements
const channelSearch = document.getElementById("channel-search");
const preferredChannelsList = document.getElementById("preferred-channels");
const languageSelect = document.getElementById("preferred-language");
const autoplayToggle = document.getElementById("autoplay-toggle");
const darkmodeToggle = document.getElementById("darkmode-toggle");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Estado
let preferredChannels = new Set();

// Recuperar configuración previa
window.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("youkidsPrefs")) || {};
  if (saved.channels) {
    saved.channels.forEach(ch => addChannel(ch));
  }
  if (saved.language) languageSelect.value = saved.language;
  if (saved.autoplay) autoplayToggle.checked = true;
  if (saved.darkmode) darkmodeToggle.checked = true;
});

// Añadir canal
channelSearch.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const val = e.target.value.trim();
    if (val && !preferredChannels.has(val)) {
      addChannel(val);
      e.target.value = "";
    }
  }
});

function addChannel(name) {
  preferredChannels.add(name);
  const li = document.createElement("li");
  li.textContent = name;
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "❌";
  removeBtn.onclick = () => {
    preferredChannels.delete(name);
    preferredChannelsList.removeChild(li);
  };
  li.appendChild(removeBtn);
  preferredChannelsList.appendChild(li);
}

// Guardar preferencias
saveBtn.addEventListener("click", () => {
  const data = {
    channels: Array.from(preferredChannels),
    language: languageSelect.value,
    autoplay: autoplayToggle.checked,
    darkmode: darkmodeToggle.checked,
  };
  localStorage.setItem("youkidsPrefs", JSON.stringify(data));
  statusMsg.textContent = "✅ Preferencias guardadas correctamente.";
  setTimeout(() => (statusMsg.textContent = ""), 3000);
});