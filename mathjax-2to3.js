// ==UserScript==
// @name         Convert MathJax v2 to v3
// @namespace    iamkroot
// @version      0.2
// @description  Replace old mathjax script tags with inline symbols
// @author       iamkroot
// @match        https://heip.github.io/LeetCodePremium/problems/*
// @match        http://web.archive.org/web/*/https://www.leetfree.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    let pseudoEl = document.createElement('textarea');
    const unescapeSymbols = (text) => {
        pseudoEl.innerHTML = text;
        return pseudoEl.innerText;
    }
    const replace = () => {
        let found = false;
        for (let node of document.querySelectorAll('script[type^="math/tex"]')) {
            node.replaceWith(`\\(${unescapeSymbols(node.textContent)}\\)`);
            found = true;
        }
        if (found){  // converted a node, page might still be loading, keep retrying
            console.log("Waiting");
            setTimeout(replace, 1000);
        } else {
            console.log("Inserting MathJax3");
            let script = document.createElement("script");
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
            script.async = true;
            document.querySelector("head").appendChild(script);
        }
    }
    replace();
})();
