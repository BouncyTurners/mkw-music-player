const audioPlayer = document.getElementById('audioPlayer');
const titleEl = document.getElementById('title');
const composerEl = document.getElementById('composer');

let tracks = [];
let currentTrack = 0;

// Shuffle functie
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Track afspelen en metadata tonen
function playTrack(index) {
  currentTrack = index;
  const track = tracks[index];
  audioPlayer.src = track.url;
  audioPlayer.play();

  // Metadata tonen
  titleEl.textContent = track.title || '-';
  composerEl.textContent = track.composer || '-';
}

// Autoplay next track
audioPlayer.addEventListener('ended', () => {
  currentTrack = (currentTrack + 1) % tracks.length;
  playTrack(currentTrack);
});

// Tracks laden vanuit JSON en meteen shufflen
fetch('./tracks.json')
  .then(res => res.json())
  .then(data => {
    tracks = data;
    shuffleArray(tracks);  // altijd shufflen bij load
    if (tracks.length > 0) playTrack(0);
  })
  .catch(err => console.error('Error loading tracks.json:', err));