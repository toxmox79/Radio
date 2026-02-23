/**
 * PodcastService
 * Resolves non-direct podcast URLs (RSS feeds, blog posts) to direct audio links.
 */
const PodcastService = {
    async resolveUrl(url) {
        if (!url) return null;

        // If it's already a direct link, return it
        if (url.match(/\.(mp3|aac|ogg|wav|m4a|flac)(\?|$)/i)) {
            return url;
        }

        console.log("PodcastService: Resolving URL:", url);

        try {
            // Use AllOrigins proxy to bypass CORS
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            if (!data || !data.contents) {
                throw new Error("Could not fetch content via proxy");
            }

            const content = data.contents;

            // 1. Try RSS/XML parsing (standard enclosures)
            if (content.trim().startsWith('<')) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, "text/xml");

                // Check for RSS enclosure
                const enclosure = xmlDoc.querySelector('enclosure[type^="audio"]');
                if (enclosure && enclosure.getAttribute('url')) {
                    console.log("PodcastService: Found RSS enclosure:", enclosure.getAttribute('url'));
                    return enclosure.getAttribute('url');
                }

                // Try looking for mp3 in XML text (last resort for malformed feeds)
                const mp3Match = content.match(/https?:\/\/[^"'>\s]+\.(mp3|aac|m4a)/i);
                if (mp3Match) {
                    console.log("PodcastService: Found MP3 link in XML text:", mp3Match[0]);
                    return mp3Match[0];
                }
            }

            // 2. Try HTML parsing
            if (content.toLowerCase().includes('<html') || content.toLowerCase().includes('<!doctype')) {
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(content, "text/html");

                // Look for <audio> tags
                const audioTag = htmlDoc.querySelector('audio source') || htmlDoc.querySelector('audio');
                if (audioTag) {
                    const src = audioTag.getAttribute('src');
                    if (src) return this.absoluteUrl(url, src);
                }

                // Look for common patterns (Apple Podcasts, Spotify, etc. meta tags)
                const twitterPlayer = htmlDoc.querySelector('meta[name="twitter:player:stream"]');
                if (twitterPlayer && twitterPlayer.getAttribute('content')) {
                    return twitterPlayer.getAttribute('content');
                }

                // Hard search for any direct audio link in the page
                const matches = content.match(/https?:\/\/[^"'>\s]+\.(mp3|aac|m4a|ogg)(\?[^"'>\s]*)?/gi);
                if (matches && matches.length > 0) {
                    // Filter out common ads/tracking if multiple found
                    const direct = matches.find(m => !m.includes('adswizz') && !m.includes('doubleclick'));
                    if (direct) {
                        console.log("PodcastService: Found direct audio link in HTML:", direct);
                        return direct;
                    }
                }
            }

            // Fallback: Just return original and hope browser handles it
            return url;
        } catch (error) {
            console.error("PodcastService Error:", error);
            return url;
        }
    },

    absoluteUrl(base, relative) {
        try {
            return new URL(relative, base).href;
        } catch (e) {
            return relative;
        }
    }
};

window.PodcastService = PodcastService;
