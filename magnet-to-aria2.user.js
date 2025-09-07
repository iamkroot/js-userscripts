// ==UserScript==
// @name         Real-Debrid Magnet Download to Aria2
// @namespace    iamkroot
// @version      2025-09-07
// @description  Converts magnet links to Real Debrid links, unrestricts them, and sends the download links to aria2. Based on the version 0.6 from https://greasyfork.org/en/scripts/491878-realdebrid-magnet-to-download/discussions/260242
// @author       DDDemrahc, Alistair1231, iamkroot
// @license      MIT
// @match        *://*/*
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
    // --- Aria2 JSON-RPC Configuration ---
    // The full URL to your Aria2 JSON-RPC endpoint.
    // Default is 'http://localhost:6800/jsonrpc'.
    const ARIA2_RPC_URL = 'http://localhost:6800/jsonrpc';
    // Your Aria2 RPC secret token. Leave empty if you don't have one.
    const ARIA2_RPC_SECRET = await (async () => {
        let secret = await GM.getValue('ARIA2_RPC_SECRET', '');
        if (!secret) {
            const newsecret = prompt('Please enter your ARIA2_RPC_SECRET:', '');
            if (newsecret) {
                await GM.setValue('ARIA2_RPC_SECRET', newsecret);
                secret = newsecret;

            }
        }
        return secret;
    })();
    // Your base download directory for Aria2. The torrent's folder name will be created inside this directory.
    const ARIA2_BASE_DOWNLOAD_DIR = 'Downloads';


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


    /**
     * Sends download links to the Aria2 JSON-RPC endpoint, preserving directory structure.
     * @param {{filePath: string, unrestrictedLink: string}[]} filesWithPaths - An array of objects containing the file path and the final download URL.
     * @param {string} torrentName - The original name of the torrent.
     * @returns {Promise<number>} A promise that resolves with the number of successfully sent links.
     */
    async function sendToAria2(filesWithPaths, torrentName) {
        if (!ARIA2_RPC_URL) {
            console.log('Aria2 RPC URL is not configured. Skipping.');
            return 0;
        }

        console.log(`Sending ${filesWithPaths.length} files to Aria2 at ${ARIA2_RPC_URL}`);

        // Sanitize torrent name to remove characters that are invalid in folder names
        const sanitizedTorrentName = torrentName.replace(/[\\/:*?"<>|]/g, '_').trim();
        const torrentDownloadDir = `${ARIA2_BASE_DOWNLOAD_DIR}/${sanitizedTorrentName}`;
        let successCount = 0;

        for (const file of filesWithPaths) {
            // The API provides paths starting with '/', like '/Movie.mkv' or '/Folder/Movie.mkv'
            // We remove the leading slash to correctly join path segments later.
            const relativePath = file.filePath.startsWith('/') ? file.filePath.substring(1) : file.filePath;

            const lastSlashIndex = relativePath.lastIndexOf('/');
            const filename = lastSlashIndex === -1 ? relativePath : relativePath.substring(lastSlashIndex + 1);
            const subdirectory = lastSlashIndex === -1 ? '' : relativePath.substring(0, lastSlashIndex);

            // Construct the final download directory path, including the torrent's main folder
            const downloadDir = subdirectory ? `${torrentDownloadDir}/${subdirectory}` : torrentDownloadDir;

            const options = {
                dir: downloadDir,
                out: filename,
            };

            const params = [[file.unrestrictedLink], options];

            // Prepend the secret token to params if it exists
            if (ARIA2_RPC_SECRET) {
                params.unshift(`token:${ARIA2_RPC_SECRET}`);
            }

            const payload = {
                jsonrpc: '2.0',
                id: `rd-script-${Date.now()}-${Math.random()}`,
                method: 'aria2.addUri',
                params: params,
            };

            try {
                await apiRequest({
                    method: 'POST',
                    url: ARIA2_RPC_URL,
                    data: JSON.stringify(payload),
                    headers: { 'Content-Type': 'application/json' },
                });
                console.log(`Successfully sent file to Aria2: ${filename} to ${downloadDir}`);
                successCount++;
            } catch (error) {
                console.error(`Failed to send link to Aria2: ${file.unrestrictedLink}`, error);
                // Optionally alert the user on the first failure
                if (successCount === 0 && filesWithPaths.indexOf(file) === 0) {
                     alert(`Failed to connect to Aria2 at ${ARIA2_RPC_URL}. Check the console and script settings.`);
                }
            }
        }
        return successCount;
    }


    // --- Main Application Logic ---

    // Get API key from storage. Use `let` because it might be updated.
    // We use the modern GM.* API which is promise-based.
    let apiKey = await (typeof GM.getValue === 'function' ? GM.getValue('API_KEY', '') : GM_getValue('API_KEY', ''));

    // If API key is not set, prompt the user for it under specific conditions.
    if (!apiKey) {
        // This logic asks for the key only on real-debrid.com, but not on the /apitoken page itself.
        if (window.location.hostname.includes('real-debrid.com') && !window.location.href.includes('real-debrid.com/apitoken')) {
            const newApiKey = prompt('Please enter your Real Debrid API Key from https://real-debrid.com/apitoken:', '');
            if (newApiKey) {
                if (typeof GM.setValue === 'function') {
                    await GM.setValue('API_KEY', newApiKey);
                } else {
                    GM_setValue('API_KEY', newApiKey);
                }
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
            const torrentName = torrentInfo.filename; // Get the torrent name for the folder

            // Create a mapping of selected file paths to the initial (restricted) links.
            // This is crucial for preserving the directory structure.
            const initialFiles = torrentInfo.files
                .filter(file => file.selected === 1) // Ensure we only process files that were actually selected.
                .map((file, index) => ({
                    path: file.path,
                    link: torrentInfo.links[index] // The 'links' array corresponds to the selected files.
                }));

            if (!initialFiles || initialFiles.length === 0) {
                alert('No download links were found for this torrent.');
                console.warn('No links found in torrent info response.');
                return;
            }
            console.log(`Found ${initialFiles.length} file links to process.`);

            // 4. Unrestrict Each Link
            const unrestrictedFiles = [];
            console.log('Unrestricting links...');
            for (const file of initialFiles) {
                try {
                    const unrestrictResponse = await apiRequest({
                        method: 'POST',
                        url: `${BASE_URL}unrestrict/link`,
                        data: `link=${encodeURIComponent(file.link)}`,
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    });
                    unrestrictedFiles.push({
                        filePath: file.path,
                        unrestrictedLink: unrestrictResponse.download
                    });
                } catch (error) {
                    console.error('An error occurred when unrestricting', file, error);
                }
            }
            console.log(`${unrestrictedFiles.length} of ${initialFiles.length} links have been unrestricted.`);

            // 5. Send to Aria2 and Copy to the Clipboard
            if (unrestrictedFiles.length > 0) {
                // Send files with their path info to Aria2
                const aria2SuccessCount = await sendToAria2(unrestrictedFiles, torrentName);
                if (aria2SuccessCount > 0) {
                    alert(`${aria2SuccessCount} of ${unrestrictedFiles.length} links were sent to Aria2.\n`);
                } else {
                    // Copy to clipboard as a fallback
                    const linksOnly = unrestrictedFiles.map(file => file.unrestrictedLink);
                    const linksText = linksOnly.join('\n');
                    if (typeof GM.setClipboard === 'function') {
                        await GM.setClipboard(linksText);
                    } else {
                        GM_setClipboard(linksText);
                    }
                    alert(`${unrestrictedFiles.length} links have been copied to your clipboard.`);
                }
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
