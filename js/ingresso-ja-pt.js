(() => {
    'use strict';

    const locale = document.documentElement.lang;
    const cartella = {'ja': 'JA', 'pt-BR': 'PT', 'ar': 'AR'}[locale];
    const entry = new URL('../' + cartella + '/index.html', document.currentScript.src).href;
    const root = new URL('.', entry);
    const requested = new URL(window.location.href).searchParams.get('next');

    function destinazione() {
        if (requested) {
            try {
                const url = new URL(requested, root);
                if (url.origin === root.origin && url.pathname.startsWith(root.pathname) && url.pathname !== root.pathname && url.pathname !== new URL(entry).pathname) return url.href;
            } catch (_) {
                // An invalid destination falls back to the menu.
            }
        }
        return new URL('menu.html', root).href;
    }

    const consentKey = 'eatmefirst_terms_' + locale;
    const termsVersion = locale === 'ar' ? 'ar-2026-11-launch-1' : 'IT-2026-11-15-lancio-2';
    const dateKey = 'eatmefirst_consent_date';
    const nameKey = 'eatmefirst_username';

    function accepted() {
        try {
            return localStorage.getItem(consentKey) === termsVersion;
        } catch (_) {
            return false;
        }
    }

    if (document.currentScript.hasAttribute('data-proteggi')) {
        const check = () => {
            if (accepted()) return;
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
