/* Unica accettazione locale delle condizioni italiane. Nessun invio esterno. */
(function () {
    'use strict';
    const versione = 'IT-2026-11-15-lancio-2';
    window.EatLancioGratuitoIT = true;
    const script = document.currentScript;
    const ingresso = new URL('../IT/index.html', script.src);
    const baseApp = new URL('./', ingresso);
    const ultimaApp = 'eatmefirst_ultima_app_it';
    const menuOrto = 'agenda-orto/index.html';
    const pagineApp = new Set([
        'menu.html', 'agenda/index.html', menuOrto, 'agenda-orto/simulazione-agenda.html',
        'carico/carico.html', 'carico/collegamento.html', 'carico/carico vecchio.html',
        'inventario/index.html', 'operazioni/index.html', 'scarico/index.html',
        'scarico/index vecchio.html', 'scarico/index vecchio 1.html', 'scarico/index vecchio 2.html',
        'spesa/index.html', 'spesa/index vecchio.html', 'statistiche/index.html',
        'utilita/index.html', 'abbonamento/index.html', 'abbonamento/collabora-bug-gratis.html',
        'abbonamento/sicurezza-dati-chiavetta.html', 'questionario/index.html'
    ]);
    const cartelleGuide = new Set(['carico', 'inventario', 'scarico', 'spesa', 'statistiche', 'utilita']);
    if (script.dataset.destinazione === 'orto') ingresso.searchParams.set('dest', 'orto');
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
    function paginaValida(valore) {
        if (!valore) return null;
        try {
            const pagina = new URL(valore, baseApp);
            if (pagina.origin !== baseApp.origin || !pagina.pathname.startsWith(baseApp.pathname)) return null;
            const percorso = decodeURIComponent(pagina.pathname.slice(baseApp.pathname.length));
            const guida = percorso.match(/^([a-z]+)\/guida-[a-z-]+\.html$/);
            if (!pagineApp.has(percorso) && !(guida && cartelleGuide.has(guida[1]))) return null;
            return pagina.pathname + pagina.search + pagina.hash;
        } catch (_) { return null; }
    }

    function destinazione() {
        const parametri = new URLSearchParams(window.location.search);
        const pagina = paginaValida(parametri.get('pagina'));
        if (pagina) return pagina;
        if (parametri.get('dest') === 'orto') return menuOrto;
        if (parametri.get('dest') === 'eat') return 'menu.html';
        try {
            if (localStorage.getItem(ultimaApp) === 'orto') return menuOrto;
        } catch (_) { /* Il browser può bloccare la memoria locale. */ }
        return 'menu.html';
    }
    window.EatAccettazione = Object.freeze({ versione, valida, accetta, destinazione });
    if (script.hasAttribute('data-proteggi')) {
        const pagina = new URL(window.location.href);
        if (pagina.pathname.endsWith('/')) pagina.pathname += 'index.html';
        const richiesta = paginaValida(pagina.href);
        if (richiesta) ingresso.searchParams.set('pagina', richiesta);
        function controlla() {
            if (!valida()) {
                window.location.replace(ingresso);
                return;
            }
            try {
                const app = script.dataset.destinazione === 'orto' ? 'orto' : 'eat';
                localStorage.setItem(ultimaApp, app);
            } catch (_) { /* Il browser può bloccare la memoria locale. */ }
        }
        controlla();
        window.addEventListener('pageshow', controlla);
    }
})();
