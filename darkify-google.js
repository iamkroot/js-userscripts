// ==UserScript==
// @name         Darkify Google Search
// @namespace    iamkroot
// @version      2025-01-04
// @description  Enable Dark theme in Google Search page if set to "device default"
// @author       iamkroot
// @match        https://www.google.com/search*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function onElmAdded(selector, callback) {
        let elem = document.querySelector(selector);
        if (elem) {
            callback(elem);
            return;
        }
        let foundElem = false;
        const observer = new MutationObserver((mutations, observer) => {
            console.log(mutations);
            for (let mutation of mutations) {
                for (let elm of mutation.addedNodes) {
                    elem = elm.querySelector !== undefined ? elm.querySelector(selector) : null;
                    if (elem) {
                        foundElem = true;
                        callback(elem);
                        observer.disconnect();
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        // abort if still connected after 5 seconds
        setTimeout(() => {
            if (!foundElem) {
                observer.disconnect();
                console.error("timeout finding the dark theme toggle!");
            }
        }, 5000);
    }

    const clickToggle = (toggleLinkElem) => {
        const textparts = toggleLinkElem.textContent.split("Dark theme");
        if (textparts.length !== 2) {
            console.error("Incorrect text in toggle elem");
            console.debug(toggleLinkElem);
            return;
        }
        console.debug("Dark theme state", textparts[1]);
        if (textparts[1] === "Device default") {
            toggleLinkElem.click();
        } else {
            console.log("Dark theme toggle already set to " + textparts[1]);
        }
    };

    onElmAdded('div[aria-label="Search settings"] a[href^="/setprefs"]', clickToggle);
})();