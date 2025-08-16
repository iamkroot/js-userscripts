// ==UserScript==
// @name         AW Sidebar hider
// @namespace    iamkroot
// @version      2025-08-16
// @description  Clicks the hide button after load
// @author       iamkroot
// @match        https://wiki.archlinux.org/title/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=archlinux.org
// @grant        GM_cookie
// @run-at document-idle
// ==/UserScript==

(function() {
    'use strict';

    // setting cookie doesn't really work, even at document-start
    GM_cookie.set({
        name: 'archwikimwclientpreferences',
        value: 'vector-feature-appearance-pinned-clientpref-0',
        path: "/",
    });
    // click the hide button after 1 second
    const button = document.querySelector('[data-event-name="pinnable-header.vector-appearance.unpin"]');
    if (!button) {
        console.error("Can't find 'Hide' button");
        return;
    }
    for (let i = 0; i < 1; ++i) {
        setTimeout(() => {
            if (button.checkVisibility()) {
                console.log("Auto hiding", button);
                button.click();
            }
        }, 1000);
    }
})();