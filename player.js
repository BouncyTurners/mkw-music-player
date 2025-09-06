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
fetch('./tracks.json')
  .then(res => res.json())
  .then(data => {
    tracks = data.slice();
    shuffleArray(tracks);
    if (tracks.length > 0) playTrack(0);
  })
  .catch(err => console.error('Error loading tracks.json:', err));


  const volumeSlider = document.getElementById('volumeSlider');

  // Volume start value
  audioPlayer.volume = volumeSlider.value / 100;
  
  // Volume slider config
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });
