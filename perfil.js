const langSelect = document.getElementById("prefer-lang");
const channelInput = document.getElementById("channel-search");
const favChannelsList = document.getElementById("fav-channels");
const form = document.getElementById("perfil-form");

let favChannels = JSON.parse(localStorage.getItem("favChannels") || "[]");
langSelect.value = localStorage.getItem("preferLang") || "";

favChannels.forEach(addChannelToList);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  localStorage.setItem("preferLang", langSelect.value);
  localStorage.setItem("favChannels", JSON.stringify(favChannels));
  alert("Preferencias guardadas ✅");
});

channelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = channelInput.value.trim();
    if (val && !favChannels.includes(val)) {
      favChannels.push(val);
      addChannelToList(val);
      channelInput.value = "";
    }
  }
});

function addChannelToList(channel) {
  const li = document.createElement("li");
  li.textContent = channel;
  favChannelsList.appendChild(li);
}