/* Contatori di eventi, non persone: nessuna lettura di dispensa o storage.
 * Invio opzionale tramite GoatCounter, disattivato anche su file/localhost.
 * Nomi evento fissi: non passare nomi file, firme o altri metadati. */
(function () {
    'use strict';
    const NOMI = Object.freeze({
        utilita_visitata: 'utilita-it-aperture',
        esportazione_avviata: 'utilita-it-esportazioni-download-avviati'
    });
    function crea(invia) {
        return Object.freeze({registra(nome) {
            if (!Object.hasOwn(NOMI, nome)) return false;
            try {
                invia(Object.freeze({path: NOMI[nome], title: NOMI[nome], event: true,
                    no_session: true, referrer: ''}));
                return true;
            } catch (_) { return false; }
        }});
    }
    if (typeof module !== 'undefined' && module.exports) { module.exports = {crea}; return; }
    const config = window.EatStatisticheConfig;
    const niente = Object.freeze({registra: () => false});
    window.EatStatistiche = niente;
    if (config?.abilitato !== true || location.protocol !== 'https:' ||
        !Array.isArray(config.hostConsentiti) || !config.hostConsentiti.includes(location.hostname) ||
        navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    let endpoint;
    try { endpoint = new URL(config.endpoint); } catch (_) { return; }
    if (endpoint.protocol !== 'https:' || !/^[a-z0-9-]+\.goatcounter\.com$/.test(endpoint.hostname) ||
        endpoint.pathname !== '/count' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) return;
    // Configurazione prima del caricamento: mai contare l'URL reale in automatico.
    window.goatcounter = {no_onload: true, no_events: true, endpoint: endpoint.href,
        path: 'utilita-it-aperture', title: 'utilita-it-aperture', referrer: ''};
    const queue = [];
    let pret = false, echec = false;
    window.EatStatistiche = crea(payload => {
        if (echec) throw Error('Statistiche non disponibili');
        if (pret) window.goatcounter.count(payload);
        else if (queue.length < 10) queue.push(payload);
    });
    const script = document.createElement('script');
    script.src = 'https://gc.zgo.at/count.js';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
        pret = typeof window.goatcounter?.count === 'function';
        if (!pret) { echec = true; queue.length = 0; return; }
        for (const payload of queue.splice(0)) { try { window.goatcounter.count(payload); } catch (_) {} }
    };
    script.onerror = () => { echec = true; queue.length = 0; };
    document.head.appendChild(script);
    window.EatStatistiche.registra('utilita_visitata');
})();
