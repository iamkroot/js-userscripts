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

    // A flag to prevent the script from trying to update the value multiple times at once.
    let isUpdating = false;

    /**
     * Waits for a specific element to appear in the DOM and then executes a callback.
     * @param {string} selector The CSS selector of the element to wait for.
     * @param {function(Element)} callback The function to execute once the element is found.
     */
    function waitForElm(selector, callback) {
        const elm = document.querySelector(selector);
        if (elm) {
            callback(elm);
            return;
        }

        const observer = new MutationObserver(mutations => {
            const elmOnMutation = document.querySelector(selector);
            if (elmOnMutation) {
                callback(elmOnMutation);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Finds the support element, checks its value, and clicks to update it if it's not $0.00.
     * This function is designed to be called any time the DOM might have changed.
     */
    function checkAndSetSupport() {
        // If an update process is already running, exit to avoid conflicts.
        if (isUpdating) {
            return;
        }

        // Use XPath to find the table cell containing the "Like what we do" text.
        const supporttd = document.evaluate("//td[contains(., 'Like what we do')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0);

        // If the element isn't found or doesn't have a sibling with the value, it's not on the current view.
        if (!supporttd || !supporttd.nextSibling) {
            return;
        }

        const current_value = supporttd.nextSibling.textContent.trim();
        const TARGET_VALUE = "$0.00";

        if (current_value !== TARGET_VALUE) {
            // The value is incorrect. Set a lock and begin the update process.
            isUpdating = true;
            console.log(`Updating support from ${current_value} to ${TARGET_VALUE}`);

            // Click the "Edit" link within the support `td` to open the modal.
            if (supporttd.firstElementChild && typeof supporttd.firstElementChild.click === 'function') {
                supporttd.firstElementChild.click();
            } else {
                 console.error("Lunchdrop Script: Could not find a clickable element to open the support modal.");
                 isUpdating = false; // Reset lock if the click target isn't found.
                 return;
            }

            // Now, wait for the modal to appear in the DOM.
            waitForElm(".modal-component", modal => {
                const inp = modal.querySelector("input");
                const button = modal.querySelector("button");

                if (!inp || !button) {
                     console.error("Lunchdrop Script: Could not find the input or button in the support modal.");
                     isUpdating = false; // Reset lock if modal content is unexpected.
                     return;
                }

                // Set the value to $0.00, dispatch events to ensure the app recognizes the change, and click submit.
                inp.value = TARGET_VALUE;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
                button.click();

                // Reset the lock after a short delay to allow the DOM to update and prevent re-triggering.
                setTimeout(() => {
                    isUpdating = false;
                }, 1500);
            });
        }
    }

    // --- Performance Optimization ---
    let debounceTimer;

    // This debounced function will prevent our expensive check from running on every single mutation.
    const debouncedCheck = () => {
      clearTimeout(debounceTimer);
      // We wait 300ms after the last DOM change before executing the check.
      // This groups rapid-fire mutations (like a view re-rendering) into a single check.
      debounceTimer = setTimeout(checkAndSetSupport, 300);
    };

    // A MutationObserver will watch for DOM changes and call our debounced check function.
    const pageObserver = new MutationObserver(debouncedCheck);

    // Start observing the entire document body for any added/removed nodes.
    pageObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also, run the check once when the script first loads, in case the content is already present.
    checkAndSetSupport();

})();

