const audioPlayer = document.getElementById('audioPlayer');
const titleEl = document.getElementById('title');
const composerEl = document.getElementById('composer');
const artworkEl = document.getElementById('artwork');

let tracks = [];
let currentTrack = 0;

// Shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Play tracks + metadata & artwork
function playTrack(index) {
  currentTrack = index;
  const track = tracks[index];
  audioPlayer.src = track.url;
  audioPlayer.play();

  titleEl.textContent = track.title || '-';
  composerEl.textContent = track.composer || '-';
  artworkEl.src = track.artwork || 'assets/player-img/cover.png';
}

// Next track after end
audioPlayer.addEventListener('ended', () => {
  currentTrack = (currentTrack + 1) % tracks.length;
  playTrack(currentTrack);
});

// Load tracks + shuffle upon load
fetch('./tracksCD1.json')
  .then(res => res.json())
  .then(data => {
    tracks = data.slice();
    shuffleArray(tracks);
    if (tracks.length > 0) playTrack(0);
  })
  .catch(err => console.error('Error loading tracksCD1.json:', err));


  const volumeSlider = document.getElementById('volumeSlider');

  // Volume start value
  audioPlayer.volume = volumeSlider.value / 100;
  
  // Volume slider config
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });

  const dropdown = document.querySelector(".dropdown");
  const toggle = document.querySelector(".dropdown-toggle");
  
  function toggleDropdown() {
      if (dropdown.style.display === "flex") {
          dropdown.style.display = "none";
          toggle.classList.remove("open");
      } else {
          dropdown.style.display = "flex";
          toggle.classList.add("open");
  
          // Dynamische positie rechts van player (optioneel)
          const player = document.querySelector(".musicplayer");
          const rect = player.getBoundingClientRect();
          const dropdownWidth = dropdown.offsetWidth;
          const viewportWidth = window.innerWidth;
  
          let leftPos = rect.right + 10; // 10px marge
          if (leftPos + dropdownWidth > viewportWidth) {
              leftPos = viewportWidth - dropdownWidth - 10; // past binnen scherm
          }
          dropdown.style.left = leftPos + "px";
          dropdown.style.top = rect.top + rect.height / 2 + "px";
          dropdown.style.transform = "translateY(-50%)";
      }
  }
  
  // Globale klik-handler om dropdown te sluiten als je buiten klikt
  document.addEventListener("click", function(event) {
      const isClickInsideDropdown = dropdown.contains(event.target);
      const isClickOnToggle = toggle.contains(event.target);
  
      if (!isClickInsideDropdown && !isClickOnToggle) {
          dropdown.style.display = "none";
          toggle.classList.remove("open");
      }
  });
  