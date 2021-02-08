// ==UserScript==
// @name         Convert MathJax v2 to v3
// @namespace    iamkroot
// @version      0.1
// @description  Replace old mathjax script tags with inline symbols
// @author       iamkroot
// @match        https://heip.github.io/LeetCodePremium/problems/*
// @match        http://web.archive.org/web/*/https://www.leetfree.com/*
// @grant        none
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    for (let node of document.querySelectorAll('script[type^="math/tex"]')) {
        node.replaceWith(`\\(${node.textContent}\\)`);
    }
    let script = document.createElement("script");
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
    script.async = true;
    document.querySelector("head").appendChild(script);
})();
