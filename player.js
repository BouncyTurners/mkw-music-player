const audioPlayer = document.getElementById('audioPlayer');
const titleEl = document.getElementById('title');
const composerEl = document.getElementById('composer');
const artworkEl = document.getElementById('artwork');

const skipBtn = document.getElementById('skipBtn');
const skipBtnMobile = document.getElementById('skipBtnMobile');

let tracks = [];
let currentTrack = 0;

// ---------- Shuffle ----------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ---------- Play track + metadata & artwork ----------
function playTrack(index) {
  currentTrack = index;
  const track = tracks[index];
  audioPlayer.src = track.url;
  audioPlayer.play();

  titleEl.textContent = track.title || '-';
  composerEl.textContent = track.composer || '-';
  artworkEl.src = track.artwork || 'assets/player-img/cover.png';
}

// ---------- Play next track ----------
function playNextTrack() {
  currentTrack = (currentTrack + 1) % tracks.length;
  playTrack(currentTrack);
}

// ---------- Auto next track after end ----------
audioPlayer.addEventListener('ended', playNextTrack);

// ---------- Skip knop events ----------
function skipTrack() {
  playNextTrack();
}

skipBtn.addEventListener('click', skipTrack);
skipBtnMobile.addEventListener('click', skipTrack);

// ---------- Load tracks + shuffle on load ----------
fetch('./tracksCD1.json')
  .then(res => res.json())
  .then(data => {
    tracks = data.slice();
    shuffleArray(tracks);
    if (tracks.length > 0) playTrack(0);
  })
  .catch(err => console.error('Error loading tracksCD1.json:', err));

// ---------- Volume ----------
const volumeSlider = document.getElementById('volumeSlider');
audioPlayer.volume = volumeSlider.value / 100;

volumeSlider.addEventListener('input', () => {
  audioPlayer.volume = volumeSlider.value / 100;
});

// ---------- Dropdown ----------
const dropdown = document.querySelector(".dropdown");
const toggle = document.querySelector(".dropdown-toggle");

function toggleDropdown() {
  if (dropdown.style.display === "flex") {
      dropdown.style.display = "none";
      toggle.classList.remove("open");
  } else {
      dropdown.style.display = "flex";
      toggle.classList.add("open");

      const player = document.querySelector(".musicplayer");
      const rect = player.getBoundingClientRect();
      const dropdownWidth = dropdown.offsetWidth;
      const viewportWidth = window.innerWidth;

      let leftPos = rect.right + 10;
      if (leftPos + dropdownWidth > viewportWidth) {
          leftPos = viewportWidth - dropdownWidth - 10;
      }
      dropdown.style.left = leftPos + "px";
      dropdown.style.top = rect.top + rect.height / 2 + "px";
      dropdown.style.transform = "translateY(-50%)";
  }
}

// Globale klik-handler om dropdown te sluiten
document.addEventListener("click", function(event) {
  const isClickInsideDropdown = dropdown.contains(event.target);
  const isClickOnToggle = toggle.contains(event.target);

  if (!isClickInsideDropdown && !isClickOnToggle) {
      dropdown.style.display = "none";
      toggle.classList.remove("open");
  }
});
