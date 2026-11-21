// ==UserScript==
// @name         Redlib Reddit-Stream Link
// @namespace    iamkroot
// @version      2026-11-20
// @description  Adds a link in the top navbar to open the current thread in reddit-stream.com
// @author       iamkroot
// @match        https://redlib.kroot.dev/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit-stream.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function addStreamLink() {
        if (!window.location.pathname.includes('/comments/')) {
            return;
        }

        if (document.getElementById('reddit_stream_link')) {
            return;
        }

        const redditLink = document.getElementById('reddit_link');
        if (!redditLink) {
            return;
        }

        const streamLink = document.createElement('a');
        streamLink.id = 'reddit_stream_link';
        streamLink.href = 'https://reddit-stream.com' + window.location.pathname;
        streamLink.target = '_blank';
        streamLink.rel = 'noopener noreferrer';
        streamLink.style.marginLeft = '10px';

        const span = document.createElement('span');
        span.textContent = 'reddit-stream';
        streamLink.appendChild(span);

        // Mobile SVG icon (Redlib hides spans and displays svgs on screen <= 800px)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '5 3 19 12 5 21 5 3');
        svg.appendChild(polygon);
        streamLink.appendChild(svg);

        redditLink.after(streamLink);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addStreamLink);
    } else {
        addStreamLink();
    }
})();
