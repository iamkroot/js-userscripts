// ==UserScript==
// @name         Moodle Autologin
// @namespace    iamkroot
// @version      0.2
// @description  Save yourself a few clicks (2, to be precise). Autologin to BITS Moodle CMS using your BITSMail.
// @author       iamkroot
// @include      https://accounts.google.com/o/*
// @include      https://td.bits-hyderabad.ac.in/moodle/login/*
// @include      https://cms.bits-hyderabad.ac.in/login/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    switch(document.location.host) {
        case "cms.bits-hyderabad.ac.in":
        case "td.bits-hyderabad.ac.in": {
            document.querySelector("div.potentialidp a").click();
            break;
        }
        case "accounts.google.com": {
            if (!document.location.href.includes("bits-hyderabad.ac.in")) {
                console.log(document.location);
                break;
            }
            let emails = document.querySelectorAll('div#profileIdentifier');
            console.log(emails);
            for (let email of emails){
                if (email.innerText.includes("bits-pilani.ac.in")){
                    email.click();
                    setTimeout(()=>{console.log("click");email.click();}, 2000);
                    break;
                }
            }
            break;
        }
        default: {
            console.log(document.location);
        }
    }
})();