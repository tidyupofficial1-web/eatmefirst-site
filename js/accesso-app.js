/* Entrate dirette nelle pagine app: sola lettura del consenso locale esistente.
 * Non è autenticazione: EatMeFirst è un'app locale senza account.
 */
(function () {
    'use strict';
    const script = document.currentScript;
    const lang = script.dataset.lang;
    const root = new URL('../', script.src);
    const entry = new URL(lang + '/index.html', root);
    const menu = new URL(lang + '/menu.html', root);
    entry.searchParams.set('dest', 'eat');
    if (lang === 'IT') {
        const current = window.location;
        entry.searchParams.set('pagina', current.pathname + current.search + current.hash);
    }
    function accepted() {
        try {
            if (lang === 'IT') {
                return localStorage.getItem('eatmefirst_consent') === 'accepted' &&
                    localStorage.getItem('eatmefirst_terms_version') === 'IT-2026-11-28-eat-orto-1';
            }
            return localStorage.getItem('eatmefirst_consent') === 'accepted' ||
                localStorage.getItem('eatmefirst_consent_' + lang.toLowerCase()) === 'accepted';
        } catch (_) { return false; }
    }
    function check() {
        if (!accepted()) {
            window.location.replace(entry);
            return;
        }
        if (location.pathname === menu.pathname) {
            try { localStorage.setItem('eatmefirst_ultima_app_it', 'eat'); } catch (_) { /* Memoria locale non disponibile. */ }
        }
    }
    check();
    window.addEventListener('pageshow', check);
})();
