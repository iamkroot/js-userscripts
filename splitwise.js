// ==UserScript==
// @name         Splitwise Autofill
// @namespace    com.iamkroot
// @version      0.2
// @description  Autofill "unequal split" for an expense.
// @author       iamkroot
// @match        https://secure.splitwise.com/
// @icon         https://www.splitwise.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function get_bigrams(string){
        const s = string.toLowerCase()
        const v = s.split('');
        for(let i=0; i<v.length; i++){ v[i] = s.slice(i, i + 2); }
        return v;
    }

    function string_similarity(str1, str2){
        if(str1.length>0 && str2.length>0){
            const prefixScore = str1.startsWith(str2) || str2.startsWith(str1) ? 0.5 : 0.0;
            const pairs1 = get_bigrams(str1);
            const pairs2 = get_bigrams(str2);
            const union = pairs1.length + pairs2.length;
            let hits = 0;
            for(let x=0; x<pairs1.length; x++){
                for(let y=0; y<pairs2.length; y++){
                    if(pairs1[x]==pairs2[y]) hits++;
                }}
            if(hits>0) return prefixScore + ((2.0 * hits) / union);
        }
        return 0.0
    }

    let data = {"Aniket": "111.11", "Abhinav": "111.21"};

    function findMatch(tgtName, data, threshold=0.4) {
        let maxName, maxScore = -1, maxAmt;
        for (const [name, amt] of Object.entries(data)) {
            const score = string_similarity(tgtName, name);
            if (score > maxScore) {
                maxName = name;
                maxAmt = amt;
                maxScore = score;
            }
        }
        if (maxScore > threshold) {
            return [maxName, maxAmt, maxScore];
        } else {
            return ["", "", maxScore];
        }
    }

    const REM_WARN_ID = "xx-remainwarn";

    function getWarnSpan() {
        let el = document.getElementById(REM_WARN_ID);
        if(el !== null) { return el; }
        let splitDiv = document.getElementsByClassName("split_method unequal")[0];
        let button = splitDiv.getElementsByTagName("button")[0];
        el = document.createElement("span");
        el.id = REM_WARN_ID;
        button.insertAdjacentElement("afterend", el);
        return el;
    }

    function addWarning(remaining) {
        let warnSpan = getWarnSpan();
        const rem = Object.entries(remaining).map(([n,amt]) => `${n}(${amt})`).join(", ");
        const msg = "Remaining people- " + rem;
        warnSpan.textContent = msg;
        console.warn(msg);
    }

    function autofill(origData) {
        let data = structuredClone(origData);
        let splitDiv = document.getElementsByClassName("split_method unequal")[0];
        let people = splitDiv.getElementsByClassName("person");
        for (let personDiv of people) {
            const name = personDiv.getElementsByClassName("name")[0].textContent.trim();
            const [dataName, amt, score] = findMatch(name, data);
            let amtField = personDiv.getElementsByTagName("input")[0];
            if (dataName === "") {
                amtField.value = "";
                personDiv.title = "No match!! score=" + score;
            } else {
                delete data[dataName];
                personDiv.title = dataName;
                amtField.value = amt;
            }
        }
        if (Object.keys(data).length > 0) {
            addWarning(data);
        }
    }

    function parseData(textData) {
        const tx = textData.replaceAll("'", '"');
        let d = JSON.parse(tx);
        return Object.fromEntries(Object.entries(d).map(([n,x])=>[n.trim(), x.toString()]));
    }

    const TEXTAREA_ID = "ta-autofill";
    function createTextArea() {
        if (document.getElementById(TEXTAREA_ID) !== null) {
            // already added
            console.debug("Already added ta");
            return;
        }
        let el = document.createElement("textarea");
        el.id = TEXTAREA_ID;
        let splitDiv = document.getElementsByClassName("split_method unequal")[0];
        let head = splitDiv.getElementsByTagName("h3")[0];
        head.insertAdjacentElement("afterend", el)

        let butEl = document.createElement("button");
        butEl.insertAdjacentText("beforeend", "autofill");
        butEl.onclick = () => {
            let data = parseData(el.value);
            console.debug(data);
            autofill(data);
        }
        el.insertAdjacentElement("afterend", butEl);
        console.debug("Added ta", el);

        return el;
    }

    const choose_split_observer = new MutationObserver(
        (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (mutation.target.classList.contains("active")) {
                        console.log("Opened split view");
                        createTextArea();
                    } else {
                        console.debug("close choose_split", mutation.target);
                        // TODO: Remove the text area.
                    }
                }
            }
        }
    );


    const add_bill_observer = new MutationObserver(
        (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (mutation.target.classList.contains("in")) {
                        let chooseSplitDiv = document.getElementById("choose_split");
                        choose_split_observer.observe(chooseSplitDiv, {attributeFilter: ["class"]});
                    } else {
                        choose_split_observer.disconnect();
                        console.debug("close add_bill", mutation.target);
                    }
                }
            }
        }
    );
    let addBillDiv = document.getElementById("add_bill");
    add_bill_observer.observe(addBillDiv, {attributeFilter: ["class"]});
})();
