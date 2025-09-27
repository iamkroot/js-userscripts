// ==UserScript==
// @name         Splitwise Filter Uninvolved
// @namespace    iamkroot
// @version      0.1
// @description  Remove entries in "All Expenses" page where you were not involved
// @author       iamkroot
// @match        https://secure.splitwise.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=splitwise.com
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';
    // optional, set a text filter to only remove these expenses
    const FILTER = GM_getValue("textFilter", "");

    let removeDivs = (textFilter) => {
        let alldivs = document.querySelectorAll("div#expenses_list div.expense.summary.uninvolved");
        let toRemove = textFilter.length ? Array.from(alldivs).filter(
            div => div.querySelector(".description").textContent.includes(textFilter) && div.parentElement.parentElement.classList.contains("expense")
        ) : alldivs;
        for (let div of toRemove) {
            let parent = div.parentElement.parentElement;
            parent.remove();
        }
        console.log(`Removed ${toRemove.length} expenses`);
    };
    // called whenever the element is added
    function onElmAdded(selector, callback) {
        const observer = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                for (let elm of mutation.addedNodes) {
                    if (elm.matches !== undefined && elm.matches(selector)) {
                        callback(elm);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    onElmAdded("div#expenses", (expenses) => {
        console.log(expenses);
        const observer = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                if (mutation.addedNodes.length) {
                    removeDivs(FILTER);
                    break;
                }
            }
        });

        observer.observe(expenses, {
            childList: true,
            subtree: true
        });
    });
})();