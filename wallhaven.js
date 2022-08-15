// ==UserScript==
// @name         Wallhaven Enhanced
// @namespace    iamkroot
// @version      0.2
// @description  Download and Fav the wallpaper; Press F to toggle Fullscreen
// @author       iamkroot
// @match        https://wallhaven.cc/w/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wallhaven.cc
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    function toggleFullscreen() {
        let elem = document.getElementById("wallpaper");

        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch((err) => {
                alert(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    function addToFav() {
        let elems = document.getElementsByClassName("add-fav");
        if (elems.length == 0) {
            console.warn('Unable to find "Add to Favorites" Button')
            return false;
        }
        let elem = elems[0];
        elem.click();
        return true;
    }

    function removeFromFav() {
        let elems = document.getElementsByClassName("rm-button in-favorites");
        if (elems.length == 0) {
            console.warn('Unable to find "Remove from Favorites" Button')
            return false;
        }
        let elem = elems[0];
        elem.click();
        return true;
    }

    function download() {
        let elem = document.getElementById("wallpaper");
        let url = elem.src;
        let options = {
            url,
            name: url.split("/").slice(-1)[0],
            onerror: (dl) => console.log(`Error while downloading ${dl.error} ${dl.details}`),
            saveAs: true,
        }
        GM_download(options);
    }

    function downloadAndFav() {
        download();
        addToFav();
    }

    document.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'a': addToFav(); break;
            case 'd': downloadAndFav(); break;
            case 'f': toggleFullscreen(); break;
            case 'r': removeFromFav(); break;
        }
    }, false);
})();