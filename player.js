// player.js (met artwork transformaties per game)
const audioPlayer = document.getElementById('audioPlayer');
const titleEl = document.getElementById('title');
const composerEl = document.getElementById('composer');
const gameEl = document.getElementById('game');
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
  if (!tracks || tracks.length === 0) return;

  currentTrack = index;
  const track = tracks[index];

  console.log('Playing track', index, track && (track.title || track.game || track.url));

  // Audio
  audioPlayer.src = encodeURI(track.url);
  audioPlayer.play().catch(e => {
    console.debug('audio.play() error (likely autoplay):', e);
  });

  // Metadata
  titleEl.textContent = track.title || '-';
  composerEl.textContent = track.composer || '-';
  artworkEl.src = track.artwork || 'assets/player-img/cover.png';

  // Reset transform en filter
  artworkEl.style.transform = "";
  artworkEl.style.filter = "";

  // Game info
  if (track.game) {
    gameEl.textContent = track.game;
    gameEl.classList.remove('hidden');
    gameEl.style.visibility = 'visible';

    // 🎨 Artwork-transformaties per game
    let transformArr = [];
    let filterArr = [];

    switch(track.game) {
      case "Mario Kart 64":
        artworkEl.style.objectPosition = "left center"; // verschuift afbeelding naar links
        break;
      default:
        artworkEl.style.objectPosition = "center center"; // reset
        break;
    }

    // Combineer alles in één string
    artworkEl.style.transform = transformArr.join(" ");
    artworkEl.style.filter = filterArr.join(" ");

  } else {
    gameEl.textContent = '';
    gameEl.style.visibility = 'hidden';
    gameEl.classList.add('hidden');
  }
}


// ---------- Play next track ----------
function playNextTrack() {
  if (!tracks || tracks.length === 0) return;
  currentTrack = (currentTrack + 1) % tracks.length;
  playTrack(currentTrack);
}

// ---------- Auto next track after end ----------
audioPlayer.addEventListener('ended', playNextTrack);

// ---------- Skip knop ----------
function skipTrack() {
  playNextTrack();
}
skipBtn.addEventListener('click', skipTrack);
skipBtnMobile.addEventListener('click', skipTrack);

// ---------- Load tracks from both CDs + shuffle ----------
Promise.all([
  fetch('./tracksCD1.json').then(res => res.json()),
  fetch('./tracksCD2.json').then(res => res.json())
])
.then(([cd1Data, cd2Data]) => {
  const cd1Tracks = Array.isArray(cd1Data) ? cd1Data.slice() : [];

  const cd2Tracks = cd2Data.flatMap(game => 
    game.tracks.map(track => ({
      ...track,
      game: game.game,
      artwork: game.artwork
    }))
  );

  tracks = [...cd1Tracks, ...cd2Tracks];
  console.log('Loaded CD1:', cd1Tracks.length, 'CD2:', cd2Tracks.length, 'TOTAL:', tracks.length);

  shuffleArray(tracks);

  if (tracks.length > 0) playTrack(0);
})
.catch(err => {
  console.error('Error loading tracks:', err);
});

// ---------- Volume ----------
const volumeSlider = document.getElementById('volumeSlider');
if (volumeSlider) {
  audioPlayer.volume = volumeSlider.value / 100;
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });
}

// ---------- Dropdown ----------
const dropdown = document.querySelector(".dropdown");
const toggle = document.querySelector(".dropdown-toggle");

function toggleDropdown(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  if (!dropdown) return;

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
window.toggleDropdown = toggleDropdown;

document.addEventListener("click", function(event) {
  if (!dropdown || !toggle) return;
  const isClickInsideDropdown = dropdown.contains(event.target);
  const isClickOnToggle = toggle.contains(event.target);

  if (!isClickInsideDropdown && !isClickOnToggle) {
    dropdown.style.display = "none";
    toggle.classList.remove("open");
  }
});
