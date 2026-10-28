// ==UserScript==
// @name         Slickdeals Block Deal Alerts
// @namespace    iamkroot
// @version      2026-10-28
// @description  Blocks Deal Alerts popup at the source via Slickdeals' built-in localStorage flag
// @author       iamkroot
// @match        https://slickdeals.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=slickdeals.net
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Slickdeals' GenericDealAlertsModal checks these keys before scheduling the 2-minute timer.
    // Setting genericDealAlertModal prevents the timer from starting and suppresses the modal entirely.
    try {
        localStorage.setItem('genericDealAlertModal', 'true');
        localStorage.setItem('genericDealAlertModalPersistent', JSON.stringify({ lifetimeShowCount: 999 }));
    } catch (_) {
        // Ignore Storage access restrictions
    }
})();
