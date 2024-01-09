// ==UserScript==
// @name         Notify for Howdy Queue
// @namespace    iamkroot
// @version      0.2.1
// @description  Send a notification whenever a new student joins the queue
// @author       iamkroot
// @match        https://queue.cs128.org/rooms/*/staff
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cs128.org
// @grant        GM_notification
// @grant        window.focus
// @run-at       document-end
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
    const infoFromRow = (tr) => ({
        studentName: tr.cells[0].textContent,
        desc: tr.cells[3].textContent,
        status: tr.cells[5].firstChild.tagName === "SPAN" ? "helping" : "unhelped",
    });

    const STALE_TIMEOUT_MS = 60 * 1000; // 60sec
    const checkStaleUnhelped = (tbody, info) => {
        for (let tr of tbody.rows) {
            const ri = infoFromRow(tr);
            if (info.studentName == ri.studentName && info.desc == ri.desc && ri.status == "unhelped") {
                const timeoutH = setTimeout(() => checkStaleUnhelped(tbody, info), STALE_TIMEOUT_MS)
                GM_notification({
                    text: info.desc,
                    title: "Howdy Queue - UNHELPED STUDENT " + info.studentName,
                    silent: false,
                    // ignore student for another minute
                    onclick: () => clearTimeout(timeoutH),
                });
                break;
            }
        }
    };
    // our main code start here
    // first, wait for table element to get loaded
    waitForElm("table").then((table) => {
        // now attach an observer to notify on new rows
        let tbody = table.tBodies[0];
        let obs = new MutationObserver((events) => {
            for (let event of events) {
                if (event.addedNodes.length != 0) {
                    for (let tr of event.addedNodes) {
                        if (tr.tagName != 'TR') continue;
                        const info = infoFromRow(tr);
                        if (info.status === "helping") continue;
                        const title = "Howdy Queue - New user " + info.studentName;
                        GM_notification({
                            text: info.desc,
                            title,
                            silent: false,
                            // switch to this tab when clicked
                            onclick: () => window.focus(),
                        });

                        setTimeout(() => checkStaleUnhelped(tbody, info), STALE_TIMEOUT_MS);
                    }
                    // not extracting any user info, just send a notif

                }
            }
        });
        obs.observe(tbody, {childList:true});
    });
})();
