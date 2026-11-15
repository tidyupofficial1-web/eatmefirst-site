/* Unica accettazione locale delle condizioni italiane. Nessun invio esterno. */
(function () {
    'use strict';
    const versione = 'IT-2026-11-15-lancio-2';
    window.EatLancioGratuitoIT = true;
    const script = document.currentScript;
    const ingresso = new URL('../IT/index.html', script.src).href;
    function valida() {
        try {
            return localStorage.getItem('eatmefirst_consent') === 'accepted' &&
                localStorage.getItem('eatmefirst_terms_version') === versione;
        } catch (_) { return false; }
    }
    function accetta() {
        const ora = new Date().toISOString();
        // Conserva la prima data storica anche se cambiano le condizioni.
        if (!localStorage.getItem('eatmefirst_consent_date')) {
            localStorage.setItem('eatmefirst_consent_date', ora);
        }
        localStorage.setItem('eatmefirst_terms_accepted_at', ora);
        localStorage.setItem('eatmefirst_terms_version', versione);
        localStorage.setItem('eatmefirst_consent', 'accepted');
        if (!valida()) throw new Error('Accettazione non salvata.');
    }
    window.EatAccettazione = Object.freeze({ versione, valida, accetta });
    if (script.hasAttribute('data-proteggi')) {
        if (!valida()) {
            window.location.replace(ingresso);
        } else {
            // Ricontrolla anche tornando a una pagina conservata nella memoria del browser.
            window.addEventListener('pageshow', function () {
                if (!valida()) window.location.replace(ingresso);
            });
        }
    }
})();
