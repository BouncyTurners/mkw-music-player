// ---------- ELEMENTEN ---------- //
const audioPlayer = document.getElementById('audioPlayer');
const titleEl = document.getElementById('title');
const gameEl = document.getElementById('game');
const artworkEl = document.getElementById('artwork');

const playBtn = document.getElementById('playBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const volumeSlider = document.getElementById('volumeSlider');

let cd1Tracks = [];
let cd2Tracks = [];
let tracks = [];
let currentTrack = 0;

// ---------- SHUFFLE FUNCTION ---------- //
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ---------- PLAY TRACK ---------- //
function playTrack(index) {
  if (!tracks.length) return;

  currentTrack = index;
  const track = tracks[index];

  // Audio
  audioPlayer.src = encodeURI(track.url);
  audioPlayer.play().catch(e => console.debug('audio.play() error:', e));

  // Metadata
  titleEl.textContent = track.title || '-';

  // Artwork resetten
  artworkEl.src = track.artwork || 'assets/player-img/cover.png';
  artworkEl.style.transform = '';
  artworkEl.style.filter = '';
  artworkEl.style.objectPosition = 'center center';

  // Game info
  if (track.game) {
    gameEl.textContent = track.game;
    gameEl.classList.remove('hidden');
    gameEl.style.visibility = 'visible';

    switch(track.game) {
      case "Mario Kart 64":
        artworkEl.style.objectPosition = "left center";
        break;
      default:
        artworkEl.style.objectPosition = "center center";
        break;
    }
  } else {
    gameEl.textContent = '';
    gameEl.style.visibility = 'hidden';
    gameEl.classList.add('hidden');
  }

  // Reset progress bar
  progressBar.style.width = '0%';
}

// ---------- PLAY NEXT TRACK ---------- //
function playNextTrack() {
  if (!tracks.length) return;
  currentTrack = (currentTrack + 1) % tracks.length;
  playTrack(currentTrack);
}

// ---------- SKIP FUNCTION ---------- //
function skipTrack() {
  playNextTrack();
}

// ---------- EVENT LISTENERS ---------- //
audioPlayer.addEventListener('ended', playNextTrack);
nextBtn.addEventListener('click', skipTrack);

// ---------- PLAY/PAUSE ---------- //
playBtn.addEventListener('click', () => {
  if(audioPlayer.paused) audioPlayer.play();
  else audioPlayer.pause();
});

// ---------- PROGRESS BAR & TIME ---------- //
audioPlayer.addEventListener('timeupdate', () => {
  const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
  progressBar.style.width = percent + '%';

  const current = isNaN(audioPlayer.currentTime) ? 0 : audioPlayer.currentTime;
  const total = isNaN(audioPlayer.duration) ? 0 : audioPlayer.duration;
  timeDisplay.textContent = `${formatTime(current)} / ${formatTime(total)}`;
});

// Helper: seconden naar m:ss
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ---------- VOLUME ---------- //
if (volumeSlider) {
  audioPlayer.volume = volumeSlider.value / 100;
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });
}

// ---------- DROPDOWN ---------- //
const dropdown = document.querySelector(".dropdown");
const toggle = document.querySelector(".dropdown-toggle");

function toggleDropdown(event) {
  if (event) event.stopPropagation();
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
    if (leftPos + dropdownWidth > viewportWidth) leftPos = viewportWidth - dropdownWidth - 10;

    dropdown.style.left = leftPos + "px";
    dropdown.style.top = rect.top + rect.height / 2 + "px";
    dropdown.style.transform = "translateY(-50%)";
  }
}
window.toggleDropdown = toggleDropdown;

document.addEventListener("click", (event) => {
  if (!dropdown || !toggle) return;
  if (!dropdown.contains(event.target) && !toggle.contains(event.target)) {
    dropdown.style.display = "none";
    toggle.classList.remove("open");
  }
});

// ---------- FILTER TRACKS OP BASIS VAN CHECKBOXES ----------
function updateTrackList() {
  const excludeCD1 = document.getElementById('excludeCD1').checked;
  const excludeCD2 = document.getElementById('excludeCD2').checked;

  tracks = [
    ...(!excludeCD1 ? cd1Tracks : []),
    ...(!excludeCD2 ? cd2Tracks : [])
  ];

  shuffleArray(tracks);

  if(tracks.length) playTrack(0);
}

// ---------- EVENT LISTENERS VOOR CHECKBOXES ----------
document.getElementById('excludeCD1').addEventListener('change', updateTrackList);
document.getElementById('excludeCD2').addEventListener('change', updateTrackList);

// ---------- LOAD TRACKS + SHUFFLE ---------- //
Promise.all([
  fetch('./tracksCD1.json').then(res => res.json()),
  fetch('./tracksCD2.json').then(res => res.json())
])
.then(([cd1Data, cd2Data]) => {
  cd1Tracks = Array.isArray(cd1Data) ? cd1Data.slice() : [];
  cd2Tracks = cd2Data.flatMap(game =>
    game.tracks.map(track => ({
      ...track,
      game: game.game,
      artwork: game.artwork
    }))
  );

  console.log('Loaded CD1:', cd1Tracks.length, 'CD2:', cd2Tracks.length);

  updateTrackList();
})
.catch(err => console.error('Error loading tracks:', err));
