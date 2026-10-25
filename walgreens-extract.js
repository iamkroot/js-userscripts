// ==UserScript==
// @name         Walgreens Bill Extractor
// @namespace    iamkroot
// @version      1.0.0
// @description  Extract Walgreens order details into bill-split format with a single click
// @author       iamkroot
// @match        https://www.walgreens.com/orderhistory/order/details-ui*
// @icon         https://www.walgreens.com/favicon.ico
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function extractBill() {
        // 1. Extract final total paid on card (Payment information reflects final charged amount after any cancellations/adjustments)
        let total = '0.00';
        const transactionEls = Array.from(document.querySelectorAll('.wag-store-order-details-transactions'));
        if (transactionEls.length > 0) {
            let sum = 0;
            let found = false;
            for (const trans of transactionEls) {
                const priceSpan = trans.querySelector('span:last-child') || trans;
                const m = priceSpan.textContent.match(/\$?\s*(\d+(?:\.\d{2})?)/);
                if (m) {
                    sum += parseFloat(m[1]);
                    found = true;
                }
            }
            if (found && sum > 0) {
                total = sum.toFixed(2);
            }
        }

        // Fallback: Purchase summary total if no payment transactions rendered yet
        if (total === '0.00') {
            const totalEl = document.querySelector('.wag-store-order-details-summary-total-items .wag-store-order-details-summary-items.bold span.f-right') ||
                            document.querySelector('.wag-store-order-details-summary-total-items span.f-right');
            if (totalEl) {
                const m = totalEl.textContent.match(/\$?\s*(\d+(?:\.\d{2})?)/);
                if (m) total = parseFloat(m[1]).toFixed(2);
            }
        }

        // 2. Extract product items
        const productEls = Array.from(document.querySelectorAll('.wag-store-order-details-products-item'));
        const items = productEls.map(el => {
            // Product Name
            const titleEl = el.querySelector('.wag-store-order-details-prd-img .body-medium') ||
                           el.querySelector('.body-medium.mb5');
            const imgEl = el.querySelector('.product__img img');
            const name = (titleEl ? titleEl.textContent : imgEl?.getAttribute('alt') || 'Unknown Item')
                .replace(/\s+/g, ' ')
                .trim();

            // Fulfillment / Quantity
            const isRedText = !!el.querySelector('.wag-order-details-red-text');
            const hasFulfilledIcon = !!el.querySelector('.fulfilled-icon');

            let qty = 1;
            let foundShipped = false;
            const rows = Array.from(el.querySelectorAll('.wag-order-details-product-fulfillment .wag-order-details-product-info'));
            for (const row of rows) {
                const label = row.querySelector('.wag-order-details-product-line')?.textContent?.toLowerCase() || '';
                const valEl = Array.from(row.querySelectorAll('.sp-block.body-small')).find(s => !s.classList.contains('wag-order-details-product-line'));
                const val = parseInt(valEl?.textContent?.trim() || '', 10);
                if (!isNaN(val)) {
                    if (label.includes('ship') || label.includes('fulfill') || label.includes('pick')) {
                        qty = val;
                        foundShipped = true;
                        break;
                    } else if (label.includes('order')) {
                        qty = val;
                    }
                }
            }

            // Price: use Return Value per item (net of discounts/coupons) if present, else fallback to line price
            const returnValEl = el.querySelector('[data-testid^="return-value-section"] .sp-block.body-small:not(.wag-order-details-product-line)');
            let price = '0.00';
            if (returnValEl) {
                const m = returnValEl.textContent.match(/\$?\s*(\d+(?:\.\d{2})?)/);
                if (m) {
                    const unitPrice = parseFloat(m[1]);
                    price = (unitPrice * qty).toFixed(2);
                }
            }
            if (price === '0.00') {
                const linePriceEl = el.querySelector('.wag-order-details-total-price');
                const m = linePriceEl?.textContent?.match(/\$?\s*(\d+(?:\.\d{2})?)/);
                if (m) {
                    price = parseFloat(m[1]).toFixed(2);
                }
            }

            // Unavailable filter (out of stock, cancelled, 0 shipped)
            const unavailable = isRedText || (foundShipped && qty === 0) || (!hasFulfilledIcon && isRedText);

            return { name, qty, price, unavailable };
        });

        const activeItems = items.filter(it => !it.unavailable && it.qty > 0);
        const billLines = activeItems.map(it => `${it.qty}\t${it.name}\t${it.price}`).join('\n');
        const output = `!paid: ${total}\n!paid-by: krut\n\n${billLines}\n`;

        return { output, total, items: activeItems, allItems: items };
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
        const { output, total, items } = extractBill();
        copyToClipboard(output);
        console.log(`[Walgreens Bill Extractor] Copied bill with ${items.length} items to clipboard.`);
        return { output, total, items };
    }

    // Expose globally for console execution
    window.copyWalgreensBill = runExtractor;

    // Inject "Copy Bill" UI Button into .wag-store-order-print
    function injectButton() {
        const printContainer = document.querySelector('.wag-store-order-print');
        if (!printContainer || document.querySelector('#wag-copy-bill-btn')) return;

        const copySection = document.createElement('section');
        copySection.id = 'wag-copy-bill-btn';
        copySection.style.cssText = 'display: inline-flex; align-items: center; margin-left: 15px; cursor: pointer; vertical-align: middle;';

        copySection.innerHTML = `
            <span class="icon icon_24" style="display: inline-flex; align-items: center; margin-right: 5px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00727a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </span>
            <a href="javascript:void(0)" style="text-decoration: none; color: #00727a; font-family: inherit;">
                <strong id="wag-copy-bill-label" style="font-size: 14px; line-height: 20px;">Copy Bill</strong>
            </a>
        `;

        copySection.addEventListener('click', (e) => {
            e.preventDefault();
            const { items } = runExtractor();
            const label = document.querySelector('#wag-copy-bill-label');
            if (label) {
                const originalText = label.textContent;
                label.textContent = `Copied (${items.length} items)!`;
                label.style.color = '#28a745';
                setTimeout(() => {
                    label.textContent = originalText;
                    label.style.color = '#00727a';
                }, 2000);
            }
        });

        printContainer.appendChild(copySection);
    }

    // Mount button immediately and observe for client-side rendering
    injectButton();
    const observer = new MutationObserver(() => injectButton());
    observer.observe(document.body, { childList: true, subtree: true });

    // Also run once on initial load for console users
    console.log('[Walgreens Bill Extractor] Loaded. Run copyWalgreensBill() or click "Copy Bill" on the page.');
})();
