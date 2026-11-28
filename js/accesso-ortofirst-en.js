(() => {
    'use strict';
    const script = document.currentScript;
    const language = ['FR', 'ES'].includes(script.dataset.lang) ? script.dataset.lang : 'EN';
    const entry = new URL('../' + language + '/index.html', script.src);
    const folder = new URL('./agenda-orto/', entry);
    const version = 'IT-2026-11-28-eat-orto-1';
    const pages = new Set(['index.html', 'presentazione.html', 'simulazione-agenda.html']);
    function requested(value) {
        if (!value) return null;
        try {
            const url = new URL(value, folder);
            return url.origin === folder.origin && url.pathname.startsWith(folder.pathname) &&
                pages.has(url.pathname.slice(folder.pathname.length)) ? url.href : null;
        } catch { return null; }
    }
    function accepted() {
        try {
            return localStorage.getItem('eatmefirst_consent') === 'accepted' &&
                localStorage.getItem('eatmefirst_terms_version') === version;
        } catch { return false; }
    }
    function accept() {
        localStorage.setItem('eatmefirst_terms_version', version);
        localStorage.setItem('eatmefirst_terms_accepted_at', new Date().toISOString());
    }
    const target = requested(new URLSearchParams(location.search).get('orto'));
    window.OrtoFirstAccess = {target, accepted, accept};
    if (script.hasAttribute('data-protect')) {
        entry.searchParams.set('orto', requested(location.href) ?? new URL('index.html', folder).href);
        const check = () => { if (!accepted()) location.replace(entry); };
        check();
        window.addEventListener('pageshow', check);
    }
})();
