// ==UserScript==
// @name         Nitter / Shitter Session Extractor
// @namespace    iamkroot
// @version      1.2
// @description  Extract X auth_token, ct0, id, and username as sessions.jsonl line
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_cookie
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  function listCookies(cb) {
    GM_cookie.list({ url: location.origin + '/', partitionKey: {} }, (cookies, err) => {
      if (!err && cookies && cookies.length > 0) return cb(cookies);
      GM_cookie.list({ url: location.origin + '/' }, (cookies2, err2) => {
        cb(cookies2 || [], err2 || err);
      });
    });
  }

  function extractSession() {
    listCookies((cookies, error) => {
      if (error) {
        alert('GM_cookie error: ' + error);
        return;
      }

      const byName = Object.fromEntries(cookies.map((c) => [c.name, c.value]));
      for (const pair of document.cookie.split('; ')) {
        const idx = pair.indexOf('=');
        if (idx > 0) {
          const k = pair.slice(0, idx);
          if (!(k in byName)) byName[k] = pair.slice(idx + 1);
        }
      }

      const ct0 = byName.ct0;
      if (!ct0) {
        alert('Missing ct0. Make sure you are logged in.');
        return;
      }

      const auth_token =
        byName.auth_token ||
        prompt('auth_token is HttpOnly here. Paste auth_token from DevTools -> Cookies -> x.com:')?.trim();

      if (!auth_token) return;

      const id = byName.twid
        ? decodeURIComponent(byName.twid).replace(/^u=/, '')
        : '';

      const profileHref = document
        .querySelector('a[data-testid="AppTabBar_Profile_Link"]')
        ?.getAttribute('href');
      const username = profileHref ? profileHref.replace(/^\//, '') : '';

      const line = JSON.stringify({
        kind: 'cookie',
        ...(username && { username }),
        ...(id && { id }),
        auth_token,
        ct0,
      });

      GM_setClipboard(line, 'text');
      alert('Copied sessions.jsonl line to clipboard:\n\n' + line);
    });
  }

  GM_registerMenuCommand('Copy Nitter session JSONL', extractSession);
})();
