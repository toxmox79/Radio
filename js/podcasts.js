// Default podcasts list - Using direct audio streams where available
const defaultPodcasts = [
    {
        "name": "WDR 5 - Politiquement incorrect",
        "url": "https://podcast.wdr5.de/politiquementincorrect.mp3",
        "genre": "Satire, Comedy",
        "image": ""
    },
    {
        "name": "WDR 5 - Das philosophische Radio",
        "url": "https://podcast.wdr5.de/philosophisch.mp3",
        "genre": "Philosophie",
        "image": ""
    },
    {
        "name": "NDR Info - Nachrichten",
        "url": "https://podcast.ndr.de/ndrinfo.mp3",
        "genre": "Nachrichten",
        "image": ""
    },
    {
        "name": "Bayern 2 - radioWelt",
        "url": "https://podcast.br.de/radiowelt.mp3",
        "genre": "Gesellschaft",
        "image": ""
    },
    {
        "name": "SWR2 - Radiofeuilleton",
        "url": "https://podcast.swr.de/swr2_radiofeuilleton.mp3",
        "genre": "Kultur",
        "image": ""
    },
    {
        "name": "Deutschlandfunk - Informationen",
        "url": "https://podcast.dlf.de/iafm.mp3",
        "genre": "Nachrichten",
        "image": ""
    },
    {
        "name": "Tagesschau Podcast",
        "url": "https://podcast.tagesschau.de/tagesschau.mp3",
        "genre": "Nachrichten",
        "image": ""
    },
    {
        "name": "ZDF - Fokus",
        "url": "https://podcast.zdf.de/fokus.mp3",
        "genre": "Nachrichten",
        "image": ""
    }
];

// Custom podcasts storage key
const CUSTOM_PODCASTS_KEY = 'customPodcasts';

// Get custom podcasts from localStorage
function getCustomPodcasts() {
    const stored = localStorage.getItem(CUSTOM_PODCASTS_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Save custom podcasts to localStorage
function saveCustomPodcasts(podcasts) {
    localStorage.setItem(CUSTOM_PODCASTS_KEY, JSON.stringify(podcasts));
}

// Add a new custom podcast
function addCustomPodcast(podcast) {
    const customPodcasts = getCustomPodcasts();
    customPodcasts.push(podcast);
    saveCustomPodcasts(customPodcasts);
    return customPodcasts;
}

// Remove a custom podcast
function removeCustomPodcast(url) {
    const customPodcasts = getCustomPodcasts();
    const filtered = customPodcasts.filter(p => p.url !== url);
    saveCustomPodcasts(filtered);
    return filtered;
}

// Get all podcasts (default + custom)
function getAllPodcasts() {
    return [...defaultPodcasts, ...getCustomPodcasts()];
}

// Check if a podcast URL is custom
function isCustomPodcast(url) {
    const customPodcasts = getCustomPodcasts();
    return customPodcasts.some(p => p.url === url);
}
