// ==UserScript==
// @name         Darebee timer fix
// @namespace    iamkroot
// @version      0.1
// @description  Fix offset of timer by using UTC times
// @author       iamkroot
// @match        https://darebee.com/programs/30-days-of-hiit.html?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=darebee.com
// @grant        none
// ==/UserScript==

window.updateDisplay = (elapsed) => {
    var minutes,
        seconds,
        millis;

    /* Get base values */
    millis = elapsed.getUTCMilliseconds();
    seconds = elapsed.getUTCSeconds();
    minutes = elapsed.getUTCMinutes();

    /* Make them nicer */
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    millis = millis < 100 ? (millis < 10 ? "00" + millis : "0" + millis) : millis;

    /* Update the HTML timer element */
    window.timer.innerHTML = [minutes, seconds].join(":");
}
