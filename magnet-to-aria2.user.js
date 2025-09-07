// ==UserScript==
// @name         Async Real-Debrid Magnet Converter
// @namespace    iamkroot
// @version      2025-09-07:1
// @description  IConverts magnet links to Real Debrid links, unrestricts them, and copies the download link to the clipboard
// @author       DDDemrahc, Alistair1231, iamkroot
// @license MIT
// @match        *://1337x.to/*
// @match        *://real-debrid.com/*
// @match        *://www.avsforum.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.setClipboard
// ==/UserScript==

(async () => {
    'use strict';

    // --- Configuration ---
    const BASE_URL = 'https://api.real-debrid.com/rest/1.0/';

    // --- Helper Function for API Requests ---

    /**
     * A modern wrapper for GM_xmlhttpRequest that returns a Promise.
     * This allows us to use async/await for network requests.
     * @param {object} options - The options for GM_xmlhttpRequest.
     * @returns {Promise<any>} A promise that resolves with the parsed JSON response or rejects with an error.
     */
    function apiRequest(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                onload: response => {
                    // Resolve on successful status codes (200-299)
                    if (response.status >= 200 && response.status < 300) {
                        // Handle 204 No Content, which has an empty response body
                        const responseData = response.responseText ? JSON.parse(response.responseText) : null;
                        resolve(responseData);
                    } else {
                        // Reject on error status codes
                        reject({
                            status: response.status,
                            statusText: response.statusText,
                            responseText: response.responseText
                        });
                    }
                },
                onerror: error => reject(error),
                ontimeout: () => reject(new Error('Request timed out.'))
            });
        });
    }


    // --- Main Application Logic ---

    // Get API key from storage. Use `let` because it might be updated.
    // We use the modern GM.* API which is promise-based.
    let apiKey = await GM.getValue('API_KEY', '');

    // If API key is not set, prompt the user for it under specific conditions.
    if (!apiKey) {
        // This logic asks for the key only on real-debrid.com, but not on the /apitoken page itself.
        if (window.location.hostname.includes('real-debrid.com') && !window.location.href.includes('real-debrid.com/apitoken')) {
            const newApiKey = prompt('Please enter your Real Debrid API Key from https://real-debrid.com/apitoken:', '');
            if (newApiKey) {
                await GM.setValue('API_KEY', newApiKey);
                apiKey = newApiKey;
            }
        }
    }

    // If we still don't have an API key, we can't proceed.
    if (!apiKey) {
        console.log('Real-Debrid API key not configured. Script is idle.');
        return;
    }


    /**
     * The complete, asynchronous workflow for converting a magnet link.
     * @param {string} magnetLink - The magnet link to process.
     */
    async function convertAndProcessMagnet(magnetLink) {
        console.log('Starting magnet link conversion process...');
        try {
            // 1. Add Magnet Link to Real-Debrid
            const addMagnetResponse = await apiRequest({
                method: 'POST',
                url: `${BASE_URL}torrents/addMagnet`,
                data: `magnet=${encodeURIComponent(magnetLink)}`,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const torrentId = addMagnetResponse.id;
            console.log(`Magnet added successfully. Torrent ID: ${torrentId}`);

            // 2. Select All Files in the Torrent
            await apiRequest({
                method: 'POST',
                url: `${BASE_URL}torrents/selectFiles/${torrentId}`,
                data: 'files=all',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            console.log('All files selected for download.');

            // 3. Get Torrent Info to Retrieve Download Links
            console.log('Fetching torrent information...');
            const torrentInfo = await apiRequest({
                method: 'GET',
                url: `${BASE_URL}torrents/info/${torrentId}`,
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            const initialLinks = torrentInfo.links;
            if (!initialLinks || initialLinks.length === 0) {
                alert('No download links were found for this torrent.');
                console.warn('No links found in torrent info response.');
                return;
            }
            console.log(`Found ${initialLinks.length} file links to process.`);

            // 4. Unrestrict Each Link
            const unrestrictedLinks = [];
            console.log('Unrestricting links...');
            for (const link of initialLinks) {
                const unrestrictResponse = await apiRequest({
                    method: 'POST',
                    url: `${BASE_URL}unrestrict/link`,
                    data: `link=${encodeURIComponent(link)}`,
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                unrestrictedLinks.push(unrestrictResponse.download);
            }
            console.log('All links have been unrestricted.');

            // 5. Copy the Final Links to the Clipboard
            if (unrestrictedLinks.length > 0) {
                const linksText = unrestrictedLinks.join('\n');
                await GM.setClipboard(linksText);
                alert(`${unrestrictedLinks.length} unrestricted download links copied to clipboard!`);
            } else {
                alert('Could not unrestrict any download links.');
            }

        } catch (error) {
            console.error('An error occurred during the Real-Debrid process:', error);
            alert(`An error occurred. Check the browser console for details.\nStatus: ${error.statusText || 'Unknown'}`);
        }
    }


    // --- Event Listener ---

    /**
     * Handles clicks on the document to find and process magnet links.
     * @param {MouseEvent} event - The click event.
     */
    async function handleMagnetClick(event) {
        // Use .closest('a') to ensure we get the link, even if a child element is clicked.
        const target = event.target.closest('a');
        if (!target || !target.href) {
            return;
        }

        const magnetMatch = target.href.match(/magnet:.*/);
        if (magnetMatch) {
            event.preventDefault();
            const magnetLink = magnetMatch[0];
            await convertAndProcessMagnet(magnetLink);
        }
    }

    document.addEventListener('click', handleMagnetClick);

})();