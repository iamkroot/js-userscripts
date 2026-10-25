// ==UserScript==
// @name         Walmart Bill Extractor
// @namespace    iamkroot
// @version      2026-10-24
// @description  Extract Walmart order details into bill-split format
// @author       iamkroot
// @match        https://www.walmart.com/orders*
// @match        https://www.walmart.com/order-details*
// @match        https://www.walmart.com/order-history*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=walmart.com
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    function extractBill() {
        // 1. Total payment: Check payment section rows for "Total", fallback to payment methods sum
        let total = '0.00';
        const rows = Array.from(document.querySelectorAll('.print-bill-payment-section .flex-row.justify-between, .print-bill-payment-section [class*="justify-between"]'));
        for (const row of rows) {
            const label = row.querySelector('span, div')?.textContent?.trim().toLowerCase();
            if (label === 'total' || label === 'total paid' || label === 'order total') {
                const m = row.textContent.match(/\$\s*(\d+(?:\.\d{2})?)/);
                if (m) {
                    total = parseFloat(m[1]).toFixed(2);
                    break;
                }
            }
        }

        // Fallback: Sum payment methods (e.g. credit card + Walmart Cash)
        if (total === '0.00') {
            const paymentCards = Array.from(document.querySelectorAll('[data-testid="payment-methods"] .bill-order-payment-card > div, .bill-order-payment-cards .flex.items-center'));
            if (paymentCards.length > 0) {
                let sum = 0, found = false;
                for (const card of paymentCards) {
                    const m = card.textContent.match(/\$\s*(\d+(?:\.\d{2})?)/);
                    if (m) {
                        sum += parseFloat(m[1]);
                        found = true;
                    }
                }
                if (found && sum > 0) total = sum.toFixed(2);
            }
        }

        // Legacy fallback
        if (total === '0.00') {
            const legacyEl = document.querySelector('div.bill-order-total-payment') ||
                             document.querySelector('.print-bill-payment-section .f2');
            const m = legacyEl?.textContent?.match(/\$\s*(\d+(?:\.\d{2})?)/);
            if (m) total = parseFloat(m[1]).toFixed(2);
        }

        // 2. Order items: Support both modern [data-testid='productName'] and legacy a[link-identifier='itemClick']
        const mainCont = document.querySelector("[data-testid='orderInfoCard']") || document;
        let itemNames = Array.from(mainCont.querySelectorAll("[data-testid='productName']"));
        if (itemNames.length === 0) {
            itemNames = Array.from(mainCont.querySelectorAll("a[link-identifier='itemClick']"));
        }

        const qts = Array.from(mainCont.querySelectorAll("div.bill-item-quantity"));
        const prices = Array.from(mainCont.querySelectorAll("div[data-testid='line-price']"));
        const imgs = Array.from(mainCont.querySelectorAll("img[data-testid='productTileImage']"));

        if (itemNames.length === 0) {
            console.warn('[Walmart Bill Extractor] No product items found.');
            return null;
        }

        const priceRegex = /\$\d+(\.\d+)?/;
        const billRows = itemNames.map((it, i) => {
            const name = it.textContent.replace(/\s+/g, ' ').trim();
            const qtyText = qts[i]?.innerText || qts[i]?.textContent || '1';
            const qtyMatch = qtyText.match(/\d+/);
            const qty = qtyMatch ? qtyMatch[0] : '1';

            const priceText = prices[i]?.firstChild?.textContent || prices[i]?.textContent || '$0.00';
            const pMatch = priceText.match(priceRegex);
            const price = pMatch ? pMatch[0].slice(1) : '0.00';

            const unavailable = imgs[i] ? imgs[i].classList.contains("o-30") : false;

            return { name, qty, price, unavailable };
        })
        .filter(it => !it.unavailable)
        .map(f => `${f.qty}\t${f.name}\t${f.price}`).join('\n');

        const output = `!paid: ${total}\n!paid-by: krut\n\n${billRows}\n`;
        return { output, total, count: itemNames.length };
    }

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
            return true;
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
            return true;
        } else if (typeof copy === 'function') {
            copy(text);
            return true;
        }
        return false;
    }

    function runExtractor() {
        const res = extractBill();
        if (!res) {
            console.error('[Walmart Bill Extractor] Could not extract bill.');
            return null;
        }
        copyToClipboard(res.output);
        console.log(`[Walmart Bill Extractor] Copied bill with ${res.count} items (total: $${res.total}) to clipboard.`);
        return res;
    }

    // Register Tampermonkey menu command
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Extract Walmart Bill", () => {
            runExtractor();
        }, "w");
    }

    // Expose for console use
    window.copyWalmartBill = runExtractor;

    // Inject "Copy Bill" button into order page
    function injectButton() {
        if (document.querySelector('#walmart-copy-bill-btn')) return;
        const target = document.querySelector("#order-details-top") ||
                       document.querySelector(".print-bill-payment-section") ||
                       document.querySelector("[data-testid='orderInfoCard']");
        if (!target) return;

        const btn = document.createElement('button');
        btn.id = 'walmart-copy-bill-btn';
        btn.textContent = 'Copy Bill';
        btn.style.cssText = `
            margin-left: 12px;
            padding: 8px 18px;
            background-color: #0071dc;
            color: #ffffff;
            border: none;
            border-radius: 18px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            vertical-align: middle;
            transition: background-color 0.2s;
        `;
        btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#004f9a');
        btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#0071dc');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const res = runExtractor();
            if (res) {
                const oldText = btn.textContent;
                btn.textContent = `Copied ($${res.total})!`;
                btn.style.backgroundColor = '#2a8703';
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.style.backgroundColor = '#0071dc';
                }, 2000);
            }
        });

        target.appendChild(btn);
    }

    injectButton();
    const observer = new MutationObserver(() => injectButton());
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();
