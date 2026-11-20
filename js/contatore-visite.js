/* Lasciare vuoto finché il servizio di conteggio non è attivo. */
(() => {
    'use strict';
    const endpoint = 'https://eatmefirst-visite.eatmefirst-contatti.workers.dev/count';
    const evento = document.currentScript?.dataset.visita;
    if (!endpoint || !evento || location.protocol !== 'https:' ||
        navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true ||
        location.hostname !== 'tidyupofficial1-web.github.io') return;

    fetch(`${endpoint}/${evento}`, {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true
    }).catch(() => {});
})();
