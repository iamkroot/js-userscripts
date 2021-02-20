// ==UserScript==
// @name         Leetfree redirector
// @namespace    iamkroot
// @version      0.2
// @description  Redirect locked Leetcode questions to leetfree site
// @author       iamkroot
// @match        https://leetcode.com/problems/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    const insertHeader = (url, headerEl) => {
        let free_node = headerEl.cloneNode(true);
        free_node.setAttribute('data-cy', 'leetfree');
        free_node.setAttribute('data-key', 'leetfree');
        let a_node = free_node.querySelector("a");
        a_node.href = url;
        a_node.querySelectorAll("span")[1].innerText = "LF";
        headerEl.parentElement.appendChild(free_node);
    }
    'use strict';
    let desc = document.querySelector("div[data-cy='description-content']");
    const new_subpath = document.location.pathname.replace(/\/$/, ".html");
    const url = "https://heip.github.io/LeetCodePremium" + new_subpath;
    const insertNew = () => {
        const desc = document.querySelector("div[data-cy='description']");
        if (desc == null) {
            return setTimeout(insertNew, 1000);
        }
        insertHeader(url, desc);
    }
    insertNew();
})();
