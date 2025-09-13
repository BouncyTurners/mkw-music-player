// ---------- ELEMENTEN ----------
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
const tracklistContainer = document.getElementById('tracklist');

let cd1Tracks = [], cd2Tracks = [], cd3Tracks = [], cd4Tracks = [];
let tracks = [], currentTrack = 0;
let playInOrder = false, pendingUpdate = false;
let excludedTracks = new Set(), history = [], historyPointer = -1;

// ---------- SHUFFLE POOL ----------
let shufflePool = []; // Tracks nog niet gespeeld in de huidige shuffle-ronde

// ---------- HELPERS ----------
const shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
};

const formatTime = seconds => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// ---------- UPDATE ACTIVE TRACK ----------
const updateActiveTrack = () => {
    if (!tracklistContainer) return;
    tracklistContainer.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    const track = tracks[currentTrack];
    if (!track) return;
    const li = Array.from(tracklistContainer.querySelectorAll('li')).find(li => li.dataset.url === track.url);
    if (li) li.classList.add('active');
};

// ---------- PLAY TRACK ----------
function playTrack(index, fromHistory = false) {
    if (!tracks.length || index == null || index < 0 || index >= tracks.length) return;
    currentTrack = index;
    const track = tracks[index];
    audioPlayer.src = encodeURI(track.url);
    audioPlayer.currentTime = 0;
    audioPlayer.load();
    audioPlayer.play().catch(() => {});

    // History
    if (!fromHistory) {
        if (historyPointer < history.length - 1) history = history.slice(0, historyPointer + 1);
        history.push(index);
        historyPointer = history.length - 1;
        if (!playInOrder) shufflePool = shufflePool.filter(i => i !== index);
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
        if (!isNaN(audioPlayer.duration)) timeDisplay.textContent = `0:00 / ${formatTime(audioPlayer.duration)}`;
    }, { once: true });

    // Media Session
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Unknown Track',
            artist: track.game || 'Mario Kart World',
            album: "Mario Kart World Radio",
            artwork: [{ src: track.artwork || 'assets/player-img/cover.png', sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => audioPlayer.play());
        navigator.mediaSession.setActionHandler('pause', () => audioPlayer.pause());
        navigator.mediaSession.setActionHandler('previoustrack', playPreviousTrack);
        navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    }

    updateActiveTrack();
}

// ---------- SHUFFLE HELP ----------
function getNextShuffleTrack() {
    if (!shufflePool.length) {
        shufflePool = tracks
            .map((t,i)=>i)
            .filter(i => !excludedTracks.has(tracks[i].url));
        shuffleArray(shufflePool);
    }
    return shufflePool.shift();
}

// ---------- NEXT / PREVIOUS TRACK ----------
function playNextTrack() {
    if (!tracks.length) return;
    if (pendingUpdate) { updateTrackList(true); pendingUpdate = false; }

    if (historyPointer < history.length - 1) {
        historyPointer++;
        playTrack(history[historyPointer], true);
        return;
    }

    if (playInOrder) {
        let nextIndex = currentTrack + 1;
        while (excludedTracks.has(tracks[nextIndex]?.url)) nextIndex++;
        if (nextIndex >= tracks.length) nextIndex = 0;
        playTrack(nextIndex);
    } else {
        const nextIndex = getNextShuffleTrack();
        playTrack(nextIndex);
    }
}

function playPreviousTrack() {
    if (!tracks.length) return;
    if (audioPlayer.currentTime > 3) { audioPlayer.currentTime = 0; audioPlayer.play(); return; }
    if (historyPointer > 0) { historyPointer--; playTrack(history[historyPointer], true); }
    else { audioPlayer.currentTime = 0; audioPlayer.play(); }
}

// ---------- EVENT LISTENERS ----------
audioPlayer.addEventListener('ended', playNextTrack);
nextBtn.addEventListener('click', playNextTrack);
prevBtn.addEventListener('click', playPreviousTrack);

const playIcon = playBtn.querySelector('i');
const updatePlayButtonIcon = () => {
    playIcon.classList.toggle('fa-play', audioPlayer.paused);
    playIcon.classList.toggle('fa-pause', !audioPlayer.paused);
};
playBtn.addEventListener('click', () => { audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause(); updatePlayButtonIcon(); });
audioPlayer.addEventListener('play', updatePlayButtonIcon);
audioPlayer.addEventListener('pause', updatePlayButtonIcon);
audioPlayer.addEventListener('loadedmetadata', updatePlayButtonIcon);

audioPlayer.addEventListener('timeupdate', () => {
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
    progressBar.style.width = percent + '%';
    const current = isNaN(audioPlayer.currentTime) ? 0 : audioPlayer.currentTime;
    const total = isNaN(audioPlayer.duration) ? 0 : audioPlayer.duration;
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(total)}`;
});

if (volumeSlider) {
    audioPlayer.volume = volumeSlider.value / 100;
    volumeSlider.addEventListener('input', () => audioPlayer.volume = volumeSlider.value / 100);
}

// ---------- UPDATE TRACK LIST ----------
function updateTrackList(keepCurrent = false) {
    const excludeCD1 = document.getElementById('excludeCD1')?.checked;
    const excludeCD2 = document.getElementById('excludeCD2')?.checked;
    const excludeCD3 = document.getElementById('excludeCD3')?.checked;
    const excludeCD4 = document.getElementById('excludeCD4')?.checked;
    playInOrder = document.getElementById('playInOrder')?.checked;

    const currentTrackObj = tracks[currentTrack];
    const newTracks = [];

    if (!excludeCD1) newTracks.push(...cd1Tracks.filter(t => !excludedTracks.has(t.url)));
    if (!excludeCD2) newTracks.push(...cd2Tracks.filter(t => !excludedTracks.has(t.url)));
    if (!excludeCD3) newTracks.push(...cd3Tracks.filter(t => !excludedTracks.has(t.url)));
    if (!excludeCD4) newTracks.push(...cd4Tracks.filter(t => !excludedTracks.has(t.url)));

    tracks = newTracks;

    if (keepCurrent && currentTrackObj) {
        const newIndex = tracks.findIndex(t => t.url === currentTrackObj.url);
        currentTrack = newIndex !== -1 ? newIndex : 0;
        if (!audioPlayer.src && tracks.length) playTrack(currentTrack);
    } else {
        if (!audioPlayer.src && tracks.length) playTrack(playInOrder ? 0 : Math.floor(Math.random() * tracks.length));
        else if (currentTrack >= tracks.length) currentTrack = tracks.length ? tracks.length - 1 : 0;
    }

    shufflePool = !playInOrder
        ? tracks.map((t,i)=>i).filter(i => i !== currentTrack && !excludedTracks.has(tracks[i].url))
        : [];

    shuffleArray(shufflePool);

    renderTracklist();
    updateActiveTrack();
}

// ---------- LOAD TRACKS ----------
Promise.all([
    fetch('./tracksCD1.json').then(res => res.json()),
    fetch('./tracksCD2.json').then(res => res.json()),
    fetch('./tracksCD3.json').then(res => res.json()),
    fetch('./tracksCD4.json').then(res => res.json())
]).then(([cd1Data, cd2Data, cd3Data, cd4Data]) => {
    const normalizeTracks = (tracks, nested = false) => {
        if (!Array.isArray(tracks)) return [];
        if (nested) {
            return tracks.flatMap(game => game.tracks.map(track => ({
                ...track,
                trackNumber: Number(track.trackNumber) || 0,
                game: game.game,
                artwork: game.artwork
            })));
        }
        return tracks.map(track => ({ ...track, trackNumber: Number(track.trackNumber) || 0 }));
    };

    cd1Tracks = normalizeTracks(cd1Data);
    cd2Tracks = normalizeTracks(cd2Data, true);
    cd3Tracks = normalizeTracks(cd3Data.games, true);
    cd4Tracks = normalizeTracks(cd4Data);

    // Sorteer op trackNumber
    cd1Tracks.sort((a,b)=>a.trackNumber-b.trackNumber);
    cd2Tracks.sort((a,b)=>a.trackNumber-b.trackNumber);
    cd3Tracks.sort((a,b)=>a.trackNumber-b.trackNumber);
    cd4Tracks.sort((a,b)=>a.trackNumber-b.trackNumber);

    updateTrackList();
}).catch(err => console.error('Error loading tracks:', err));

// ---------- RENDER TRACKLIST ----------
function renderTracklist() {
    if (!tracklistContainer) return;

    // Onthoud welke CD-lijsten open waren
    const openCDs = Array.from(tracklistContainer.querySelectorAll('.cd-tracks.open'))
        .map(ul => ul.closest('.cd-category').querySelector('.cd-btn').textContent);

    // Leeg de container
    tracklistContainer.innerHTML = '';

    const cds = [
        { name: 'CD1 - Grand Prix / Battle Tracks', tracks: cd1Tracks },
        { name: 'CD2 - Mario Kart Series Free Roam', tracks: cd2Tracks },
        { name: 'CD3 - Super Mario Series Free Roam', tracks: cd3Tracks },
        { name: 'CD4 - Miscellaneous Songs', tracks: cd4Tracks }
    ];

    cds.forEach(cd => {
        // Maak CD-category container
        const cdDiv = document.createElement('div');
        cdDiv.classList.add('cd-category');

        // Maak CD-knop
        const cdBtn = document.createElement('button');
        cdBtn.classList.add('cd-btn');
        cdBtn.textContent = cd.name;
        cdDiv.appendChild(cdBtn);

        // Maak UL voor tracks
        const cdTracksUl = document.createElement('ul');
        cdTracksUl.classList.add('cd-tracks');
        if (openCDs.includes(cd.name)) cdTracksUl.classList.add('open');
        cdDiv.appendChild(cdTracksUl);

        // Voeg tracks toe
        const sortedTracks = cd.tracks.slice().sort((a,b) => a.trackNumber-b.trackNumber);
        sortedTracks.forEach(track => {
            const li = document.createElement('li');
            li.dataset.url = track.url;

            const trackText = document.createElement('span');
            trackText.classList.add('track-text');
            trackText.textContent = `${String(track.trackNumber).padStart(2,'0')} - ${track.title}${cd.name.includes('Free Roam') ? ` [${track.game||''}]` : ''}`;

            const excludeBtn = document.createElement('span');
            excludeBtn.classList.add('exclude-btn');
            excludeBtn.textContent = excludedTracks.has(track.url) ? '+' : '-';
            li.classList.toggle('excluded', excludedTracks.has(track.url));

            li.appendChild(trackText);
            li.appendChild(excludeBtn);
            cdTracksUl.appendChild(li);
        });

        // Klik-handler voor CD-knop
        cdBtn.addEventListener('click', () => {
            const isOpen = cdTracksUl.classList.contains('open');

            // Sluit andere CD-lijsten
            document.querySelectorAll('.cd-tracks').forEach(ul => {
                if (ul !== cdTracksUl) ul.classList.remove('open');
            });

            // Open/Sluit deze lijst
            cdTracksUl.classList.toggle('open');

            // Flash animatie
            cdBtn.classList.add('flash');
            setTimeout(() => cdBtn.classList.remove('flash'), 200);

            // Update highlight
            document.querySelectorAll('.cd-btn').forEach(otherBtn => {
                otherBtn.classList.remove('highlight');
            });
            if (!isOpen) cdBtn.classList.add('highlight');
        });

        tracklistContainer.appendChild(cdDiv);
    });

    // Update active track
    updateActiveTrack();
}


// ---------- TRACKLIST CLICK ----------
tracklistContainer.addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    const url = li.dataset.url;
    if (e.target.classList.contains('exclude-btn')) {
        excludedTracks.has(url) ? excludedTracks.delete(url) : excludedTracks.add(url);
        if (tracks[currentTrack]?.url === url) playNextTrack();
        updateTrackList(true);
        return;
    }
    const index = tracks.findIndex(t=>t.url===url); if(index!==-1) playTrack(index);
});

// ---------- CHECKBOXES ----------
['excludeCD1','excludeCD2','excludeCD3','excludeCD4'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>pendingUpdate=true));
document.getElementById('playInOrder')?.addEventListener('change',()=>updateTrackList(true));

// ---------- DROPDOWN ----------
const dropdown = document.querySelector(".dropdown"), toggle = document.querySelector(".dropdown-toggle");
function toggleDropdown(event){event?.stopPropagation();if(!dropdown)return;if(dropdown.style.display==="flex"){dropdown.style.display="none";toggle.classList.remove("open");}else{dropdown.style.display="flex";toggle.classList.add("open");const rect=document.querySelector(".musicplayer").getBoundingClientRect();let left=rect.right+10;if(left+dropdown.offsetWidth>window.innerWidth)left=window.innerWidth-dropdown.offsetWidth-10;dropdown.style.left=left+"px";dropdown.style.top=rect.top+rect.height/2+"px";dropdown.style.transform="translateY(-50%)";}}
window.toggleDropdown=toggleDropdown;
document.addEventListener("click",e=>{if(!dropdown||!toggle)return;if(!dropdown.contains(e.target)&&!toggle.contains(e.target)){dropdown.style.display="none";toggle.classList.remove("open");}});

// ---------- PROGRESS BAR & SCRUB ----------
const progressContainer = document.querySelector('.progress-container');
if(progressContainer){
    let isDragging=false, dragTime=0;
    const seek=x=>{const rect=progressContainer.getBoundingClientRect();let clickX=x-rect.left;clickX=Math.max(0,Math.min(clickX,rect.width));return (clickX/rect.width)*audioPlayer.duration;};
    const updateProgressBarUI=time=>{const percent=(time/audioPlayer.duration)*100||0;progressBar.style.width=percent+'%';timeDisplay.textContent=`${formatTime(time)} / ${formatTime(audioPlayer.duration)}`;};
    progressContainer.addEventListener('mousedown',e=>{if(!audioPlayer.duration)return;isDragging=true;dragTime=seek(e.clientX);updateProgressBarUI(dragTime);});
    window.addEventListener('mousemove',e=>{if(isDragging){dragTime=seek(e.clientX);updateProgressBarUI(dragTime);}});
    window.addEventListener('mouseup',()=>{if(isDragging){audioPlayer.currentTime=dragTime;isDragging=false;}});
    progressContainer.addEventListener('touchstart',e=>{if(!audioPlayer.duration)return;isDragging=true;dragTime=seek(e.touches[0].clientX);updateProgressBarUI(dragTime);e.preventDefault();},{passive:false});
    window.addEventListener('touchmove',e=>{if(isDragging){dragTime=seek(e.touches[0].clientX);updateProgressBarUI(dragTime);e.preventDefault();}},{passive:false});
    window.addEventListener('touchend',()=>{if(isDragging){audioPlayer.currentTime=dragTime;isDragging=false;}});
    progressContainer.addEventListener('click',e=>{const x=e.clientX||e.touches?.[0]?.clientX;if(x!=null&&audioPlayer.duration){audioPlayer.currentTime=seek(x);}});
    audioPlayer.addEventListener('timeupdate',()=>updateProgressBarUI(isDragging?dragTime:audioPlayer.currentTime));
}

const controlButtons = document.querySelectorAll('.controls button');

controlButtons.forEach(button => {
    // Tap animatie
    button.addEventListener('touchstart', () => {
        button.style.transform = 'scale(1.05)';
        button.style.transition = 'transform 0.1s ease-in-out, background-color 0.1s ease-in-out';
    });

    button.addEventListener('touchend', () => {
        button.style.transform = 'scale(1)';
        // Forceer dat hover/focus state verdwijnt
        button.blur();
    });

    // Optioneel: verwijder hover class als die ooit sticky blijft
    button.addEventListener('touchcancel', () => {
        button.style.transform = 'scale(1)';
        button.blur();
    });
});