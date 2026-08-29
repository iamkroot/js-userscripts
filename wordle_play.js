// ==UserScript==
// @name         Let me play wordle
// @namespace    http://tampermonkey.net/
// @version      2026-07-27
// @description  Clicks the "play" button
// @author       iamkroot
// @match        https://www.nytimes.com/games/wordle/index.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nytimes.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const targetSelector ='button[data-testid="Play"]';

    // 1. First, check if the element is already on the page when the script runs
    const existingButton = document.querySelector(targetSelector);
    if (existingButton) {
        existingButton.click();
        return; // Exit early, no need for the observer
    }

    // 2. Set up the MutationObserver for dynamically loaded content
    const observer = new MutationObserver((mutations, obs) => {
        const button = document.querySelector(targetSelector);

        if (button) {
            button.click();
            obs.disconnect(); // Disable the observer immediately after clicking
            console.log('Auto Close Userscript: Button clicked and observer disconnected.');
        }
    });

    // 3. Start observing the document body for added nodes
    // childList: true watches for direct children added/removed
    // subtree: true watches all descendants
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();