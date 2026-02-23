// Default podcasts list - Using direct audio streams where available
const defaultPodcasts = [
    {
        "name": "Meditation für jeden Tag",
        "url": "https://paulinathurm.libsyn.com/rss",
        "genre": "Meditation",
        "image": ""
    },
    {
        "name": "Koala Mind - Meditation",
        "url": "https://feeds.acast.com/public/shows/koala-mind-meditation-achtsamkeit",
        "genre": "Achtsamkeit",
        "image": ""
    },
    {
        "name": "Bleib entspannt! Meditation",
        "url": "https://bleib-entspannt.podigee.io/feed/mp3",
        "genre": "Entspannung",
        "image": ""
    },
    {
        "name": "Hypnose & Entspannung",
        "url": "https://hypnose-entspannung.podigee.io/feed/mp3",
        "genre": "Hypnose",
        "image": ""
    },
    {
        "name": "LOSLEBEN - Hypnose",
        "url": "https://me-time.podigee.io/feed/mp3",
        "genre": "Hypnose",
        "image": ""
    },
    {
        "name": "Einschlafen mit Meditation",
        "url": "https://einschlafen-mit-meditation.podigee.io/feed/mp3",
        "genre": "Schlaf",
        "image": ""
    },
    {
        "name": "Mindful Minutes",
        "url": "https://7v9p9z.podcaster.de/mindfulminutes.rss",
        "genre": "Achtsamkeit",
        "image": ""
    },
    {
        "name": "7Mind Podcast",
        "url": "https://7mind.podigee.io/feed/mp3",
        "genre": "Meditation",
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
