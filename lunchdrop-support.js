// ==UserScript==
// @name         Lunchdrop auto support
// @namespace    iamkroot
// @version      2025-09-16
// @description  Set the value in the support field automatically
// @author       iamkroot
// @match        https://*.lunchdrop.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lunchdrop.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function waitForElm(selector, callback) {
        if (document.querySelector(selector)) {
            callback(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                callback(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    // FIXME: The site is SPA, so we should ideally handle in-place navigations to other dates.
    //  For now, we only check the support value on page load. Ideally, it should be done on every navigation.
    let supporttd = document.evaluate( "//td[contains(., 'Like what we do')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null ).snapshotItem(0);
    if (!supporttd) {
        console.error("Couldn't find support message");
        return;
    }
    const current_value = supporttd.nextSibling.textContent;
    const TARGET_VALUE = "$0.00";
    if (current_value != TARGET_VALUE) {
        console.log(`Updating support from ${current_value} to ${TARGET_VALUE}`);
        waitForElm(".modal-component", modal => {
            let inp = modal.querySelector("input");
            inp.value = TARGET_VALUE;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            modal.querySelector("button").click();
        });
        supporttd.firstElementChild.click();
    }
})();