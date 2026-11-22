// ==UserScript==
// @name         CBB Game Thread DaddyLive Stream
// @namespace    iamkroot
// @version      2026-11-20
// @description  Finds live streams on daddylive.app for College Basketball game threads and adds a direct stream link to the top navbar
// @author       iamkroot
// @match        https://redlib.kroot.dev/*
// @match        https://*.reddit.com/*
// @match        https://reddit.com/*
// @connect      daddylive.app
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // DaddyLive's internal source priority order from their homepage
    const LIVE_ORDER = [
        'tv19',
        'tv2',
        'tv3',
        'tv15',
        'tv7',
        'tv4',
        'tv18',
        'tv5',
        'tv13',
        'tv1',
        'tv17',
        'tv6',
        'tv8',
        'tv16',
        'tv12'
    ];

    function cleanString(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractTeams() {
        const headingEl = document.querySelector('h1.post_title, .post_title, a.title, shreddit-title, h1[slot="title"]');
        let rawTitle = '';

        if (headingEl) {
            const clone = headingEl.cloneNode(true);
            const flairs = clone.querySelectorAll('.post_flair, .flair');
            flairs.forEach((f) => f.remove());
            rawTitle = clone.textContent;
        }

        if (!rawTitle.trim()) {
            rawTitle = document.title || '';
        }

        if (!rawTitle || /post[\s-]?game\s+thread/i.test(rawTitle)) {
            return null;
        }

        let clean = rawTitle.replace(/\[?\s*game\s+thread\s*\]?:?/gi, ' ');
        clean = clean.replace(/#\s*\d+\s*/g, ' ');
        clean = clean.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
        clean = clean.replace(/\s+-\s+collegebasketball.*$/i, ' ');
        clean = clean.replace(/\s+-\s+reddit.*$/i, ' ');
        clean = clean.replace(/\s+/g, ' ').trim();

        const parts = clean.split(/\s+(?:@|vs\.?|at)\s+/i);
        if (parts.length < 2) {
            return null;
        }

        const team1 = cleanString(parts[0]);
        const team2 = cleanString(parts[1]);

        if (!team1 || !team2) {
            return null;
        }

        return { team1, team2 };
    }

    function fetchJSON(url) {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                fetch(url)
                    .then((res) => (res.ok ? res.json() : null))
                    .then(resolve)
                    .catch(() => resolve(null));
                return;
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                onload: (res) => {
                    try {
                        if (res.status >= 200 && res.status < 300) {
                            resolve(JSON.parse(res.responseText));
                        } else {
                            resolve(null);
                        }
                    } catch (_) {
                        resolve(null);
                    }
                },
                onerror: () => resolve(null)
            });
        });
    }

    function extractAllEvents(obj) {
        const events = [];
        function walk(node) {
            if (!node || typeof node !== 'object') return;
            if (node.event && Array.isArray(node.channels)) {
                events.push(node);
                return;
            }
            if (Array.isArray(node)) {
                for (const item of node) walk(item);
            } else {
                for (const val of Object.values(node)) walk(val);
            }
        }
        walk(obj);
        return events;
    }

    function getAllEmbedUrls(ev) {
        const urls = [];
        if (!ev || !Array.isArray(ev.channels)) return urls;
        for (const ch of ev.channels) {
            if (!ch) continue;
            for (let i = 1; i <= 20; i++) {
                if (ch[`embed_${i}`]) {
                    urls.push(ch[`embed_${i}`]);
                }
            }
        }
        return urls;
    }

    function getDaddyLivePageUrl(ev, sourceKey) {
        if (!ev || !Array.isArray(ev.channels)) {
            return Promise.resolve('https://daddylive.app/');
        }

        for (const ch of ev.channels) {
            if (!ch) continue;
            if (ch._href) {
                return Promise.resolve(`https://daddylive.app/${ch._href}`);
            }
            if (ch.channel_id) {
                return Promise.resolve(`https://daddylive.app/live/stream=${encodeURIComponent(ch.channel_id)}&source=${encodeURIComponent(sourceKey)}`);
            }
        }

        const embedUrls = getAllEmbedUrls(ev);
        if (embedUrls.length === 0) {
            return Promise.resolve('https://daddylive.app/');
        }

        return new Promise((resolve) => {
            const payload = JSON.stringify({ urls: embedUrls });
            const handleResponse = (responseText) => {
                try {
                    const json = JSON.parse(responseText);
                    if (json && json.success && json.token) {
                        resolve(`https://daddylive.app/${encodeURIComponent(json.token)}&source=${encodeURIComponent(sourceKey)}`);
                        return;
                    }
                } catch (_) {}
                resolve('https://daddylive.app/');
            };

            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'https://daddylive.app/?action=make_token',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    data: payload,
                    onload: (res) => handleResponse(res.responseText),
                    onerror: () => resolve('https://daddylive.app/')
                });
            } else {
                fetch('https://daddylive.app/?action=make_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                })
                    .then((r) => r.text())
                    .then(handleResponse)
                    .catch(() => resolve('https://daddylive.app/'));
            }
        });
    }

    function matchesEvent(evClean, team1, team2) {
        if (evClean.includes(team1) && evClean.includes(team2)) {
            return true;
        }

        const stopWords = new Set(['the', 'and', 'state', 'university', 'college']);
        const t1Words = team1.split(' ').filter((w) => w.length > 2 && !stopWords.has(w));
        const t2Words = team2.split(' ').filter((w) => w.length > 2 && !stopWords.has(w));

        const w1 = t1Words.length > 0 ? t1Words : team1.split(' ');
        const w2 = t2Words.length > 0 ? t2Words : team2.split(' ');

        const has1 = w1.every((w) => evClean.includes(w));
        const has2 = w2.every((w) => evClean.includes(w));

        return has1 && has2;
    }

    async function findStreamForTeams(team1, team2) {
        const feedEntries = await Promise.all(
            LIVE_ORDER.map(async (key) => ({
                key,
                data: await fetchJSON(`https://daddylive.app/player/${key}.json`)
            }))
        );

        for (const { key, data } of feedEntries) {
            if (!data) continue;
            const events = extractAllEvents(data);

            for (const ev of events) {
                const evClean = cleanString(ev.event);
                if (matchesEvent(evClean, team1, team2)) {
                    const pageUrl = await getDaddyLivePageUrl(ev, key);
                    return {
                        title: ev.event,
                        url: pageUrl
                    };
                }
            }
        }

        return null;
    }

    function insertNavbarButton(stream) {
        if (document.getElementById('daddylive_stream_link')) {
            return;
        }

        const streamLink = document.createElement('a');
        streamLink.id = 'daddylive_stream_link';
        streamLink.href = stream.url;
        streamLink.target = '_blank';
        streamLink.rel = 'noopener noreferrer';
        streamLink.style.marginLeft = '10px';
        streamLink.title = `Watch on DaddyLive: ${stream.title}`;

        const span = document.createElement('span');
        span.textContent = 'daddylive';
        streamLink.appendChild(span);

        // Mobile SVG icon (Redlib hides spans on screen <= 800px)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 3l14 9-14 9V3z');
        svg.appendChild(path);
        streamLink.appendChild(svg);

        // Insertion targets:
        const redditStreamLink = document.getElementById('reddit_stream_link');
        const redditLink = document.getElementById('reddit_link');
        const linksContainer = document.getElementById('links');

        if (redditStreamLink) {
            redditStreamLink.after(streamLink);
            return;
        }
        if (redditLink) {
            redditLink.after(streamLink);
            return;
        }
        if (linksContainer) {
            linksContainer.appendChild(streamLink);
            return;
        }

        // Old Reddit: #header-bottom-right
        const headerRight = document.getElementById('header-bottom-right');
        if (headerRight) {
            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.textContent = '|';
            headerRight.prepend(streamLink);
            headerRight.prepend(separator);
            return;
        }

        document.body.prepend(streamLink);
    }

    async function init() {
        if (!window.location.pathname.includes('/comments/')) {
            return;
        }

        const teams = extractTeams();
        if (!teams) {
            return;
        }

        const eventStream = await findStreamForTeams(teams.team1, teams.team2);
        if (eventStream) {
            insertNavbarButton(eventStream);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
