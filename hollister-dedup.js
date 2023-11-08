// ==UserScript==
// @name         Hollister Dedup
// @namespace    iamkroot
// @version      0.1
// @description  Deduplicate listings on Hollister website
// @author       iamkroot
// @match        https://www.hollisterco.com/shop/us/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hollisterco.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    // taken from https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    const killDups = (ulNode) => {
        let groups = Object.groupBy(ulNode.childNodes, li => {
            let aNode = li.querySelector(".catalog-productCard-module__product-content-link");
            if (aNode==null)return "";
            // let pathname = (new URL(aNode.href)).pathname;
            // TODO: even product names are not dup, need to hash the swatch contents
            let productName = aNode.querySelector(".product-name").textContent;
            let swatch = li.querySelector(".swtg-input-outer-wrapper");
            let num = swatch.childElementCount;
            if (swatch.lastChild.className == "catalog-productCard-module__swatchLength") {
                num += +swatch.lastChild.textContent - 1;
            }

            return productName + "##" + num;
        });
        for (let [key, val] of Object.entries(groups)) {
            if (key == "") continue;
            val.shift(); // keep first
            for (let v of val) {
                v.style.display = "none";
            }
        }
    }
    waitForElm(".product-grid__products").then(ulNode => {
        // TODO: Add MutationObserver to handle updates
        killDups(ulNode);
    });
})();