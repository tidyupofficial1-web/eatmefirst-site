(() => {
    'use strict';

    const locale = document.documentElement.lang;
    const cartella = {'ja': 'JA', 'pt-BR': 'PT', 'ar': 'AR'}[locale];
    const entry = new URL('../' + cartella + '/index.html', document.currentScript.src).href;
    const root = new URL('.', entry);
    const params = new URL(window.location.href).searchParams;
    const requested = params.get('next');
    const lastAppKey = 'eatmefirst_ultima_app_it';
    const menu = new URL('menu.html', root);
    const orto = new URL('agenda-orto/', root);

    function destinazione() {
        if (requested) {
            try {
                const url = new URL(requested, root);
                if (url.origin === root.origin && url.pathname.startsWith(root.pathname) && url.pathname !== root.pathname && url.pathname !== new URL(entry).pathname) return url.href;
            } catch (_) {
                // An invalid destination falls back to the menu.
            }
        }
        if (!params.has('next') && params.get('dest') !== 'eat') {
            try {
                if (localStorage.getItem(lastAppKey) === 'orto') return new URL('index.html', orto).href;
            } catch (_) { /* Memoria locale non disponibile. */ }
        }
        return menu.href;
    }

    const consentKey = 'eatmefirst_terms_' + locale;
    const termsVersion = locale === 'ar' ? 'ar-2026-11-launch-1' : 'IT-2026-11-15-lancio-2';
    const commonVersion = 'IT-2026-11-28-eat-orto-1';
    const ortoOpened = window.location.pathname.startsWith(orto.pathname);
    const ortoRequested = ortoOpened || new URL(destinazione()).pathname.startsWith(orto.pathname);
    const dateKey = 'eatmefirst_consent_date';
    const nameKey = 'eatmefirst_username';

    function accepted() {
        try {
            if (localStorage.getItem('eatmefirst_consent') === 'accepted' &&
                localStorage.getItem('eatmefirst_terms_version') === commonVersion) return true;
            if (ortoRequested) return false;
            return localStorage.getItem(consentKey) === termsVersion;
        } catch (_) {
            return false;
        }
    }

    if (document.currentScript.hasAttribute('data-proteggi')) {
        const check = () => {
            if (accepted()) {
                if (ortoOpened || window.location.pathname === menu.pathname) {
                    try { localStorage.setItem(lastAppKey, ortoOpened ? 'orto' : 'eat'); } catch (_) { /* Memoria locale non disponibile. */ }
                }
                return;
            }
            const url = new URL(entry);
            url.searchParams.set('next', window.location.pathname + window.location.search + window.location.hash);
            window.location.replace(url.href);
        };
        check();
        window.addEventListener('pageshow', check);
        return;
    }

    if (accepted()) {
        window.location.replace(destinazione());
        return;
    }

    const form = document.getElementById('app-consent');
    const name = form.elements.userName;
    const status = document.getElementById('consent-error');
    try {
        name.value = localStorage.getItem(nameKey) || '';
    } catch (_) {
        status.textContent = form.dataset.error;
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.elements.accept.checked) return;

        try {
            if (!localStorage.getItem(dateKey)) {
                localStorage.setItem(dateKey, new Date().toISOString());
            }
            localStorage.setItem(consentKey, termsVersion);
            if (ortoRequested) {
                localStorage.setItem('eatmefirst_terms_version', commonVersion);
                localStorage.setItem('eatmefirst_terms_accepted_at', new Date().toISOString());
                localStorage.setItem('eatmefirst_consent', 'accepted');
            }
            if (!accepted()) throw new Error('Consent was not saved');
        } catch (_) {
            status.textContent = form.dataset.error;
            return;
        }

        try {
            const value = name.value.trim();
            if (value) localStorage.setItem(nameKey, value);
            else localStorage.removeItem(nameKey);
        } catch (_) {
            // The name is optional.
        }
        window.location.replace(destinazione());
    });
})();
