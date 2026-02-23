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

        const proxies = [
            (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(u)}`,
            (u) => `https://thingproxy.freeboard.io/fetch/${u}`
        ];

        for (let i = 0; i < proxies.length; i++) {
            try {
                const proxyUrl = proxies[i](url);
                console.log(`PodcastService: Trying proxy ${i + 1}:`, proxyUrl);

                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Proxy returned status ${response.status}`);

                let content;
                if (proxyUrl.includes('allorigins')) {
                    const data = await response.json();
                    content = data.contents;
                } else {
                    content = await response.text();
                }

                if (!content) throw new Error("Empty content from proxy");

                // 1. Try RSS/XML parsing (standard enclosures)
                if (content.trim().startsWith('<')) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(content, "text/xml");
                    const parseError = xmlDoc.getElementsByTagName("parsererror");

                    if (parseError.length === 0) {
                        // Check for RSS enclosure
                        const enclosure = xmlDoc.querySelector('enclosure[type^="audio"]');
                        if (enclosure && enclosure.getAttribute('url')) {
                            console.log("PodcastService: Found RSS enclosure:", enclosure.getAttribute('url'));
                            return enclosure.getAttribute('url');
                        }
                    }

                    // Try looking for mp3/m4a in XML text (regex fallback)
                    const mp3Match = content.match(/https?:\/\/[^"'>\s]+\.(mp3|aac|m4a|ogg)/i);
                    if (mp3Match) {
                        console.log("PodcastService: Found audio link in XML text:", mp3Match[0]);
                        return mp3Match[0];
                    }
                }

                // 2. Try HTML parsing (if it's a landing page)
                if (content.toLowerCase().includes('<html')) {
                    const parser = new DOMParser();
                    const htmlDoc = parser.parseFromString(content, "text/html");

                    // Look for <audio> tags
                    const audioTag = htmlDoc.querySelector('audio source') || htmlDoc.querySelector('audio');
                    if (audioTag) {
                        const src = audioTag.getAttribute('src');
                        if (src) return this.absoluteUrl(url, src);
                    }

                    // Look for direct audio link in the page
                    const matches = content.match(/https?:\/\/[^"'>\s]+\.(mp3|aac|m4a|ogg)(\?[^"'>\s]*)?/gi);
                    if (matches && matches.length > 0) {
                        const direct = matches.find(m => !m.includes('adswizz') && !m.includes('doubleclick'));
                        if (direct) {
                            console.log("PodcastService: Found direct audio link in HTML:", direct);
                            return direct;
                        }
                    }
                }

                // If content was fetched but nothing found, break and return original next
                console.warn(`PodcastService: Content fetched via proxy ${i + 1} but no audio URL found.`);
            } catch (error) {
                console.warn(`PodcastService: Proxy ${i + 1} failed:`, error.message);
                // Continue to next proxy
            }
        }

        // Fallback: Just return original and hope browser handles it
        console.warn("PodcastService: All proxies failed or no audio found, returning original URL.");
        return url;
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
