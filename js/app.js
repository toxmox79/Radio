// --- State & Config ---
const state = {
    currentPage: 'player', // player, stations, frequencies, favorites, settings
    currentStationIndex: 0,
    currentGenre: 'Alle',
    favorites: []
};

// --- DOM Elements ---
const stationNameEl = document.getElementById('stationName');
const stationGenreEl = document.getElementById('stationGenre');
const coverArtEl = document.getElementById('coverArt');
const playBtn = document.getElementById('playBtn');
const playIcon = playBtn.querySelector('i');
const trackTitleEl = document.getElementById('trackTitle');
const trackArtistEl = document.getElementById('trackArtist');

// --- Audio Objects ---
const radioPlayer = new RadioPlayer();
const freqGen = new FrequencyGenerator();
const favDB = new FavoritesDB();

// --- Initialization ---
function init() {
    console.log("Initializing App...");
    loadFavorites();
    renderGenreFilters();
    renderStationList();
    renderPodcastList();
    renderFrequencyList();

    loadStation(state.currentStationIndex, false);

    setupEventListeners();
    setupPlayerEvents();
    
    // Set initial theme
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark', darkMode);
    document.getElementById('darkModeToggle').checked = darkMode;

    // Interaction check for AudioContext
    const resumeAudio = () => {
        console.log("User interaction detected, resuming audio context if needed.");
        if (freqGen.audioCtx && freqGen.audioCtx.state === 'suspended') {
            freqGen.audioCtx.resume();
        }
        if (radioPlayer.audioCtx && radioPlayer.audioCtx.state === 'suspended') {
            radioPlayer.audioCtx.resume();
        }
    };
    document.body.addEventListener('click', resumeAudio, { once: true });
    document.body.addEventListener('touchstart', resumeAudio, { once: true });
}

// --- Navigation Logic ---
function navigateTo(page) {
    if (!page) return;
    console.log("Navigating to:", page);

    state.currentPage = page;

    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.page === page);
    });

    // Update active page content
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });
}

// --- Audio & Player Logic ---
function loadStation(index, autoPlay = true) {
    // The index is from the main 'stations' array
    if (index < 0 || index >= stations.length) return;
    
    const station = stations[index];
    state.currentStationIndex = index;

    console.log("Loading Station:", station.name, "AutoPlay:", autoPlay);

    stationNameEl.textContent = station.name;
    stationGenreEl.textContent = station.genre || "...";

    if (station.image) {
        coverArtEl.style.backgroundImage = `url(${station.image})`;
    } else {
        coverArtEl.style.backgroundImage = 'none';
    }

    if (autoPlay) {
        radioPlayer.loadStation(station);
    } else {
        radioPlayer.currentStation = station;
        radioPlayer.audio.src = station.url;
    }

    updateActiveStationInLists(station.url);
    checkFavoriteStatus(station.url);
}

function setupPlayerEvents() {
    radioPlayer.on('play', () => {
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    });

    radioPlayer.on('pause', () => {
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    });

    radioPlayer.on('metadata', (metadata) => {
        trackTitleEl.textContent = metadata.title || '...';
        trackArtistEl.textContent = metadata.artist || '...';

        // NEW: Fetch cover art when metadata updates
        updateCoverArt(metadata.artist, metadata.title);
        
        // NEW: Update music service links
        updateMusicServiceLinks(metadata.artist, metadata.title);
    });

    // Listen for metadata fetch requests and fetch metadata
    radioPlayer.on('requestMetadata', async (station) => {
        if (!station) return;
        try {
            const metadata = await MetadataService.fetchLiveMetadata(station);
            if (metadata && (metadata.title || metadata.artist)) {
                radioPlayer.dispatchEvent('metadata', metadata);
            }
        } catch (e) {
            console.warn("Metadata fetch error:", e);
        }
    });
}

// --- Event Listeners ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => navigateTo(tab.dataset.page);
    });

    // Main Player Buttons
    playBtn.onclick = () => radioPlayer.toggle();
    document.getElementById('prevBtn').onclick = () => playPreviousStation();
    document.getElementById('nextBtn').onclick = () => playNextStation();
    document.getElementById('stopBtn').onclick = () => stopPlayback();
    document.getElementById('favBtn').onclick = () => toggleFavorite();

    // Volume Slider
    document.getElementById('radioVolume').oninput = (e) => {
        radioPlayer.setVolume(parseFloat(e.target.value));
    };

    // Frequency Master Volume
    document.getElementById('freqMasterVol').oninput = (e) => {
        freqGen.setMasterVolume(e.target.value);
    };

    // Search
    document.getElementById('searchStations').oninput = () => renderStationList();

    // Add Podcast Button
    document.getElementById('addPodcastBtn').onclick = addPodcast;

    // Theme Toggle
    document.querySelector('.theme-toggle').onclick = toggleTheme;
    document.getElementById('darkModeToggle').onchange = toggleTheme;
    
    // Genre Filters
    document.getElementById('genreFilters').addEventListener('click', e => {
        if (e.target.classList.contains('genre-chip')) {
            state.currentGenre = e.target.dataset.genre;
            renderStationList();
        }
    });
}

// --- UI Rendering & Updates ---
function renderStationList() {
    const container = document.getElementById('stationList');
    const filteredStations = getFilteredStations();
    
    // Update genre filter UI
    document.querySelectorAll('.genre-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.genre === state.currentGenre);
    });

    if (filteredStations.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine Sender gefunden.</div>';
        return;
    }

    container.innerHTML = filteredStations.map((station, index) => {
        const stationImage = station.image || 'icon-192.png';
        // The true index is needed for loadStation
        const trueIndex = stations.findIndex(s => s.url === station.url);
        return `
            <div class="list-item station-item" data-index="${trueIndex}" data-url="${station.url}">
                <div class="station-icon" style="background-image: url('${stationImage}')"></div>
                <div class="station-info">
                    <div>${station.name}</div>
                    <small>${station.genre || ''}</small>
                </div>
            </div>
        `;
    }).join('');

    // Add click listeners to new items
    container.querySelectorAll('.list-item').forEach(item => {
        item.onclick = () => {
            loadStation(parseInt(item.dataset.index), true);
            navigateTo('player'); // Switch back to player on selection
        };
    });
    
    updateActiveStationInLists(radioPlayer.currentStation?.url);
}

// --- Podcast Rendering & Management ---
function renderPodcastList() {
    const container = document.getElementById('podcastList');
    const podcasts = getAllPodcasts();
    
    if (podcasts.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine Podcasts vorhanden.</div>';
        return;
    }

    container.innerHTML = podcasts.map((podcast, index) => {
        const podcastImage = podcast.image || 'icon-192.png';
        const isCustom = isCustomPodcast(podcast.url);
        return `
            <div class="list-item podcast-item" data-index="${index}" data-url="${podcast.url}" data-name="${podcast.name}">
                <div class="podcast-icon" style="background-image: url('${podcastImage}')"></div>
                <div class="podcast-info">
                    <div>${podcast.name}</div>
                    <small>${podcast.genre || 'Podcast'}</small>
                </div>
                ${isCustom ? '<button class="delete-podcast-btn" data-url="' + podcast.url + '"><i class="fa-solid fa-trash"></i></button>' : ''}
            </div>
        `;
    }).join('');

    // Add click listeners
    container.querySelectorAll('.podcast-item').forEach(item => {
        item.onclick = (e) => {
            if (e.target.closest('.delete-podcast-btn')) return;
            playPodcast(item.dataset.url, item.dataset.name);
        };
    });

    // Add delete listeners for custom podcasts
    container.querySelectorAll('.delete-podcast-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            removeCustomPodcast(btn.dataset.url);
            renderPodcastList();
        };
    });
}

function playPodcast(url, name) {
    radioPlayer.loadStation({
        url: url,
        name: name,
        genre: 'Podcast',
        image: ''
    });
    navigateTo('player');
}

function addPodcast() {
    const nameInput = document.getElementById('newPodcastName');
    const urlInput = document.getElementById('newPodcastUrl');
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name || !url) {
        alert('Bitte Podcast-Name und URL eingeben');
        return;
    }
    
    addCustomPodcast({
        name: name,
        url: url,
        genre: 'Benutzerdefiniert',
        image: ''
    });
    
    nameInput.value = '';
    urlInput.value = '';
    renderPodcastList();
}

function renderFrequencyList() {
    const container = document.getElementById('frequencyList');
    const frequencies = freqGen.getFrequencyList(); // Get frequencies from the class instance
    container.innerHTML = frequencies.map(freq => `
        <div class="freq-item" data-id="${freq.id}">
            <label class="freq-toggle">
                <input type="checkbox" class="freq-onoff" data-id="${freq.id}">
                <span class="freq-toggle-slider"></span>
            </label>
            <div class="freq-info">
                <div>${freq.name} (${freq.freq} Hz)</div>
                <small>${freq.desc}</small>
            </div>
            <input type="range" class="freq-slider" data-id="${freq.id}" min="0" max="0.5" step="0.01" value="0">
        </div>
    `).join('');

    container.querySelectorAll('.freq-onoff').forEach(toggle => {
        toggle.onchange = (e) => {
            const id = e.target.dataset.id;
            const isOn = e.target.checked;
            // When turning on, set default volume to 0.25
            if (isOn) {
                const slider = container.querySelector(`.freq-slider[data-id="${id}"]`);
                if (slider && parseFloat(slider.value) === 0) {
                    slider.value = 0.25;
                    freqGen.setFrequencyVolume(id, 0.25);
                }
            }
            freqGen.toggleFrequency(id, isOn);
            // Update visual state
            const freqItem = container.querySelector(`.freq-item[data-id="${id}"]`);
            freqItem.classList.toggle('active', isOn);
        };
    });

    container.querySelectorAll('.freq-slider').forEach(slider => {
        slider.oninput = (e) => {
            const id = e.target.dataset.id;
            const volume = parseFloat(e.target.value);
            const freqData = frequencies.find(f => f.id === id);
            if (!freqData) return;

            // Use the new methods in FrequencyGenerator
            if (volume > 0) {
                freqGen.toggleFrequency(id, true); // Ensure it's on
                freqGen.setFrequencyVolume(id, volume);
                // Also check the toggle if not already checked
                const toggle = container.querySelector(`.freq-onoff[data-id="${id}"]`);
                if (toggle && !toggle.checked) {
                    toggle.checked = true;
                    const freqItem = container.querySelector(`.freq-item[data-id="${id}"]`);
                    freqItem.classList.add('active');
                }
            } else {
                freqGen.toggleFrequency(id, false); // Turn it off
                const toggle = container.querySelector(`.freq-onoff[data-id="${id}"]`);
                if (toggle && toggle.checked) {
                    toggle.checked = false;
                    const freqItem = container.querySelector(`.freq-item[data-id="${id}"]`);
                    freqItem.classList.remove('active');
                }
            }
        };
    });
}

function renderGenreFilters() {
    const genres = ['Alle', ...new Set(stations.flatMap(s => s.genre.split(',').map(g => g.trim())).filter(g => g))];
    const container = document.getElementById('genreFilters');
    container.innerHTML = genres.map(g => 
        `<button class="genre-chip" data-genre="${g}">${g}</button>`
    ).join('');
}

function updateActiveStationInLists(url) {
    if (!url) return;
    document.querySelectorAll('.list-item').forEach(el => {
        el.classList.toggle('active', el.dataset.url === url);
    });
}

// --- Data & State Management ---
function getFilteredStations() {
    const searchTerm = document.getElementById('searchStations').value.toLowerCase();
    return stations.filter(station => {
        // Filter out stations with more than 5 words in name
        const wordCount = station.name.trim().split(/\s+/).length;
        if (wordCount > 5) return false;
        
        const matchesGenre = state.currentGenre === 'Alle' || station.genre.toLowerCase().includes(state.currentGenre.toLowerCase());
        const matchesSearch = station.name.toLowerCase().includes(searchTerm);
        return matchesGenre && matchesSearch;
    });
}

function playNextStation() {
    const filtered = getFilteredStations();
    if (filtered.length === 0) return;

    const currentFilteredIndex = filtered.findIndex(s => s.url === radioPlayer.currentStation?.url);
    const nextFilteredIndex = (currentFilteredIndex + 1) % filtered.length;
    
    // Find the true index in the main stations array
    const nextStation = filtered[nextFilteredIndex];
    const trueIndex = stations.findIndex(s => s.url === nextStation.url);

    loadStation(trueIndex, true);
}

function stopPlayback() {
    radioPlayer.stop();
    freqGen.stopAll(); // Stop all frequencies
    
    // Reset play icon
    playIcon.classList.remove('fa-pause');
    playIcon.classList.add('fa-play');
    
    // Reset track info
    trackTitleEl.textContent = 'Titel: –';
    trackArtistEl.textContent = 'Interpret: –';
    
    // Hide music service links
    document.getElementById('musicServiceLinks').style.display = 'none';
    
    // Reset cover art to station image
    coverArtEl.style.backgroundImage = radioPlayer.currentStation?.image ? `url(${radioPlayer.currentStation.image})` : 'none';
    
    // Reset frequency toggles in UI
    document.querySelectorAll('.freq-onoff').forEach(toggle => {
        toggle.checked = false;
    });
    document.querySelectorAll('.freq-item').forEach(item => {
        item.classList.remove('active');
    });
}

function playPreviousStation() {
    const filtered = getFilteredStations();
    if (filtered.length === 0) return;

    const currentFilteredIndex = filtered.findIndex(s => s.url === radioPlayer.currentStation?.url);
    const prevFilteredIndex = (currentFilteredIndex - 1 + filtered.length) % filtered.length;

    // Find the true index in the main stations array
    const prevStation = filtered[prevFilteredIndex];
    const trueIndex = stations.findIndex(s => s.url === prevStation.url);

    loadStation(trueIndex, true);
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('darkModeToggle').checked = isDark;
}

// --- Favorites Logic ---
// Store full station objects with frequencies
let favoriteStations = [];

async function loadFavorites() {
    // Get full station objects from DB
    favoriteStations = await favDB.getAllFavorites();
    state.favorites = favoriteStations.map(fav => fav.url);
    renderFavoritesList();
}

async function toggleFavorite() {
    const station = radioPlayer.currentStation;
    if (!station) return;

    // Get current frequency settings
    const activeFrequencies = freqGen.getActiveFrequencies();

    if (state.favorites.includes(station.url)) {
        await favDB.removeFavorite(station.url);
    } else {
        // Add station with frequency settings
        const stationWithFreq = {
            ...station,
            frequencies: activeFrequencies
        };
        await favDB.addFavorite(stationWithFreq);
    }
    await loadFavorites();
    checkFavoriteStatus(station.url);
}

function checkFavoriteStatus(url) {
    const favBtn = document.getElementById('favBtn');
    if (!favBtn) return;
    const isFav = state.favorites.includes(url);
    favBtn.classList.toggle('active', isFav);
    // Only update icon if there's an <i> element inside
    const favIcon = favBtn.querySelector('i');
    if (favIcon) {
        favIcon.className = isFav ? 'fas fa-heart' : 'far fa-heart';
    }
}

// --- NEW: Favorites Rendering ---
function renderFavoritesList() {
    const container = document.getElementById('favoritesList');

    if (favoriteStations.length === 0) {
        container.innerHTML = '<div class="empty-state">Noch keine Favoriten gespeichert.</div>';
        return;
    }

    container.innerHTML = favoriteStations.map(station => {
        const stationImage = station.image || 'icon-192.png';
        const trueIndex = stations.findIndex(s => s.url === station.url);
        const hasFrequencies = station.frequencies && station.frequencies.length > 0;
        return `
            <div class="list-item station-item" data-index="${trueIndex}" data-url="${station.url}" data-frequencies='${JSON.stringify(station.frequencies || [])}'>
                <div class="station-icon" style="background-image: url('${stationImage}')"></div>
                <div class="station-info">
                    <div>${station.name}</div>
                    <small>${station.genre || ''} ${hasFrequencies ? '🎵' : ''}</small>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.list-item').forEach(item => {
        item.onclick = () => {
            const index = parseInt(item.dataset.index);
            loadStation(index, true);
            
            // Restore frequency settings
            const freqData = JSON.parse(item.dataset.frequencies || '[]');
            if (freqData.length > 0) {
                setTimeout(() => {
                    // First, turn on all frequencies in the data
                    freqData.forEach(freq => {
                        freqGen.toggleFrequency(freq.id, true);
                        freqGen.setFrequencyVolume(freq.id, freq.volume);
                    });
                    
                    // Then update the UI
                    freqData.forEach(freq => {
                        const toggle = document.querySelector(`.freq-onoff[data-id="${freq.id}"]`);
                        const slider = document.querySelector(`.freq-slider[data-id="${freq.id}"]`);
                        const freqItem = document.querySelector(`.freq-item[data-id="${freq.id}"]`);
                        if (toggle) toggle.checked = true;
                        if (slider) slider.value = freq.volume;
                        if (freqItem) freqItem.classList.add('active');
                    });
                }, 500);
            }
            
            navigateTo('player');
        };
    });
}

// --- NEW: Metadata & Cover Art Logic ---
async function updateCoverArt(artist, title) {
    if (!artist && !title) {
        // Fallback to station image if no song is playing
        const station = radioPlayer.currentStation;
        if (station && station.image) {
            coverArtEl.style.backgroundImage = `url(${station.image})`;
        }
        return;
    }

    try {
        const coverUrl = await MetadataService.getCoverArt(artist, title);
        if (coverUrl) {
            coverArtEl.style.backgroundImage = `url(${coverUrl})`;
        } else {
            // Fallback to station image if no cover is found
            const station = radioPlayer.currentStation;
            if (station && station.image) {
                coverArtEl.style.backgroundImage = `url(${station.image})`;
            }
        }
    } catch (error) {
        console.warn("Cover art update failed:", error);
    }
}

function updateMusicServiceLinks(artist, title) {
    const container = document.getElementById('musicServiceLinks');
    if (!artist && !title) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    
    const searchQuery = encodeURIComponent(`${artist} ${title}`);
    
    // Update Spotify link
    document.getElementById('spotifyLink').href = `https://open.spotify.com/search/${searchQuery}`;
    
    // Update YouTube link
    document.getElementById('youtubeLink').href = `https://music.youtube.com/search?q=${searchQuery}`;
    
    // Update Soundcloud link
    document.getElementById('soundcloudLink').href = `https://soundcloud.com/search?q=${searchQuery}`;
}

// --- Init & Global Load ---
document.addEventListener('DOMContentLoaded', init);
