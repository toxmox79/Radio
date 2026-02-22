/**
 * (NEW) Metadata Service for Radio App
 * Uses Radio-Browser API and iTunes for high reliability.
 */
const MetadataService = {
    // iTunes Search API for Cover Art
    async getCoverArt(artist, title) {
        if (!artist && !title) return null;

        try {
            const query = encodeURIComponent(`${artist} ${title}`);
            const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            }
        } catch (error) {
            console.warn("MetadataService: Cover art error", error.message);
        }
        return null;
    },

    // Radio-Browser API for Live Metadata
    async fetchLiveMetadata(station) {
        if (!station || !station.url) return null;

        // 1. Specialized Provider: Laut.fm
        if (station.url.includes('laut.fm')) {
            const lautMeta = await this.fetchLautFmMetadata(station.url);
            if (lautMeta) return lautMeta;
        }

        // 2. Specialized Provider: Radio PSR (regiocast/streamabc streams)
        if (station.url.includes('radiopsr.de') || station.url.includes('streamabc.net') || station.url.includes('psr.')) {
            const psrMeta = await this.fetchRadioPsrMetadata(station.url);
            if (psrMeta) return psrMeta;
        }

        // 3. Radio-Browser Check with station name lookup
        try {
            // First try by URL
            let url = `https://de1.api.radio-browser.info/json/stations/byurl?url=${encodeURIComponent(station.url)}`;
            let response = await fetch(url);
            let data = await response.json();

            if (data && data.length > 0 && data[0].tags) {
                // Try to get more metadata by station name
                if (station.name) {
                    const stationMeta = await this.fetchRadioBrowserByName(station.name);
                    if (stationMeta) return stationMeta;
                }
            }
        } catch (e) {
            console.warn("MetadataService: Radio-Browser error", e.message);
        }

        // 4. Fallback: Shoutcast/Icecast Scanning
        return await this.fetchIcyMetadata(station.url);
    },

    // Fetch metadata from Radio-Browser API by station name
    async fetchRadioBrowserByName(stationName) {
        try {
            // Extract station name without extras like "Radio PSR", "LIVE", etc.
            let searchName = stationName
                .replace(/\|.*$/, '')
                .replace(/\-.*$/, '')
                .replace(/LIVE/gi, '')
                .replace(/Radio/gi, '')
                .trim();
            
            // Try searching for PSR stations
            if (stationName.toLowerCase().includes('psr')) {
                searchName = 'radio psr';
            }
            
            const url = `https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(searchName)}?limit=5`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                // Look for exact match or close match
                for (const station of data) {
                    if (station.url && (station.url.includes('radiopsr') || station.url.includes('streamabc'))) {
                        // Check if this station has current song info
                        if (station.nextradio_clickable || station.changeuuid) {
                            // Try to get the station's metadata
                            const detailUrl = `https://de1.api.radio-browser.info/json/stations/byuuid/${station.stationuuid}`;
                            const detailResponse = await fetch(detailUrl);
                            const detailData = await detailResponse.json();
                            
                            if (detailData && detailData.length > 0 && detailData[0].lastchangetime) {
                                // This might have recent metadata
                                console.log("MetadataService: Found PSR station in Radio-Browser:", station.name);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("MetadataService: Radio-Browser by name error", e.message);
        }
        return null;
    },

    async fetchLautFmMetadata(stationUrl) {
        try {
            // Extract station name from URL: https://jugendradio.stream.laut.fm/jugend_radio
            // or http://stream.laut.fm/jugend_radio
            const parts = stationUrl.split('/');
            const stationName = parts[parts.length - 1].split('?')[0];

            if (!stationName) return null;

            const apiUrl = `https://api.laut.fm/station/${stationName}/current_song`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data && data.title) {
                console.log("MetadataService: Laut.fm info found:", data.artist.name, "-", data.title);
                return {
                    artist: data.artist.name || "",
                    title: data.title
                };
            }
        } catch (e) {
            console.warn("MetadataService: Laut.fm API error", e.message);
        }
        return null;
    },

    // Radio PSR / Regiocast / StreamABC Metadata Fetcher
    async fetchRadioPsrMetadata(stationUrl) {
        try {
            // Extract base URL and mount point from stream URL
            // Examples:
            // https://streams.radiopsr.de/psr-live/mp3-192/mediaplayer -> mount: /psr-live/mp3-192
            // https://regiocast.streamabc.net/regc-psrlive-mp3-192-xxxxx -> different handling
            // https://psr.streamabc.net/regc-psrlive-mp3-192-xxxxx -> different handling
            
            let baseUrl = stationUrl.split(';')[0].split('?')[0];
            let mountPoint = '';
            let streamHost = '';
            
            // Handle streams.radiopsr.de URLs
            if (baseUrl.includes('streams.radiopsr.de')) {
                const parts = baseUrl.split('/');
                // parts: [protocol, , streams.radiopsr.de, psr-live, mp3-192, mediaplayer]
                const idx = parts.indexOf('streams.radiopsr.de');
                if (idx >= 0 && parts[idx + 1] && parts[idx + 2]) {
                    mountPoint = '/' + parts[idx + 1] + '/' + parts[idx + 2];
                    baseUrl = 'https://streams.radiopsr.de';
                    streamHost = 'radiopsr';
                }
            }
            // Handle regiocast.streamabc.net URLs
            else if (baseUrl.includes('regiocast.streamabc.net') || baseUrl.includes('streamabc.net')) {
                // Try to extract stream name from URL pattern
                // e.g., regc-psrlive-mp3-192-xxxxx
                const match = baseUrl.match(/regc-([a-z]+)-/i);
                if (match) {
                    streamHost = 'regiocast';
                }
            }
            
            // Try multiple metadata endpoints
            const endpoints = [];
            
            if (mountPoint) {
                // Radio PSR direct status.json endpoint with mount parameter
                endpoints.push({ url: `${baseUrl}${mountPoint}/status.json`, useProxy: true });
                
                // Also try direct access (no proxy)
                endpoints.push({ url: `${baseUrl}${mountPoint}/status.json`, useProxy: false });
            }
            
            // Try status-json.xsl (Icecast standard)
            if (baseUrl.includes('streams.radiopsr.de')) {
                const baseWithoutMediaplayer = baseUrl.replace('/mediaplayer', '');
                endpoints.push({ url: baseWithoutMediaplayer + '/status-json.xsl', useProxy: true });
                endpoints.push({ url: baseUrl + '/status-json.xsl', useProxy: true });
                // Also try direct
                endpoints.push({ url: baseWithoutMediaplayer + '/status-json.xsl', useProxy: false });
            }
            
            // Try streamabc/regiocast metadata - these often support /status endpoint
            if (baseUrl.includes('streamabc.net') || baseUrl.includes('regiocast.streamabc.net') || baseUrl.includes('psr.streamabc.net')) {
                // For streamabc streams, try various endpoints
                endpoints.push({ url: baseUrl + '/status', useProxy: true });
                endpoints.push({ url: baseUrl + '/status', useProxy: false });
                endpoints.push({ url: baseUrl + '/7.html', useProxy: true });
                
                // Try extracting just the stream identifier
                const streamMatch = baseUrl.match(/regc-([a-z0-9-]+)/i);
                if (streamMatch) {
                    // Try with alternative base
                    const altBase = 'https://streams.radiopsr.de/' + streamMatch[1] + '/mp3-192';
                    endpoints.push({ url: altBase + '/status.json', useProxy: true });
                    endpoints.push({ url: altBase + '/status.json', useProxy: false });
                }
            }

            console.log("MetadataService: Trying PSR endpoints for", baseUrl);

            for (const ep of endpoints) {
                try {
                    let data;
                    let response;
                    
                    if (ep.useProxy) {
                        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(ep.url)}`;
                        response = await fetch(proxyUrl);
                        data = await response.json();
                    } else {
                        // Direct fetch - may fail due to CORS but worth trying
                        response = await fetch(ep.url, { mode: 'cors' });
                        data = { contents: await response.text() };
                    }

                    if (!data.contents) continue;

                    // Try parsing as JSON
                    try {
                        const json = JSON.parse(data.contents);
                        
                        // Radio PSR specific format (status.json)
                        if (json.title) {
                            console.log(`MetadataService: Radio PSR status.json info found: ${json.title}`);
                            return this.parseSong(json.title);
                        }
                        
                        // Icecast format
                        if (json.icestats && json.icestats.source) {
                            const source = Array.isArray(json.icestats.source) ? json.icestats.source[0] : json.icestats.source;
                            if (source.title || source.songtitle) {
                                console.log(`MetadataService: Icecast source info found`);
                                return this.parseSong(source.title || source.songtitle);
                            }
                        }
                    } catch (e) {
                        // Not JSON, try HTML parsing
                    }
                    
                    // Try /7.html format
                    if (ep.url.includes('/7.html') || data.contents.includes('<body>')) {
                        const match = data.contents.match(/<body>(.*)<\/body>/i);
                        if (match && match[1]) {
                            const icyParts = match[1].split(',');
                            if (icyParts.length >= 7) {
                                console.log(`MetadataService: ICY /7.html info found for ${ep.url}`);
                                return this.parseSong(icyParts[6]);
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`MetadataService: Error fetching ${ep.url}:`, e.message);
                }
            }
        } catch (e) {
            console.warn("MetadataService: Radio PSR metadata error", e.message);
        }
        return null;
    },

    async fetchIcyMetadata(stationUrl) {
        const endpoints = ['/7.html', '/stats', '/status-json.xsl'];
        let baseUrl = stationUrl.split(';')[0].split('?')[0];
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        for (const endpoint of endpoints) {
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(baseUrl + endpoint)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (!data.contents) continue;

                if (endpoint === '/7.html') {
                    const match = data.contents.match(/<body>(.*)<\/body>/i);
                    if (match && match[1]) {
                        const icyParts = match[1].split(',');
                        if (icyParts.length >= 7) {
                            console.log(`MetadataService: ICY /7.html info found for ${baseUrl + endpoint}`);
                            return this.parseSong(icyParts[6]);
                        }
                    }
                } else if (endpoint === '/stats' || endpoint === '/status-json.xsl') {
                    // Try to parse as JSON if possible
                    try {
                        const json = JSON.parse(data.contents);
                        if (json.songtitle) {
                            console.log(`MetadataService: ICY JSON (songtitle) info found for ${baseUrl + endpoint}`);
                            return this.parseSong(json.songtitle);
                        }
                        if (json.icestats && json.icestats.source) {
                            const source = Array.isArray(json.icestats.source) ? json.icestats.source[0] : json.icestats.source;
                            if (source.title) {
                                console.log(`MetadataService: ICY JSON (icestats.source.title) info found for ${baseUrl + endpoint}`);
                                return this.parseSong(source.title);
                            }
                        }
                    } catch (e) {
                        // Not valid JSON, continue to next endpoint
                    }
                }
            } catch (e) {
                // Network or parsing error for this endpoint, try next
            }
        }
        return null;
    },

    parseSong(text) {
        if (!text) return null;
        const blacklist = ['werbung', 'ad', 'promo', 'news', 'jingle'];
        if (blacklist.some(word => text.toLowerCase().includes(word))) return null;

        const parts = text.split(' - ');
        if (parts.length >= 2) {
            return { artist: parts[0].trim(), title: parts.slice(1).join(' ').trim() };
        }
        return { artist: '', title: text.trim() };
    }
};

window.MetadataService = MetadataService;
