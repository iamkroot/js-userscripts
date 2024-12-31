// ==UserScript==
// @name         Wordle Stats
// @namespace    iamkroot
// @version      2024-12-31
// @description  Bring back stats view
// @author       iamkroot
// @match        https://www.nytimes.com/games/wordle/index.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nytimes.com
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

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
    onElmAdded("#regiwall-dialog", dialogbox => {
        let toReplace = dialogbox.querySelector("h1[class^=Header-module_regiwallText]");
        if (!toReplace) {
            console.error("Couldn't find a target to replace. They changed the element classes :(");
            return;
        }
        let insertDiv = `<div class="Stats-module_statsContainer__g23s0"><h2 class="Stats-module_statisticsHeading__CExdL">Statistics</h2><ul class="Stats-module_statistics__oFLEK"><li class="Stats-module_statisticContainer__woJli"><span class="visually-hidden">Number of games played, 1</span><div class="Stats-module_statistic__u5db0" aria-hidden="true">1</div><div class="Stats-module_label__sQwFu" aria-hidden="true">Played</div></li><li class="Stats-module_statisticContainer__woJli"><span class="visually-hidden">Win percentage, 0</span><div class="Stats-module_statistic__u5db0" aria-hidden="true">0</div><div class="Stats-module_label__sQwFu" aria-hidden="true">Win %</div></li><li class="Stats-module_statisticContainer__woJli"><span class="visually-hidden">Current Streak count, 0</span><div class="Stats-module_statistic__u5db0" aria-hidden="true">0</div><div class="Stats-module_label__sQwFu" aria-hidden="true">Current Streak</div></li><li class="Stats-module_statisticContainer__woJli"><span class="visually-hidden">Max Streak count, 0</span><div class="Stats-module_statistic__u5db0" aria-hidden="true">0</div><div class="Stats-module_label__sQwFu" aria-hidden="true">Max Streak</div></li></ul><div class="Stats-module_statsBtnLeft__IyDkc"><h2 class="Stats-module_guessDistributionCopy__ydhXT">Guess Distribution</h2></div><div class="Stats-module_guessDistribution__ibfJS"><div class="Stats-module_graphContainer__Al4D1" role="img" aria-label="0 solved in 1st attempt"><div class="Stats-module_guess__Fc0Xn" aria-hidden="true">1</div><div class="Stats-module_graph__f4tUv" aria-hidden="true"><div style="width: 7%;" class="Stats-module_graphBar__HvdG8"><div class="Stats-module_numGuesses__jFa2m">0</div></div></div></div><div class="Stats-module_graphContainer__Al4D1" role="img" aria-label="0 solved in 2nd attempt"><div class="Stats-module_guess__Fc0Xn" aria-hidden="true">2</div><div class="Stats-module_graph__f4tUv" aria-hidden="true"><div style="width: 7%;" class="Stats-module_graphBar__HvdG8"><div class="Stats-module_numGuesses__jFa2m">0</div></div></div></div><div class="Stats-module_graphContainer__Al4D1" role="img" aria-label="0 solved in 3rd attempt"><div class="Stats-module_guess__Fc0Xn" aria-hidden="true">3</div><div class="Stats-module_graph__f4tUv" aria-hidden="true"><div style="width: 7%;" class="Stats-module_graphBar__HvdG8"><div class="Stats-module_numGuesses__jFa2m">0</div></div></div></div><div class="Stats-module_graphContainer__Al4D1" role="img" aria-label="0 solved in 4th attempt"><div class="Stats-module_guess__Fc0Xn" aria-hidden="true">4</div><div class="Stats-module_graph__f4tUv" aria-hidden="true"><div style="width: 7%;" class="Stats-module_graphBar__HvdG8"><div class="Stats-module_numGuesses__jFa2m">0</div></div></div></div><div class="Stats-module_graphContainer__Al4D1" role="img" aria-label="0 solved in 5th attempt"><div class="Stats-module_guess__Fc0Xn" aria-hidden="true">5</div><div class="Stats-module_graph__f4tUv" aria-hidden="true"><div style="width: 7%;" class="Stats-module_graphBar__HvdG8"><div class="Stats-module_numGuesses__jFa2m">0</div></div></div></div><div class="Stats-module_graphContainer__Al4D1" role="img" aria-label="0 solved in 6th attempt"><div class="Stats-module_guess__Fc0Xn" aria-hidden="true">6</div><div class="Stats-module_graph__f4tUv" aria-hidden="true"><div style="width: 7%;" class="Stats-module_graphBar__HvdG8"><div class="Stats-module_numGuesses__jFa2m">0</div></div></div></div></div></div>`;
        toReplace.parentElement.outerHTML = insertDiv;
        let mainDiv = dialogbox.querySelector("div[class^=Stats-module_statsContainer]");
        let topbar = mainDiv.children[1];
        if (topbar.childElementCount != 4) return;
        let numgames = topbar.children[0];
        let winpercent = topbar.children[1];
        let currentStreak = topbar.children[2];
        let bestStreak = topbar.children[3];

        let stats = window.localStorage.getItem("wordle-legacy-stats-ANON");
        if (!stats) {
            console.error("Could not get stats!!");
            console.log("Here's the last saved copy:", GM_getValue("wordleStats"));
            return;
        }
        // backup in case NYTimes ever decides to clear the local stats
        GM_setValue("wordleStats", stats);
        let v = JSON.parse(stats);
        console.log({"foundstats": v});
        numgames.children[1].innerText = v.gamesPlayed;
        winpercent.children[1].innerText = (100 * v.gamesWon / v.gamesPlayed).toPrecision(2);
        currentStreak.children[1].innerText = v.currentStreak;
        bestStreak.children[1].innerText = v.maxStreak;

        let guessDist = mainDiv.lastChild;
        let maxVal = Math.max(...[1,2,3,4,5,6].map(i=>v.guesses[i]));
        [1,2,3,4,5,6].forEach(i => {
            let res = v.guesses[i];
            let c = guessDist.children[i-1];
            c.lastChild.firstChild.firstChild.innerText = res;
            let width = (7 + 93 * res / maxVal).toPrecision(2);
            c.lastChild.firstChild.style.width = `${width}%`;
        });

    });
})();