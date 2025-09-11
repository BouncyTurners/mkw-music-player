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

const tracklistContainer = document.getElementById('tracklist');

// ---------- TRACK DATA ----------
let cd1Tracks = [], cd2Tracks = [], cd3Tracks = [], cd4Tracks = [];
let tracks = [];                // huidige samengestelde lijst (na filters/sort)
let shuffledTracks = [];        // indexlijst voor shuffle-mode
let currentTrack = 0;           // index in `tracks` van huidig geladen nummer
let playInOrder = false;
let pendingUpdate = false;      // gebruikt voor excludeCD checkboxes (defer until next track)

// ---------- HISTORY SYSTEM ----------
let history = [];
let historyPointer = -1; // positie in de geschiedenis bij prev/next

// ---------- HELPERS ----------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateActiveTrack() {
  if (!tracklistContainer) return;
  const allTrackItems = tracklistContainer.querySelectorAll('li');
  allTrackItems.forEach(li => li.classList.remove('active'));

  const track = tracks[currentTrack];
  if (!track) return;

  const currentLi = Array.from(allTrackItems).find(li => {
    const parentCD = li.closest('.cd-category').querySelector('.cd-btn').textContent;
    if (parentCD === 'CD1 - Grand Prix / Battle Tracks' || parentCD === 'CD4 - Miscellaneous Songs') {
      return li.textContent === `${track.trackNumber} - ${track.title}`;
    } else {
      return li.textContent === `${track.trackNumber} - ${track.title} [${track.game || ''}]`;
    }
  });

  if (currentLi) currentLi.classList.add('active');
}

// ---------- PLAY TRACK ----------
function playTrack(index, fromHistory = false) {
  if (!tracks.length || index == null || index < 0 || index >= tracks.length) return;

  currentTrack = index;
  const track = tracks[index];

  // Laad en start het nummer (dit reset currentTime en laadt de source)
  audioPlayer.src = encodeURI(track.url);
  audioPlayer.currentTime = 0;
  audioPlayer.load();
  audioPlayer.play().catch(e => console.debug('audio.play() error:', e));

  // History
  if (!fromHistory) {
    if (historyPointer < history.length - 1) history = history.slice(0, historyPointer + 1);
    history.push(index);
    historyPointer = history.length - 1;

    // verwijder uit shuffledTracks zodat we 'm niet meteen opnieuw krijgen
    if (!playInOrder) {
      shuffledTracks = shuffledTracks.filter(i => i !== index);
    }
  }

  // UI update
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

  // Media session
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

  updateActiveTrack();
}

// ---------- NEXT TRACK ----------
function playNextTrack() {
  if (!tracks.length) return;

  // Als er een pending update is (vb. excludeCD is veranderd), verwerk 'm nu voordat we next bepalen.
  if (pendingUpdate) {
    // keepCurrent = true zodat huidig nummer niet opnieuw gestart wordt
    updateTrackList(true);
    pendingUpdate = false;
  }

  // History forward
  if (historyPointer < history.length - 1) {
    historyPointer++;
    playTrack(history[historyPointer], true);
    return;
  }

  // Bepaal volgende afhankelijk van modus
  if (playInOrder) {
    const nextIndex = (currentTrack + 1) % tracks.length;
    playTrack(nextIndex);
  } else {
    // Shuffle-mode: zorg dat shuffledTracks klaar is
    if (!shuffledTracks.length) {
      shuffledTracks = [...tracks.keys()].filter(i => i !== currentTrack);
      shuffleArray(shuffledTracks);
    }
    const nextIndex = shuffledTracks.shift();
    // fallback: als undefined, val terug op next in order
    if (nextIndex == null) {
      const nextIndexOrder = (currentTrack + 1) % tracks.length;
      playTrack(nextIndexOrder);
    } else {
      playTrack(nextIndex);
    }
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

  if (historyPointer > 0) {
    historyPointer--;
    playTrack(history[historyPointer], true);
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

if (progressContainer) {
  let isDragging = false;
  let dragTime = 0;

  const seek = (x) => {
    const rect = progressContainer.getBoundingClientRect();
    let clickX = x - rect.left;
    clickX = Math.max(0, Math.min(clickX, rect.width));
    return (clickX / rect.width) * audioPlayer.duration;
  };

  const updateProgressBar = (time) => {
    const percent = (time / audioPlayer.duration) * 100 || 0;
    progressBar.style.width = percent + '%';
    timeDisplay.textContent = `${formatTime(time)} / ${formatTime(audioPlayer.duration)}`;
  };

  // DESKTOP
  progressContainer.addEventListener('mousedown', (e) => {
    if (!audioPlayer.duration) return;
    isDragging = true;
    dragTime = seek(e.clientX);
    updateProgressBar(dragTime);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      dragTime = seek(e.clientX);
      updateProgressBar(dragTime);
    }
  });
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      audioPlayer.currentTime = dragTime;
      isDragging = false;
    }
  });

  // TOUCH (MOBIEL)
  progressContainer.addEventListener('touchstart', (e) => {
    if (!audioPlayer.duration) return;
    isDragging = true;
    dragTime = seek(e.touches[0].clientX);
    updateProgressBar(dragTime);
    e.preventDefault(); // voorkomt scrollen
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isDragging) {
      dragTime = seek(e.touches[0].clientX);
      updateProgressBar(dragTime);
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (isDragging) {
      audioPlayer.currentTime = dragTime;
      isDragging = false;
    }
  });

  // CLICK (zowel mobiel als desktop)
  progressContainer.addEventListener('click', (e) => {
    const x = e.clientX || e.touches?.[0]?.clientX;
    if (x != null) {
      audioPlayer.currentTime = seek(x);
    }
  });

  audioPlayer.addEventListener('timeupdate', () => {
    if (!isDragging) {
      updateProgressBar(audioPlayer.currentTime);
    } else {
      updateProgressBar(dragTime);
    }
  });
}



if (volumeSlider) {
  audioPlayer.volume = volumeSlider.value / 100;
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });
}

// ---------- UPDATE TRACK LIST ----------
// THIS function is important: als keepCurrent = true, veranderen we de tracks-lijst
// maar we herstarten of herladen het huidige nummer niet; we mappen het oude track object
// naar zijn nieuwe index in de vernieuwde `tracks` array.
function updateTrackList(keepCurrent = false) {
  // Lees huidige checkboxstate (playInOrder/ exclude)
  const excludeCD1 = document.getElementById('excludeCD1').checked;
  const excludeCD2 = document.getElementById('excludeCD2').checked;
  const excludeCD3 = document.getElementById('excludeCD3').checked;
  const excludeCD4 = document.getElementById('excludeCD4').checked;
  playInOrder = document.getElementById('playInOrder').checked;

  // Bewaar referentie naar huidig track-object (als die geladen is)
  const currentTrackObj = tracks[currentTrack];

  // Bouw nieuwe tracks-lijst volgens playInOrder en excludes
  const newTracks = [];
  if (!excludeCD1) newTracks.push(...(playInOrder ? cd1Tracks.slice().sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : cd1Tracks.slice()));
  if (!excludeCD2) newTracks.push(...(playInOrder ? cd2Tracks.slice().sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : cd2Tracks.slice()));
  if (!excludeCD3) newTracks.push(...(playInOrder ? cd3Tracks.slice().sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : cd3Tracks.slice()));
  if (!excludeCD4) newTracks.push(...(playInOrder ? cd4Tracks.slice().sort((a,b)=> (a.trackNumber||0)-(b.trackNumber||0)) : cd4Tracks.slice()));

  // Vervang de globale tracks-reference
  tracks = newTracks;

  // Als we keepCurrent willen, probeer de oude track te vinden in de nieuwe lijst
  if (keepCurrent && currentTrackObj) {
    const newIndex = tracks.findIndex(t => t.url === currentTrackObj.url);
    if (newIndex !== -1) {
      // We verplaatsen currentTrack naar de juiste index, MAAR we laden NIET opnieuw de audio-source.
      currentTrack = newIndex;
    } else {
      // Huidig nummer bestaat niet meer in nieuwe lijst (bijv. uitgefilterd) -> wijs fallback toe
      currentTrack = tracks.length ? 0 : 0;
      // Als er geen audio geladen is (audioPlayer.src leeg) en we hebben tracks, laad eerste track
      if (!audioPlayer.src && tracks.length) {
        playTrack(currentTrack);
      }
    }
  } else {
    // Geen keepCurrent: als er nog geen audio geladen is, start een passend nummer
    if (!audioPlayer.src && tracks.length) {
      currentTrack = playInOrder ? 0 : Math.floor(Math.random() * tracks.length);
      playTrack(currentTrack);
    } else {
      // Zorg dat currentTrack nog binnen bounds valt
      if (currentTrack >= tracks.length) currentTrack = tracks.length ? tracks.length - 1 : 0;
    }
  }

  // Rebuild shuffledTracks indien we in shuffle-modus zitten
  if (!playInOrder) {
    // Maak indexlijst zonder currentTrack
    shuffledTracks = [...tracks.keys()].filter(i => i !== currentTrack);
    shuffleArray(shuffledTracks);

    // Als keepCurrent, we kunnen currentTrack vooraan zetten zodat next() nooit direct een ander nummer pakt als je het zo wilt.
    // Maar we WONEN normaal dat current blijft spelen en next() de volgende uit shuffledTracks pakt.
    // Hier hoeven we niets extra te doen: shuffledTracks bevat geen currentTrack, dus volgende is een random ander nummer.
  } else {
    // In order mode: clear shuffledTracks
    shuffledTracks = [];
  }

  renderTracklist();
  updateActiveTrack();
}

// ---------- CHECKBOX EVENTS ----------
// Voor excludeCDs willen we dit pas bij de volgende trackwisseling toepassen (zoals vroeger): pendingUpdate = true
['excludeCD1','excludeCD2','excludeCD3','excludeCD4'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', () => {
    pendingUpdate = true;
  });
});

// Voor playInOrder willen we DIRECT het effect: de huidige track moet blijven spelen (niet opnieuw starten)
// en de *volgende* track moet meteen volgens order komen. Daarom callen we updateTrackList(true).
const playInOrderEl = document.getElementById('playInOrder');
if (playInOrderEl) {
  playInOrderEl.addEventListener('change', () => {
    // playInOrder wordt in updateTrackList gelezen, maar we kunnen hem alvast bijwerken
    playInOrder = playInOrderEl.checked;
    // keep current (dus geen herstart), maar bouw de nieuwe tracks en shuffledTracks zodanig dat next() de juiste volgt
    updateTrackList(true);
  });
}

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

  updateTrackList(); // init
})
.catch(err => console.error('Error loading tracks:', err));

function renderTracklist() {
  if (!tracklistContainer) return;

  // 1️⃣ Onthoud welke CD's open waren
  const openCDs = Array.from(tracklistContainer.querySelectorAll('.cd-tracks.open'))
                        .map(ul => ul.closest('.cd-category').querySelector('.cd-btn').textContent);

  tracklistContainer.innerHTML = '';

  const cds = [
    { name: 'CD1 - Grand Prix / Battle Tracks', tracks: cd1Tracks },
    { name: 'CD2 - Mario Kart Series Free Roam', tracks: cd2Tracks },
    { name: 'CD3 - Super Mario Series Free Roam', tracks: cd3Tracks },
    { name: 'CD4 - Miscellaneous Songs', tracks: cd4Tracks }
  ];

  cds.forEach((cd) => {
    const sortedTracks = cd.tracks.slice().sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

    const cdDiv = document.createElement('div');
    cdDiv.classList.add('cd-category');

    const cdBtn = document.createElement('button');
    cdBtn.classList.add('cd-btn');
    cdBtn.textContent = cd.name;

    const cdTracksUl = document.createElement('ul');
    cdTracksUl.classList.add('cd-tracks');

    // 2️⃣ Zet open-state terug als het CD open was
    if (openCDs.includes(cd.name)) {
      cdTracksUl.classList.add('open');
    }

    cdBtn.addEventListener('click', () => {
      cdTracksUl.classList.toggle('open');
    });

    sortedTracks.forEach((track) => {
      const li = document.createElement('li');
      if (cd.name === 'CD1 - Grand Prix / Battle Tracks' || cd.name === 'CD4 - Miscellaneous Songs') {
        li.textContent = `${track.trackNumber} - ${track.title}`;
      } else {
        li.textContent = `${track.trackNumber} - ${track.title} [${track.game || ''}]`;
      }

      li.addEventListener('click', () => {
        const globalIndex = tracks.findIndex(t => t.url === track.url);
        if (globalIndex !== -1) playTrack(globalIndex);
      });
      cdTracksUl.appendChild(li);
    });

    cdDiv.appendChild(cdBtn);
    cdDiv.appendChild(cdTracksUl);
    tracklistContainer.appendChild(cdDiv);
  });

  updateActiveTrack();
}


// ---------- OVERRIDE updateTrackList (was in jouw versie) ----------
const originalUpdateTrackList = updateTrackList;
updateTrackList = function(keepCurrent = false) {
  originalUpdateTrackList(keepCurrent);
  // renderTracklist & updateActiveTrack already in originalUpdateTrackList
};

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