/* Entrate dirette nelle pagine app: sola lettura del consenso locale esistente.
 * Non è autenticazione: EatMeFirst è un'app locale senza account.
 */
(function () {
    'use strict';
    const script = document.currentScript;
    const lang = script.dataset.lang;
    const root = new URL('../', script.src);
    const entry = new URL(lang + '/index.html', root).href;
    function accepted() {
        try {
            if (lang === 'IT') {
                return localStorage.getItem('eatmefirst_consent') === 'accepted' &&
                    localStorage.getItem('eatmefirst_terms_version') === 'IT-2026-11-15-lancio-2';
            }
            return localStorage.getItem('eatmefirst_consent') === 'accepted' ||
                localStorage.getItem('eatmefirst_consent_' + lang.toLowerCase()) === 'accepted';
        } catch (_) { return false; }
    }
    function check() { if (!accepted()) window.location.replace(entry); }
    check();
    window.addEventListener('pageshow', check);
})();
