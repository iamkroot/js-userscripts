// ==UserScript==
// @name         FasterThanLime dark mode
// @namespace    iamkroot
// @version      0.1
// @description  Enable dark mode for FTL site by default
// @author       iamkroot
// @match        https://fasterthanli.me/*
// @icon         https://www.google.com/s2/favicons?domain=fasterthanli.me
// @grant        none
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    // set class
    document.getElementsByTagName("body")[0].classList.add("dark-mode");
    // hide toggle
    document.getElementsByClassName("light-switch")[0].style.display = "none";
})();