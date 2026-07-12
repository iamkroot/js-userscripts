// ==UserScript==
// @name         Lunchdrop auto support
// @namespace    iamkroot
// @version      2026-07-12
// @description  Set the value in the support field automatically to hit a target total, with manual override support
// @author       iamkroot
// @match        https://*.lunchdrop.com/app/*
// @match        https://seattle.lunchdrop.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lunchdrop.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // CONFIGURATION
    // ==========================================
    // Set this to your employer subsidy cap.
    const TARGET_TOTAL_AMOUNT = 15.00;
    // ==========================================

    let isUpdating = false;

    /**
     * Waits for a specific element to appear in the DOM and then executes a callback.
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
                observer.disconnect();
                callback(elmOnMutation);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Bypasses React's synthetic event overriding to ensure the app registers the new input value.
     */
    function setReactInputValue(input, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, value);
        } else {
            input.value = value;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Intercepts manual saves to the Support modal and stores the user's intended value in localStorage.
     * We use the 'capture' phase (true) to ensure we grab the value before React unmounts the modal.
     */
    document.addEventListener('click', (e) => {
        // If the script is the one doing the clicking, ignore it.
        if (isUpdating) return;

        const modal = e.target.closest('.modal-component');
        if (!modal) return;

        const button = modal.querySelector('button');
        // Check if the user clicked the modal's save button
        if (button && (e.target === button || button.contains(e.target))) {
            const inp = modal.querySelector('input');
            if (inp) {
                // Extract float value from the input field
                const manualVal = parseFloat(inp.value.replace(/[^0-9.]/g, ''));
                
                if (!isNaN(manualVal)) {
                    // SPA Fix: Use the Date from the URL (e.g. 2026-07-17) as the unique identifier
                    const urlMatch = window.location.pathname.match(/\/app\/([\d-]+)/);
                    const orderDate = urlMatch ? urlMatch[1] : 'today';
                    
                    // Save the override tied strictly to THIS date
                    localStorage.setItem('lunchdrop_override', JSON.stringify({
                        id: orderDate,
                        amount: manualVal
                    }));
                    console.log(`Lunchdrop Script: Saved manual override of $${manualVal.toFixed(2)} for ${orderDate}`);
                }
            }
        }
    }, true);

    /**
     * Finds the support element, calculates the required support (or reads the override), and updates it.
     */
    function checkAndSetSupport() {
        if (isUpdating) return;

        // Use XPath to find the table cell containing the "Like what we do" text.
        const supporttd = document.evaluate("//td[contains(., 'Like what we do')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0);

        if (!supporttd || !supporttd.nextSibling) return;

        // Get live order date from the URL to use as the override ID
        const urlMatch = window.location.pathname.match(/\/app\/([\d-]+)/);
        const orderDate = urlMatch ? urlMatch[1] : 'today';

        // Find the full table to calculate the current subtotal/taxes/fees from the live DOM.
        // We MUST use closest('table') because React splits the food items 
        // and the summary rows into completely different <tbody> elements!
        const table = supporttd.closest('table');
        if (!table) return;

        let baseTotal = 0;
        const rows = table.querySelectorAll('tr');
        
        // Words that indicate a row is a summary, a discount, or the support itself, NOT a base cost item
        const skipKeywords = ['subtotal', 'total', 'due', 'discount', 'subsidy', 'like what we do', 'support', 'tip', 'balance'];

        // Sum up all line items before discounts to find the current base total
        for (const row of rows) {
            const cells = row.querySelectorAll('td, th');
            // We need at least a label cell and a price cell
            if (cells.length >= 2) {
                // Combine text of all cells EXCEPT the last one to form the label
                let labelText = "";
                for(let i = 0; i < cells.length - 1; i++) {
                    labelText += cells[i].textContent.toLowerCase().trim() + " ";
                }
                
                // The price is always in the last cell
                const valueText = cells[cells.length - 1].textContent.trim();

                let shouldSkip = false;
                for (const keyword of skipKeywords) {
                    if (labelText.includes(keyword)) {
                        shouldSkip = true;
                        break;
                    }
                }
                if (shouldSkip) continue;

                // Extract numeric value from the row
                const match = valueText.match(/^-?\$?([0-9,.]+)/);
                if (match) {
                    const isNegative = valueText.includes('-');
                    const val = parseFloat(match[1].replace(/,/g, ''));
                    
                    // Only add positive amounts (Food items, taxes, fees)
                    if (!isNegative && !isNaN(val)) {
                        baseTotal += val;
                    }
                }
            }
        }

        // Default Auto-calculation
        let requiredSupport = TARGET_TOTAL_AMOUNT - baseTotal;
        if (requiredSupport < 0) {
            requiredSupport = 0; // Prevent negative support amounts
        }

        // Check for User Manual Override in localStorage
        const overrideData = localStorage.getItem('lunchdrop_override');
        if (overrideData) {
            try {
                const parsed = JSON.parse(overrideData);
                // If the override matches the current day, use the user's manual number
                if (parsed.id === orderDate) {
                    requiredSupport = parsed.amount;
                } else {
                    // If it's a new day, wipe the old override so auto-calc resumes
                    localStorage.removeItem('lunchdrop_override');
                }
            } catch(e) {
                console.error("Lunchdrop Script: Failed to parse localStorage override.", e);
            }
        }

        const requiredSupportStr = "$" + requiredSupport.toFixed(2);
        const currentSupportStr = supporttd.nextSibling.textContent.trim();

        // If the current support does not match our required support, update it
        if (currentSupportStr !== requiredSupportStr) {
            isUpdating = true;
            console.log(`Lunchdrop Script: Base cost is $${baseTotal.toFixed(2)}. Target is $${TARGET_TOTAL_AMOUNT.toFixed(2)}. Setting support from ${currentSupportStr} to ${requiredSupportStr}`);

            // Click the "Edit" link within the support `td` to open the modal.
            if (supporttd.firstElementChild && typeof supporttd.firstElementChild.click === 'function') {
                supporttd.firstElementChild.click();
            } else {
                 console.error("Lunchdrop Script: Could not find a clickable element to open the support modal.");
                 isUpdating = false;
                 return;
            }

            // Wait for the modal to appear in the DOM.
            waitForElm(".modal-component", modal => {
                const inp = modal.querySelector("input");
                const button = modal.querySelector("button");

                if (!inp || !button) {
                     console.error("Lunchdrop Script: Could not find the input or button in the support modal.");
                     isUpdating = false;
                     return;
                }

                // Set the value using the React bypass and submit
                setReactInputValue(inp, requiredSupportStr);
                button.click();

                // Reset the lock after a network delay
                setTimeout(() => {
                    isUpdating = false;
                }, 2000);
            });

            // SAFETY: If the modal never appears, release the lock
            setTimeout(() => {
                if (isUpdating) {
                    isUpdating = false;
                }
            }, 6000);
        }
    }

    // --- Performance & Reliability Optimization ---
    let debounceTimer;

    const debouncedCheck = () => {
        clearTimeout(debounceTimer);
        // Wait 500ms after the DOM settles to ensure React is finished rendering
        debounceTimer = setTimeout(checkAndSetSupport, 500); 
    };

    const pageObserver = new MutationObserver(debouncedCheck);

    const startObserving = () => {
        if (document.body) {
            pageObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
            debouncedCheck(); // Run once immediately
        } else {
            document.addEventListener('DOMContentLoaded', startObserving);
        }
    };

    startObserving();

})();