// ==UserScript==
// @name         RealDebrid Magnet to Download
// @namespace    https://greasyfork.org/en/users/1285038-dddemrahc
// @version      0.6
// @description  Converts magnet links to Real Debrid links, unrestricts them, and copies the download link to the clipboard
// @author       DDDemrahc, Alistair1231
// @license MIT
// @match        *://1337x.to/*
// @match        *://www.avsforum.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL https://update.greasyfork.org/scripts/491878/RealDebrid%20Magnet%20to%20Download.user.js
// @updateURL https://update.greasyfork.org/scripts/491878/RealDebrid%20Magnet%20to%20Download.meta.js
// ==/UserScript==

(function () {
  'use strict';


  // get apitoken from storage
  const API_KEY = GM_getValue('API_KEY', '');
  if (!API_KEY) {
    // only ask when url is real-debrid.com, unless real-debrid.com/apitoken
    if (!window.location.hostname.includes('real-debrid.com') || window.location.href.includes('real-debrid.com/apitoken')) {
      return;
    }
    const newAPI_KEY = prompt('Please enter your Real Debrid API Key from https://real-debrid.com/apitoken:', '');
    GM_setValue('API_KEY', newAPI_KEY);
    API_KEY = newAPI_KEY;
  }

  const BASE_URL = 'https://api.real-debrid.com/rest/1.0/';

  function convertMagnetToRD(magnetLink) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: BASE_URL + 'torrents/addMagnet',
      data: 'magnet=' + encodeURIComponent(magnetLink),
      headers: {
        Authorization: 'Bearer ' + API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      onload: function (response) {
        if (response.status === 201) {
          const torrentId = JSON.parse(response.responseText).id;
          selectFiles(torrentId);
        } else {
          console.error('Error:', response.status, response.responseText);
        }
      },
    });
  }

  function selectFiles(torrentId) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: BASE_URL + 'torrents/selectFiles/' + torrentId,
      data: 'files=all',
      headers: {
        Authorization: 'Bearer ' + API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      onload: function (response) {
        if (response.status === 204) {
          getDownloadLink(torrentId);
        } else {
          console.error('Error:', response.status, response.responseText);
        }
      },
    });
  }


function getDownloadLink(torrentId) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: BASE_URL + 'torrents/info/' + torrentId,
        headers: {
            'Authorization': 'Bearer ' + API_KEY
        },
        onload: function(response) {
            if (response.status === 200) {
                const downloadLinks = JSON.parse(response.responseText).links;
                unrestrictLinks(downloadLinks);
            } else {
                console.error('Error:', response.status, response.responseText);
            }
        }
    });
}

function unrestrictLinks(links) {
    const unrestrictedLinks = [];

    function processLink(index) {
        if (index >= links.length) {
            console.log('Unrestricted download links:', unrestrictedLinks);
            GM_setClipboard(unrestrictedLinks.join('\n'));
            alert('Unrestricted download links copied to clipboard!');
            return;
        }

        const link = links[index];
        GM_xmlhttpRequest({
            method: 'POST',
            url: BASE_URL + 'unrestrict/link',
            data: 'link=' + encodeURIComponent(link),
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            onload: function(response) {
                if (response.status === 200) {
                    const unrestrictedLink = JSON.parse(response.responseText).download;
                    unrestrictedLinks.push(unrestrictedLink);
                    processLink(index + 1);
                } else {
                    console.error('Error:', response.status, response.responseText);
                }
            }
        });
    }

    processLink(0);
}

  // Convert magnet link when clicked
  document.addEventListener('click', function (event) {
    const target = event.target;
    console.log('target:', target);

    // click is done on a magnet link
    const link = target.href?.match(/magnet:.*/);
    // click is done on a child of a magnet link (example: https://jsfiddle.net/m9eLkf0a/ )
    const childLink = target.closest('a').href.match(/magnet:.*/);

    const magnetLink = link || childLink;

    if (magnetLink) {
      event.preventDefault();
      console.log('Converting magnet link:', magnetLink[0]);
      convertMagnetToRD(magnetLink[0]);
    }

  });
})();
