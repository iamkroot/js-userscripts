// ==UserScript==
// @name         Trakt to Sonarr / Radarr
// @namespace    iamkroot
// @version      2026-11-21
// @description  Adds "Add to Sonarr" / "Add to Radarr" buttons to Trakt pages (detail and list/grid views) and hides favorites/comments buttons
// @author       iamkroot
// @match        https://trakt.tv/*
// @match        https://og.trakt.tv/*
// @connect      *
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM.getValue
// @grant        GM.setValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- Storage Helpers ---
    const getVal = async (key, def) => {
        if (typeof GM !== 'undefined' && GM.getValue) return await GM.getValue(key, def);
        if (typeof GM_getValue !== 'undefined') return GM_getValue(key, def);
        return def;
    };
    const setVal = async (key, val) => {
        if (typeof GM !== 'undefined' && GM.setValue) return await GM.setValue(key, val);
        if (typeof GM_setValue !== 'undefined') return GM_setValue(key, val);
    };

    // --- GM_xmlhttpRequest Promise wrapper ---
    function httpRequest(options) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                return reject(new Error('GM_xmlhttpRequest is not available'));
            }
            GM_xmlhttpRequest({
                ...options,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const data = response.responseText ? JSON.parse(response.responseText) : null;
                            resolve(data);
                        } catch (e) {
                            resolve(response.responseText);
                        }
                    } else if (response.status === 401) {
                        reject(new Error('401 Unauthorized: Invalid API key'));
                    } else {
                        let errMsg = `HTTP ${response.status}: ${response.statusText || 'Error'}`;
                        try {
                            const errObj = JSON.parse(response.responseText);
                            if (Array.isArray(errObj) && errObj[0]?.errorMessage) {
                                errMsg = errObj[0].errorMessage;
                            } else if (errObj.message) {
                                errMsg = errObj.message;
                            }
                        } catch (_) {}
                        reject(new Error(errMsg));
                    }
                },
                onerror: err => reject(new Error(err?.error || 'Network error (check URL and connection)')),
                ontimeout: () => reject(new Error('Request timed out'))
            });
        });
    }

    // --- Injected Styles ---
    const STYLE_ID = 'trakt-arr-styles';
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* Hide Trakt Favorites and Comment buttons via CSS (prevents Svelte hydration crash) */
            .action-buttons .summary-favorite,
            .action-buttons > div[class*="summary-action"]:has(button[aria-controls="new-comment"]),
            /* Hide "in collection" button on posters / cards */
            .actions .watch-control.collection,
            .actions div[class*="collection"],
            .quick-icons .watch-control.collection {
                display: none !important;
            }
            /* Detail page: Add to Sonarr / Radarr button styles */
            .trakt-arr-btn-container {
                display: flex !important;
                position: relative;
                margin: 0 !important;
            }
            .trakt-arr-btn {
                display: flex !important;
                align-items: center;
                width: 100%;
                min-height: 60px;
                padding: 0 15px;
                border-radius: 8px !important;
                border: none !important;
                font-family: inherit;
                cursor: pointer;
                transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
                box-sizing: border-box;
                text-decoration: none;
            }
            .trakt-arr-btn.sonarr {
                background-color: #172a3a;
                color: #38bdf8;
            }
            .trakt-arr-btn.sonarr:hover:not(:disabled) {
                background-color: #1e3a50;
            }
            .trakt-arr-btn.radarr {
                background-color: #342614;
                color: #fbbf24;
            }
            .trakt-arr-btn.radarr:hover:not(:disabled) {
                background-color: #49351a;
            }
            .trakt-arr-btn.in-library {
                background-color: #15803d !important;
                color: #ffffff !important;
                border: none !important;
            }
            .trakt-arr-btn.in-library:hover {
                background-color: #16a34a !important;
            }
            .trakt-arr-btn.error {
                background-color: #381a1a !important;
                color: #f87171 !important;
            }
            .trakt-arr-btn-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                margin-right: 12px;
                flex-shrink: 0;
            }
            .trakt-arr-btn-icon svg {
                width: 26px;
                height: 26px;
                fill: currentColor;
            }
            .trakt-arr-btn-text {
                display: flex;
                flex-direction: column;
                justify-content: center;
                text-align: left;
                flex: 1;
                overflow: hidden;
            }
            .trakt-arr-btn-title {
                display: block;
                font-size: 15px;
                font-weight: 600;
                line-height: 1.25;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .trakt-arr-btn-detail {
                display: block;
                font-size: 12px;
                opacity: 0.8;
                margin-top: 3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            /* Grid/List card quick-action buttons */
            .trakt-arr-card-action {
                display: flex !important;
                align-items: stretch !important;
                justify-content: center;
                width: 28px;
                height: 34px;
                flex-shrink: 0;
                margin: 0;
                padding: 0;
            }
            .trakt-arr-card-btn {
                display: flex !important;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 34px;
                padding: 0;
                margin: 0;
                background: transparent;
                border: none;
                border-radius: 0 !important;
                cursor: pointer;
                transition: background-color 0.15s ease, opacity 0.15s ease;
                box-sizing: border-box;
            }
            .trakt-arr-card-btn:hover:not(:disabled) {
                opacity: 0.85;
            }
            .trakt-arr-card-btn.sonarr {
                color: #38bdf8 !important;
            }
            .trakt-arr-card-btn.radarr {
                color: #fbbf24 !important;
            }
            .trakt-arr-card-btn.in-library {
                background-color: #15803d !important;
                color: #ffffff !important;
                border-radius: 0 !important;
                height: 34px !important;
            }
            .trakt-arr-card-btn.in-library:hover {
                background-color: #16a34a !important;
                opacity: 1 !important;
            }
            .trakt-arr-card-btn.error {
                background-color: #991b1b !important;
                color: #ffffff !important;
                border-radius: 0 !important;
                height: 34px !important;
            }
            .trakt-arr-card-btn svg,
            .trakt-arr-btn-icon svg {
                width: 18px !important;
                height: 18px !important;
                display: block !important;
            }
            .trakt-arr-btn-icon svg {
                width: 26px !important;
                height: 26px !important;
            }
            .trakt-arr-card-btn svg:not([fill="none"]),
            .trakt-arr-btn-icon svg:not([fill="none"]) {
                fill: currentColor;
            }
            .trakt-arr-card-btn svg[fill="none"],
            .trakt-arr-btn-icon svg[fill="none"],
            .trakt-arr-stroke-icon {
                fill: none !important;
                stroke: currentColor !important;
            }
            @keyframes trakt-arr-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .trakt-arr-spinning {
                animation: trakt-arr-spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    // --- SVG Icons ---
    const ICONS = {
        sonarr: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
        radarr: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4zm2 14H4V10h16v8z"/></svg>`,
        check: `<svg class="trakt-arr-stroke-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="fill:none!important;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        spinner: `<svg class="trakt-arr-stroke-icon trakt-arr-spinning" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" style="fill:none!important;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>`
    };

    function normalizeUrl(url) {
        if (!url) return '';
        let u = url.trim().replace(/\/+$/, '');
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
            u = 'http://' + u;
        }
        return u;
    }

    function normalizeKey(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // --- Bulk Library Caching (Prevents hammering servers on large lists) ---
    // Fetches the user's library once per service and caches it for 5 minutes.
    const libraryCache = {
        sonarr: null, // Set of normalized slugs, titles, cleanTitles, IDs
        radarr: null,
        slugMap: { sonarr: {}, radarr: {} }, // Maps normalized keys to actual Sonarr/Radarr titleSlug
        lastFetched: { sonarr: 0, radarr: 0 },
        inFlight: { sonarr: null, radarr: null }
    };
    const CACHE_TTL_MS = 5 * 60 * 1000;

    async function loadLibrary(type) {
        const now = Date.now();
        if (libraryCache[type] && (now - libraryCache.lastFetched[type] < CACHE_TTL_MS)) {
            return libraryCache[type];
        }

        if (libraryCache.inFlight[type]) {
            return await libraryCache.inFlight[type];
        }

        const savedUrl = await getVal(`${type}_url`, '');
        const savedKey = await getVal(`${type}_api_key`, '');
        if (!savedUrl || !savedKey) return null;

        const baseUrl = normalizeUrl(savedUrl);
        const endpoint = type === 'sonarr' ? `${baseUrl}/api/v3/series` : `${baseUrl}/api/v3/movie`;

        libraryCache.inFlight[type] = (async () => {
            try {
                const items = await httpRequest({
                    method: 'GET',
                    url: endpoint,
                    headers: { 'X-Api-Key': savedKey, 'Accept': 'application/json' }
                });

                if (!Array.isArray(items)) return null;

                const set = new Set();
                const map = {};

                for (const item of items) {
                    const actualSlug = item.titleSlug || '';
                    if (item.titleSlug) {
                        set.add(item.titleSlug.toLowerCase());
                        set.add(normalizeKey(item.titleSlug));
                        map[item.titleSlug.toLowerCase()] = actualSlug;
                        map[normalizeKey(item.titleSlug)] = actualSlug;
                    }
                    if (item.title) {
                        const normTitle = normalizeKey(item.title);
                        set.add(normTitle);
                        map[normTitle] = actualSlug;
                        if (item.year) {
                            const normYear = normalizeKey(`${item.title}${item.year}`);
                            set.add(normYear);
                            map[normYear] = actualSlug;
                        }
                    }
                    if (item.cleanTitle) {
                        const normClean = normalizeKey(item.cleanTitle);
                        set.add(normClean);
                        map[normClean] = actualSlug;
                    }
                    if (item.imdbId) {
                        set.add(item.imdbId.toLowerCase());
                        map[item.imdbId.toLowerCase()] = actualSlug;
                    }
                    if (item.tmdbId) {
                        set.add(String(item.tmdbId));
                        map[String(item.tmdbId)] = actualSlug;
                    }
                    if (item.tvdbId) {
                        set.add(String(item.tvdbId));
                        map[String(item.tvdbId)] = actualSlug;
                    }
                }

                libraryCache[type] = set;
                libraryCache.slugMap[type] = map;
                libraryCache.lastFetched[type] = Date.now();
                return set;
            } catch (_) {
                return null;
            } finally {
                libraryCache.inFlight[type] = null;
            }
        })();

        return await libraryCache.inFlight[type];
    }

    function getActualLibrarySlug(type, { slug, title, year }) {
        const map = libraryCache.slugMap[type];
        if (!map) return slug;
        if (slug && map[slug.toLowerCase()]) return map[slug.toLowerCase()];
        if (slug && map[normalizeKey(slug)]) return map[normalizeKey(slug)];
        if (title && year && map[normalizeKey(`${title}${year}`)]) return map[normalizeKey(`${title}${year}`)];
        if (title && map[normalizeKey(title)]) return map[normalizeKey(title)];
        return slug;
    }

    function isItemInLibrary(type, { slug, title, year }) {
        const set = libraryCache[type];
        if (!set) return false;
        if (slug) {
            if (set.has(slug.toLowerCase()) || set.has(normalizeKey(slug))) return true;
        }
        if (title) {
            if (set.has(normalizeKey(title))) return true;
            if (year && set.has(normalizeKey(`${title}${year}`))) return true;
        }
        return false;
    }

    function markItemInLibrary(type, { slug, title, year }) {
        if (!libraryCache[type]) {
            libraryCache[type] = new Set();
        }
        if (slug) {
            libraryCache[type].add(slug.toLowerCase());
            libraryCache[type].add(normalizeKey(slug));
        }
        if (title) {
            libraryCache[type].add(normalizeKey(title));
            if (year) libraryCache[type].add(normalizeKey(`${title}${year}`));
        }
    }

    // --- Configuration helpers ---
    async function getServiceConfig(type) {
        const isSonarr = type === 'sonarr';
        const name = isSonarr ? 'Sonarr' : 'Radarr';
        const defaultUrl = isSonarr ? 'http://localhost:8989' : 'http://localhost:7878';

        let url = await getVal(`${type}_url`, '');
        let apiKey = await getVal(`${type}_api_key`, '');

        if (!url) {
            url = prompt(`Enter ${name} Base URL:`, defaultUrl);
            if (!url) return null;
            url = normalizeUrl(url);
            await setVal(`${type}_url`, url);
        } else {
            url = normalizeUrl(url);
        }

        if (!apiKey) {
            apiKey = prompt(`Enter ${name} API Key (find it in ${name} Settings > General > Security):`);
            if (!apiKey) return null;
            apiKey = apiKey.trim();
            await setVal(`${type}_api_key`, apiKey);
        }

        return { url, apiKey };
    }

    // --- Trakt Page Metadata Extraction (Detail Page) ---
    function getMediaDetails() {
        const path = window.location.pathname;
        let type = null;
        if (path.startsWith('/shows/')) {
            type = 'sonarr';
        } else if (path.startsWith('/movies/')) {
            type = 'radarr';
        } else {
            return null;
        }

        // Title from H1
        let title = '';
        const h1 = document.querySelector('h1');
        if (h1) {
            const clone = h1.cloneNode(true);
            clone.querySelectorAll('span, .badge, .year').forEach(el => el.remove());
            title = clone.textContent.trim();
        }
        if (!title) {
            title = document.title.split('-')[0].trim();
        }

        const yearEl = document.querySelector('h1 .year, .summary-title .year');
        const year = yearEl ? parseInt(yearEl.textContent.replace(/\D/g, ''), 10) : null;

        // External IDs
        let tvdbId = null;
        let tmdbId = null;
        let imdbId = null;

        const tvdbLink = document.querySelector('a[href*="thetvdb.com"]');
        if (tvdbLink) {
            const m = tvdbLink.href.match(/series\/(\d+)/);
            if (m) tvdbId = parseInt(m[1], 10);
        }

        const tmdbLink = document.querySelector('a[href*="themoviedb.org"]');
        if (tmdbLink) {
            const m = tmdbLink.href.match(/(?:movie|tv)\/(\d+)/);
            if (m) tmdbId = parseInt(m[1], 10);
        }

        const imdbLink = document.querySelector('a[href*="imdb.com/title/"]');
        if (imdbLink) {
            const m = imdbLink.href.match(/title\/(tt\d+)/);
            if (m) imdbId = m[1];
        }

        const slug = path.split('/')[2] || '';

        return { type, title, year, slug, tvdbId, tmdbId, imdbId };
    }

    // --- Fetch exact IDs from Trakt page in background on demand ---
    async function fetchMediaIdsFromTrakt(href) {
        try {
            const res = await fetch(href, { credentials: 'same-origin' });
            if (!res.ok) return null;
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let tvdbId = null, tmdbId = null, imdbId = null, year = null;
            const tvdbLink = doc.querySelector('a[href*="thetvdb.com"]');
            if (tvdbLink) {
                const m = tvdbLink.href.match(/series\/(\d+)/);
                if (m) tvdbId = parseInt(m[1], 10);
            }
            const tmdbLink = doc.querySelector('a[href*="themoviedb.org"]');
            if (tmdbLink) {
                const m = tmdbLink.href.match(/(?:movie|tv)\/(\d+)/);
                if (m) tmdbId = parseInt(m[1], 10);
            }
            const imdbLink = doc.querySelector('a[href*="imdb.com/title/"]');
            if (imdbLink) {
                const m = imdbLink.href.match(/title\/(tt\d+)/);
                if (m) imdbId = m[1];
            }
            const yearEl = doc.querySelector('h1 .year, .summary-title .year');
            if (yearEl) {
                year = parseInt(yearEl.textContent.replace(/\D/g, ''), 10) || null;
            }
            return { tvdbId, tmdbId, imdbId, year };
        } catch (_) {
            return null;
        }
    }

    // --- Sonarr API Operations ---
    async function lookupSonarr(cfg, { tvdbId, imdbId, title, year, slug }) {
        let term = '';
        if (tvdbId) term = `tvdb:${tvdbId}`;
        else if (imdbId) term = `imdb:${imdbId}`;
        else term = year ? `${title} ${year}` : (title || slug.replace(/-/g, ' '));

        const url = `${cfg.url}/api/v3/series/lookup?term=${encodeURIComponent(term)}`;
        const results = await httpRequest({
            method: 'GET',
            url,
            headers: { 'X-Api-Key': cfg.apiKey, 'Accept': 'application/json' }
        });

        if (!Array.isArray(results) || results.length === 0) return null;

        // If searched by exact ID, return first match
        if (tvdbId || imdbId) return results[0];

        // Disambiguate by exact title match first
        if (title) {
            const normTitle = normalizeKey(title);
            const exactMatches = results.filter(r => normalizeKey(r.title) === normTitle);
            if (exactMatches.length === 1) return exactMatches[0];
            if (exactMatches.length > 1 && year) {
                const yMatch = exactMatches.find(r => r.year === year);
                if (yMatch) return yMatch;
            }
            if (exactMatches.length > 1) return exactMatches[0];
        }

        // Disambiguate by year or slug
        if (year) {
            const yearMatch = results.find(r => r.year === year);
            if (yearMatch) return yearMatch;
        }
        if (slug) {
            const normSlug = normalizeKey(slug);
            const slugMatch = results.find(r => {
                const rSlug = normalizeKey(r.titleSlug);
                return rSlug === normSlug || rSlug.startsWith(normSlug) || normSlug.startsWith(rSlug);
            });
            if (slugMatch) return slugMatch;
        }

        return results[0];
    }

    async function addSonarr(cfg, seriesData) {
        const [rootFolders, qualityProfiles] = await Promise.all([
            httpRequest({ method: 'GET', url: `${cfg.url}/api/v3/rootfolder`, headers: { 'X-Api-Key': cfg.apiKey, 'Accept': 'application/json' } }),
            httpRequest({ method: 'GET', url: `${cfg.url}/api/v3/qualityprofile`, headers: { 'X-Api-Key': cfg.apiKey, 'Accept': 'application/json' } })
        ]);

        const rootFolderPath = Array.isArray(rootFolders) && rootFolders.length > 0 ? rootFolders[0].path : null;
        const qualityProfileId = Array.isArray(qualityProfiles) && qualityProfiles.length > 0 ? qualityProfiles[0].id : null;

        if (!rootFolderPath) throw new Error('No root folder found in Sonarr. Please add a root folder in Sonarr settings.');
        if (!qualityProfileId) throw new Error('No quality profile found in Sonarr.');

        const payload = {
            ...seriesData,
            qualityProfileId,
            rootFolderPath,
            monitored: true,
            seasonFolder: true,
            addOptions: {
                searchForMissingEpisodes: true
            }
        };

        return await httpRequest({
            method: 'POST',
            url: `${cfg.url}/api/v3/series`,
            headers: {
                'X-Api-Key': cfg.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: JSON.stringify(payload)
        });
    }

    // --- Radarr API Operations ---
    async function lookupRadarr(cfg, { tmdbId, imdbId, title, year, slug }) {
        let term = '';
        if (tmdbId) term = `tmdb:${tmdbId}`;
        else if (imdbId) term = `imdb:${imdbId}`;
        else term = year ? `${title} ${year}` : (title || slug.replace(/-/g, ' '));

        const url = `${cfg.url}/api/v3/movie/lookup?term=${encodeURIComponent(term)}`;
        const results = await httpRequest({
            method: 'GET',
            url,
            headers: { 'X-Api-Key': cfg.apiKey, 'Accept': 'application/json' }
        });

        if (!Array.isArray(results) || results.length === 0) return null;

        if (tmdbId || imdbId) return results[0];

        if (title) {
            const normTitle = normalizeKey(title);
            const exactMatches = results.filter(r => normalizeKey(r.title) === normTitle);
            if (exactMatches.length === 1) return exactMatches[0];
            if (exactMatches.length > 1 && year) {
                const yMatch = exactMatches.find(r => r.year === year);
                if (yMatch) return yMatch;
            }
            if (exactMatches.length > 1) return exactMatches[0];
        }

        if (year) {
            const yearMatch = results.find(r => r.year === year);
            if (yearMatch) return yearMatch;
        }
        if (slug) {
            const normSlug = normalizeKey(slug);
            const slugMatch = results.find(r => {
                const rSlug = normalizeKey(r.titleSlug);
                return rSlug === normSlug || rSlug.startsWith(normSlug) || normSlug.startsWith(rSlug);
            });
            if (slugMatch) return slugMatch;
        }

        return results[0];
    }

    async function addRadarr(cfg, movieData) {
        const [rootFolders, qualityProfiles] = await Promise.all([
            httpRequest({ method: 'GET', url: `${cfg.url}/api/v3/rootfolder`, headers: { 'X-Api-Key': cfg.apiKey, 'Accept': 'application/json' } }),
            httpRequest({ method: 'GET', url: `${cfg.url}/api/v3/qualityprofile`, headers: { 'X-Api-Key': cfg.apiKey, 'Accept': 'application/json' } })
        ]);

        const rootFolderPath = Array.isArray(rootFolders) && rootFolders.length > 0 ? rootFolders[0].path : null;
        const qualityProfileId = Array.isArray(qualityProfiles) && qualityProfiles.length > 0 ? qualityProfiles[0].id : null;

        if (!rootFolderPath) throw new Error('No root folder found in Radarr. Please add a root folder in Radarr settings.');
        if (!qualityProfileId) throw new Error('No quality profile found in Radarr.');

        const payload = {
            ...movieData,
            qualityProfileId,
            rootFolderPath,
            monitored: true,
            addOptions: {
                searchForMovie: true
            }
        };

        return await httpRequest({
            method: 'POST',
            url: `${cfg.url}/api/v3/movie`,
            headers: {
                'X-Api-Key': cfg.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: JSON.stringify(payload)
        });
    }

    // --- Detail Page: Button Setup ---
    async function setupSummaryButton() {
        const media = getMediaDetails();
        if (!media) return;

        const actionButtons = document.querySelector('.action-buttons');
        if (!actionButtons) return;

        const existing = actionButtons.querySelector('.trakt-arr-btn-container');
        if (existing) {
            if (existing.dataset.mediaPath === window.location.pathname) {
                return;
            }
            existing.remove();
        }

        const isSonarr = media.type === 'sonarr';
        const serviceName = isSonarr ? 'Sonarr' : 'Radarr';

        const container = document.createElement('div');
        container.className = `trakt-arr-btn-container summary-action`;
        container.dataset.mediaPath = window.location.pathname;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `trakt-arr-btn ${media.type}`;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'trakt-arr-btn-icon';
        iconSpan.innerHTML = isSonarr ? ICONS.sonarr : ICONS.radarr;

        const textSpan = document.createElement('span');
        textSpan.className = 'trakt-arr-btn-text';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'trakt-arr-btn-title';
        titleSpan.textContent = `Add to ${serviceName}`;

        const detailSpan = document.createElement('span');
        detailSpan.className = 'trakt-arr-btn-detail';
        detailSpan.textContent = '';

        textSpan.appendChild(titleSpan);
        textSpan.appendChild(detailSpan);
        btn.appendChild(iconSpan);
        btn.appendChild(textSpan);
        container.appendChild(btn);

        actionButtons.appendChild(container);

        // Pre-check library via fast cache or single lookup
        const savedUrl = await getVal(`${media.type}_url`, '');
        const savedKey = await getVal(`${media.type}_api_key`, '');
        let lookedUpItem = null;

        if (savedUrl && savedKey) {
            const cfg = { url: normalizeUrl(savedUrl), apiKey: savedKey };
            // First check fast memory cache
            await loadLibrary(media.type);
            if (isItemInLibrary(media.type, media)) {
                btn.classList.add('in-library');
                iconSpan.innerHTML = ICONS.check;
                titleSpan.textContent = `In ${serviceName}`;
                detailSpan.textContent = 'Open in ' + serviceName;
                const actualSlug = getActualLibrarySlug(media.type, media);
                btn.onclick = () => {
                    const targetUrl = isSonarr
                        ? `${cfg.url}/series/${actualSlug}`
                        : `${cfg.url}/movie/${actualSlug}`;
                    window.open(targetUrl, '_blank');
                };
                return;
            }

            try {
                detailSpan.textContent = 'Checking library...';
                lookedUpItem = isSonarr ? await lookupSonarr(cfg, media) : await lookupRadarr(cfg, media);

                if (lookedUpItem && lookedUpItem.id && lookedUpItem.id > 0) {
                    markItemInLibrary(media.type, media);
                    btn.classList.add('in-library');
                    iconSpan.innerHTML = ICONS.check;
                    titleSpan.textContent = `In ${serviceName}`;
                    detailSpan.textContent = 'Open in ' + serviceName;
                    btn.onclick = () => {
                        const targetUrl = isSonarr
                            ? `${cfg.url}/series/${lookedUpItem.titleSlug || media.slug || ''}`
                            : `${cfg.url}/movie/${lookedUpItem.titleSlug || lookedUpItem.tmdbId || media.slug || ''}`;
                        window.open(targetUrl, '_blank');
                    };
                    return;
                } else {
                    detailSpan.textContent = '';
                }
            } catch (_) {
                detailSpan.textContent = '';
            }
        }

        // Click handler to Add
        btn.onclick = async () => {
            btn.disabled = true;
            btn.classList.remove('error');
            const origIcon = iconSpan.innerHTML;
            iconSpan.innerHTML = ICONS.spinner;
            titleSpan.textContent = `Adding to ${serviceName}...`;
            detailSpan.textContent = '';

            try {
                const cfg = await getServiceConfig(media.type);
                if (!cfg) {
                    btn.disabled = false;
                    iconSpan.innerHTML = origIcon;
                    titleSpan.textContent = `Add to ${serviceName}`;
                    return;
                }

                const currentMedia = getMediaDetails() || media;
                if (!lookedUpItem) {
                    detailSpan.textContent = 'Looking up metadata...';
                    lookedUpItem = isSonarr ? await lookupSonarr(cfg, currentMedia) : await lookupRadarr(cfg, currentMedia);
                }

                if (!lookedUpItem) {
                    throw new Error(`Could not find "${currentMedia.title}" in ${serviceName} search.`);
                }

                if (lookedUpItem.id && lookedUpItem.id > 0) {
                    markItemInLibrary(media.type, currentMedia);
                    btn.classList.add('in-library');
                    iconSpan.innerHTML = ICONS.check;
                    titleSpan.textContent = `In ${serviceName}`;
                    detailSpan.textContent = 'Already in library';
                    btn.disabled = false;
                    btn.onclick = () => {
                        const targetUrl = isSonarr
                            ? `${cfg.url}/series/${lookedUpItem.titleSlug || ''}`
                            : `${cfg.url}/movie/${lookedUpItem.titleSlug || lookedUpItem.tmdbId || ''}`;
                        window.open(targetUrl, '_blank');
                    };
                    return;
                }

                detailSpan.textContent = 'Sending to ' + serviceName + '...';
                const addResult = isSonarr ? await addSonarr(cfg, lookedUpItem) : await addRadarr(cfg, lookedUpItem);

                markItemInLibrary(media.type, currentMedia);
                btn.classList.add('in-library');
                iconSpan.innerHTML = ICONS.check;
                titleSpan.textContent = `Added to ${serviceName}!`;
                detailSpan.textContent = 'Click to open';
                btn.disabled = false;

                const itemData = addResult || lookedUpItem;
                btn.onclick = () => {
                    const targetUrl = isSonarr
                        ? `${cfg.url}/series/${itemData.titleSlug || ''}`
                        : `${cfg.url}/movie/${itemData.titleSlug || itemData.tmdbId || ''}`;
                    window.open(targetUrl, '_blank');
                };
            } catch (err) {
                btn.classList.add('error');
                iconSpan.innerHTML = isSonarr ? ICONS.sonarr : ICONS.radarr;
                titleSpan.textContent = `Failed to add`;
                detailSpan.textContent = err.message || 'Error occurred';
                btn.disabled = false;

                if (err.message && err.message.includes('401')) {
                    await setVal(`${media.type}_api_key`, '');
                }
                alert(`Error adding to ${serviceName}:\n${err.message}`);
            }
        };
    }

    // --- Grid / List View: Card Button Setup ---
    // Zero server hammering:
    // 1. Preloads the library once in bulk via GET /api/v3/series and /api/v3/movie.
    // 2. All cards on page match in-memory in O(1) time without firing individual requests.
    // 3. Lookup & Add only execute on demand when the user clicks a specific button.
    async function setupCardButtons() {
        const actionBars = document.querySelectorAll('.quick-icons .actions, article.poster-card .actions, article.fanart-card .actions, [data-list-item] .actions');
        if (!actionBars || actionBars.length === 0) return;

        // Check which services we need based on cards on page
        let hasShows = false;
        let hasMovies = false;

        const cardDataList = [];
        for (const actionsEl of actionBars) {
            if (actionsEl.querySelector('.trakt-arr-card-action')) continue;

            const card = actionsEl.closest('article, [data-list-item], .poster-wrapper, .card, li');
            if (!card) continue;

            const link = card.querySelector('a[href*="/shows/"], a[href*="/movies/"]');
            if (!link) continue;

            const href = link.getAttribute('href') || '';
            const match = href.match(/\/(shows|movies)\/([^\/?#]+)/);
            if (!match) continue;

            const isShow = match[1] === 'shows';
            const type = isShow ? 'sonarr' : 'radarr';
            if (isShow) hasShows = true;
            else hasMovies = true;

            const slug = match[2];
            const canonicalHref = `/${match[1]}/${slug}`;

            // On episode cards (e.g. Dashboard / Up Next), h3 is the episode title ("1x03 Reign of Winter").
            // The show title is in a.show-link ("Pantheon").
            let title = '';
            if (isShow) {
                const showLink = card.querySelector('a.show-link');
                if (showLink && showLink.textContent.trim()) {
                    title = showLink.textContent.trim();
                }
            }
            if (!title) {
                const heading = card.querySelector('h3, .title');
                if (heading) {
                    title = heading.textContent.trim();
                }
            }
            if (!title) {
                title = link.getAttribute('aria-description') || slug.replace(/-/g, ' ');
            }

            const yearMatch = slug.match(/-(\d{4})$/);
            const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

            cardDataList.push({ actionsEl, type, slug, canonicalHref, title, year });
        }

        if (cardDataList.length === 0) return;

        // Warm up in-memory library cache (1 bulk call per service, cached 5 min)
        const promises = [];
        if (hasShows) promises.push(loadLibrary('sonarr'));
        if (hasMovies) promises.push(loadLibrary('radarr'));
        await Promise.all(promises);

        for (const item of cardDataList) {
            if (item.actionsEl.querySelector('.trakt-arr-card-action')) continue;

            const { actionsEl, type, slug, canonicalHref, title, year } = item;
            const isSonarr = type === 'sonarr';
            const serviceName = isSonarr ? 'Sonarr' : 'Radarr';

            const container = document.createElement('div');
            container.className = 'trakt-arr-card-action';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `trakt-arr-card-btn ${type}`;

            const inLib = isItemInLibrary(type, { slug, title, year });
            if (inLib) {
                btn.classList.add('in-library');
                btn.innerHTML = ICONS.check;
                btn.title = `In ${serviceName} (Click to open)`;
            } else {
                btn.innerHTML = isSonarr ? ICONS.sonarr : ICONS.radarr;
                btn.title = `Add to ${serviceName}`;
            }

            btn.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();

                const savedUrl = await getVal(`${type}_url`, '');
                const baseUrl = normalizeUrl(savedUrl);

                if (btn.classList.contains('in-library')) {
                    if (baseUrl) {
                        const actualSlug = btn.dataset.actualSlug || getActualLibrarySlug(type, { slug, title, year });
                        const targetUrl = isSonarr
                            ? `${baseUrl}/series/${actualSlug}`
                            : `${baseUrl}/movie/${actualSlug}`;
                        window.open(targetUrl, '_blank');
                    }
                    return;
                }

                btn.disabled = true;
                btn.classList.remove('error');
                btn.innerHTML = ICONS.spinner;
                btn.title = `Adding to ${serviceName}...`;

                try {
                    const cfg = await getServiceConfig(type);
                    if (!cfg) {
                        btn.disabled = false;
                        btn.innerHTML = isSonarr ? ICONS.sonarr : ICONS.radarr;
                        btn.title = `Add to ${serviceName}`;
                        return;
                    }

                    // Resolve exact TVDB / TMDB / IMDB IDs from Trakt canonical page on-demand
                    const traktData = await fetchMediaIdsFromTrakt(canonicalHref);
                    const lookupParams = {
                        tvdbId: traktData?.tvdbId,
                        tmdbId: traktData?.tmdbId,
                        imdbId: traktData?.imdbId,
                        year: traktData?.year || year,
                        title,
                        slug
                    };

                    const lookupResult = isSonarr
                        ? await lookupSonarr(cfg, lookupParams)
                        : await lookupRadarr(cfg, lookupParams);

                    if (!lookupResult) {
                        throw new Error(`Item not found in ${serviceName}`);
                    }

                    const actualSlug = lookupResult.titleSlug || slug;
                    btn.dataset.actualSlug = actualSlug;

                    if (lookupResult.id && lookupResult.id > 0) {
                        markItemInLibrary(type, { slug, title, year: lookupParams.year });
                        btn.classList.add('in-library');
                        btn.innerHTML = ICONS.check;
                        btn.title = `Already in ${serviceName} (Click to open)`;
                        btn.disabled = false;
                        return;
                    }

                    const addResult = isSonarr
                        ? await addSonarr(cfg, lookupResult)
                        : await addRadarr(cfg, lookupResult);

                    const finalSlug = addResult?.titleSlug || actualSlug;
                    btn.dataset.actualSlug = finalSlug;

                    markItemInLibrary(type, { slug, title, year: lookupParams.year });
                    btn.classList.add('in-library');
                    btn.innerHTML = ICONS.check;
                    btn.title = `Added to ${serviceName}! (Click to open)`;
                    btn.disabled = false;
                } catch (err) {
                    btn.classList.add('error');
                    btn.innerHTML = isSonarr ? ICONS.sonarr : ICONS.radarr;
                    btn.title = `Failed to add: ${err.message}`;
                    btn.disabled = false;
                    alert(`Error adding to ${serviceName}:\n${err.message}`);
                }
            };

            container.appendChild(btn);

            // Append into .tools if present (display: contents) or actionsEl
            const target = actionsEl.querySelector('.tools') || actionsEl;
            target.appendChild(container);
        }
    }

    // --- Master Runner & Lifecycle ---
    function runAll() {
        setupSummaryButton();
        setupCardButtons();
    }

    let checkInterval = null;
    function startChecking() {
        if (checkInterval) clearInterval(checkInterval);
        let attempts = 0;
        checkInterval = setInterval(() => {
            attempts++;
            runAll();
            if (attempts >= 15) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
        }, 300);
    }

    // Hook SPA navigation events
    window.addEventListener('popstate', startChecking);
    const origPushState = history.pushState;
    if (origPushState) {
        history.pushState = function(...args) {
            const res = origPushState.apply(this, args);
            startChecking();
            return res;
        };
    }
    const origReplaceState = history.replaceState;
    if (origReplaceState) {
        history.replaceState = function(...args) {
            const res = origReplaceState.apply(this, args);
            startChecking();
            return res;
        };
    }

    // Observe containers for DOM updates / infinite scroll
    const observer = new MutationObserver(() => {
        runAll();
    });

    function attachObserver() {
        const container = document.querySelector('main') || document.body;
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            attachObserver();
            startChecking();
        });
    } else {
        attachObserver();
        startChecking();
    }

    // --- Tampermonkey Menu Commands ---
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('Configure Sonarr Settings', async () => {
            const curUrl = await getVal('sonarr_url', 'http://localhost:8989');
            const curKey = await getVal('sonarr_api_key', '');
            const newUrl = prompt('Enter Sonarr Base URL:', curUrl);
            if (newUrl !== null) await setVal('sonarr_url', normalizeUrl(newUrl));
            const newKey = prompt('Enter Sonarr API Key:', curKey);
            if (newKey !== null) await setVal('sonarr_api_key', newKey.trim());
            libraryCache.sonarr = null; // Invalidate cache
            location.reload();
        });

        GM_registerMenuCommand('Configure Radarr Settings', async () => {
            const curUrl = await getVal('radarr_url', 'http://localhost:7878');
            const curKey = await getVal('radarr_api_key', '');
            const newUrl = prompt('Enter Radarr Base URL:', curUrl);
            if (newUrl !== null) await setVal('radarr_url', normalizeUrl(newUrl));
            const newKey = prompt('Enter Radarr API Key:', curKey);
            if (newKey !== null) await setVal('radarr_api_key', newKey.trim());
            libraryCache.radarr = null; // Invalidate cache
            location.reload();
        });
    }
})();
