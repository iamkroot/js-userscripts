// ==UserScript==
// @name         Bilt charges
// @namespace    iamkroot
// @version      2026-08-28
// @description  Copy out bilt charges
// @author       iamkroot
// @match        https://www.bilt.com/account/home
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilt.com
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const clickButton = (targetSelector, timeout = 10000) =>
    new Promise((resolve, reject) => {
        // 1. Check if already present
        const existingButton = document.querySelector(targetSelector);
        if (existingButton) {
            existingButton.click();
            return resolve(existingButton);
        }

        // 2. Setup timeout to prevent infinite hang
        let timer = null;
        if (timeout > 0) {
            timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: "${targetSelector}" not found within ${timeout}ms`));
            }, timeout);
        }

        // 3. Observe dynamic additions
        const observer = new MutationObserver((mutations, obs) => {
            const button = document.querySelector(targetSelector);
            if (button) {
                if (timer) clearTimeout(timer);
                button.click();
                obs.disconnect();
                console.log('Userscript: Button clicked and observer disconnected.');
                resolve(button);
            }
        });

        // 4. document.documentElement is safe at all document readiness stages
        observer.observe(document.documentElement || document, {
            childList: true,
            subtree: true
        });
    });

    // taken from https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
    function waitForElm(selector, { parent = document, timeout = 0 } = {}) {
        return new Promise((resolve, reject) => {
            // 1. Check if the element is already present
            const existing = parent.querySelector(selector);
            if (existing) return resolve(existing);

            let timer = null;

            // 2. Set up observer
            const observer = new MutationObserver(() => {
                const elm = parent.querySelector(selector);
                if (elm) {
                    if (timer) clearTimeout(timer);
                    observer.disconnect();
                    resolve(elm);
                }
            });

            // 3. Optional timeout to prevent infinite pending promises
            if (timeout > 0) {
                timer = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`waitForElm timed out after ${timeout}ms: "${selector}"`));
                }, timeout);
            }

            // 4. Target element root safely
            const targetNode = parent === document ? document.documentElement : parent;
            observer.observe(targetNode, {
                childList: true,
                subtree: true
            });
        });
    }

    /*Run this on the console of a bilt charges page*/
    async function copyCharges() {
        let price_regex = /\$[0-9,]+(\.\d+)?/;
        const cleanP = v => v.match(price_regex)[0].slice(1).replace(',', '');
        let totalD = document.querySelector('[data-testid="balance-value-container"]');
        let total = cleanP(totalD.textContent);
        let topD = document.querySelector('div:has(> div > div[aria-label="refresh ledger"])');
        if (!topD) {
            totalD.parentElement.querySelector('button').click();
            topD = await waitForElm('div:has(> div > div[aria-label="refresh ledger"])');
        };
        let rows = Array.from(topD.childNodes).slice(1, -1);
        let res = rows.map(row => ({
            date: row.childNodes[0].textContent,
            name: row.childNodes[1].firstChild.textContent,
            desc: row.childNodes[1].lastChild.textContent.replace(row.childNodes[1].firstChild.textContent, '').trim(),
            price: cleanP(row.childNodes[2].textContent),
            qty: 1,
        }))
        .map(f => `${f.qty}\t${f.name} ${f.desc}\t${f.price}`).join('\n');
        await GM.setClipboard(`!paid: ${total}\n!paid-by: krut\n\n${res}\n`, "text");
    };
    GM_registerMenuCommand("Extract charges", function(event) {
        copyCharges();
        console.log("Charges extracted");
    }, "c");
})();