// ---------- ELEMENTS ----------
const audioPlayer = document.getElementById('audioPlayer');
const titleEl = document.getElementById('title');
const gameEl = document.getElementById('game');
const artworkEl = document.getElementById('artwork');

const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const volumeSlider = document.getElementById('volumeSlider');
const progressContainer = document.querySelector('.progress-container');

let cd1Tracks = [], cd2Tracks = [], cd3Tracks = [], cd4Tracks = [];
let tracks = [];
let shuffledTracks = [];
let currentTrack = 0;
let playInOrder = false;
let pendingUpdate = false;

// History voor vorige track
let history = [];

// ---------- SHUFFLE FUNCTION ----------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ---------- PLAY TRACK ----------
function playTrack(index, fromHistory = false) {
  if (!tracks.length) return;

  currentTrack = index;
  const track = tracks[index];

  audioPlayer.src = encodeURI(track.url);
  audioPlayer.currentTime = 0;
  audioPlayer.load();
  audioPlayer.play().catch(e => console.debug('audio.play() error:', e));

  // Alleen toevoegen aan history als dit GEEN vorige-track actie is
  if (!fromHistory) {
    history.push(index);
    if (!playInOrder) {
      shuffledTracks = shuffledTracks.filter(i => i !== index);
    }
  }

  // Update UI
  titleEl.textContent = track.title || '-';
  artworkEl.src = track.artwork || 'assets/player-img/cover.png';
  artworkEl.style.objectPosition = 'center center';
  gameEl.textContent = track.game || '';
  gameEl.style.visibility = track.game ? 'visible' : 'hidden';
  gameEl.classList.toggle('hidden', !track.game);
  progressBar.style.width = '0%';

  audioPlayer.addEventListener("loadedmetadata", () => {
    if (!isNaN(audioPlayer.duration)) {
      timeDisplay.textContent = `0:00 / ${formatTime(audioPlayer.duration)}`;
    }
  }, { once: true });

  // Media Session API
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown Track',
      artist: track.game || 'Mario Kart World',
      album: "Mario Kart World Radio",
      artwork: [
        { src: track.artwork || 'assets/player-img/cover.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
    navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
    navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
    navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
  }
}

// ---------- NEXT TRACK ----------
function playNextTrack() {
  if (!tracks.length) return;

  if (pendingUpdate) {
    updateTrackList(true);
    pendingUpdate = false;
  }

  if (playInOrder) {
    currentTrack = (currentTrack + 1) % tracks.length;
    playTrack(currentTrack);
  } else {
    if (!shuffledTracks.length) {
      shuffledTracks = [...tracks.keys()].filter(i => i !== currentTrack);
      shuffleArray(shuffledTracks);
    }
    const nextIndex = shuffledTracks.shift();
    playTrack(nextIndex);
  }
}

function skipTrack() {
  playNextTrack();
}

// ---------- PREVIOUS TRACK ----------
function playPreviousTrack() {
  if (!tracks.length) return;

  if (audioPlayer.currentTime > 3) {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    return;
  }

  if (history.length > 1) {
    history.pop();
    const prevIndex = history[history.length - 1];
    playTrack(prevIndex, true);
  } else {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  }
}

// ---------- EVENT LISTENERS ----------
audioPlayer.addEventListener('ended', playNextTrack);
nextBtn.addEventListener('click', skipTrack);
prevBtn.addEventListener('click', playPreviousTrack);
playBtn.addEventListener('click', () => {
  if (audioPlayer.paused) audioPlayer.play();
  else audioPlayer.pause();
});

audioPlayer.addEventListener('timeupdate', () => {
  const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
  progressBar.style.width = percent + '%';
  const current = isNaN(audioPlayer.currentTime) ? 0 : audioPlayer.currentTime;
  const total = isNaN(audioPlayer.duration) ? 0 : audioPlayer.duration;
  timeDisplay.textContent = `${formatTime(current)} / ${formatTime(total)}`;
});

if (progressContainer) {
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const newTime = percent * audioPlayer.duration;
    if (!isNaN(newTime)) {
      if (percent >= 0.99) playNextTrack();
      else audioPlayer.currentTime = newTime;
    }
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

if (volumeSlider) {
  audioPlayer.volume = volumeSlider.value / 100;
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });
}

// ---------- DROPDOWN ----------
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
    let leftPos = rect.right + 10;
    if (leftPos + dropdown.offsetWidth > window.innerWidth) {
      leftPos = window.innerWidth - dropdown.offsetWidth - 10;
    }
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

// ---------- UPDATE TRACK LIST ----------
function updateTrackList(keepCurrent = false) {
  const excludeCD1 = document.getElementById('excludeCD1').checked;
  const excludeCD2 = document.getElementById('excludeCD2').checked;
  const excludeCD3 = document.getElementById('excludeCD3').checked;
  const excludeCD4 = document.getElementById('excludeCD4').checked;
  playInOrder = document.getElementById('playInOrder').checked;

  tracks = [];
  if (!excludeCD1) tracks.push(...(playInOrder ? cd1Tracks.sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : [...cd1Tracks]));
  if (!excludeCD2) tracks.push(...(playInOrder ? cd2Tracks.sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : [...cd2Tracks]));
  if (!excludeCD3) tracks.push(...(playInOrder ? cd3Tracks.sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : [...cd3Tracks]));
  if (!excludeCD4) tracks.push(...(playInOrder ? cd4Tracks.sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : [...cd4Tracks]));

  if (!playInOrder) {
    shuffledTracks = [...tracks.keys()].filter(i => i !== currentTrack);
    shuffleArray(shuffledTracks);

    if (keepCurrent && currentTrack < tracks.length) {
      shuffledTracks = shuffledTracks.filter(i => i !== currentTrack);
      shuffledTracks.unshift(currentTrack);
    }
  }

  // Start track als nog niet geladen
  if (!audioPlayer.src && tracks.length) {
    if (playInOrder) {
      currentTrack = 0;
    } else {
      currentTrack = Math.floor(Math.random() * tracks.length);
    }
    playTrack(currentTrack);
  }
}

// ---------- CHECKBOX EVENTS ----------
['excludeCD1','excludeCD2','excludeCD3','excludeCD4','playInOrder'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', () => {
    pendingUpdate = true;
  });
});

// ---------- LOAD TRACKS ----------
Promise.all([
  fetch('./tracksCD1.json').then(res => res.json()),
  fetch('./tracksCD2.json').then(res => res.json()),
  fetch('./tracksCD3.json').then(res => res.json()),
  fetch('./tracksCD4.json').then(res => res.json())
])
.then(([cd1Data, cd2Data, cd3Data, cd4Data]) => {
  cd1Tracks = Array.isArray(cd1Data) ? cd1Data.slice() : [];
  cd2Tracks = cd2Data.flatMap(game => game.tracks.map(track => ({...track, game: game.game, artwork: game.artwork})));
  cd3Tracks = cd3Data.games.flatMap(game => game.tracks.map(track => ({...track, game: game.game, artwork: game.artwork})));
  cd4Tracks = Array.isArray(cd4Data) ? cd4Data.slice() : [];

  console.log('Loaded CD1:', cd1Tracks.length, 'CD2:', cd2Tracks.length, 'CD3:', cd3Tracks.length, 'CD4:', cd4Tracks.length);

  updateTrackList();
})
.catch(err => console.error('Error loading tracks:', err));
