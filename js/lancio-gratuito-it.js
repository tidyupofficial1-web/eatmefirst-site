/* Fase di lancio italiana: nessun acquisto, codice o scadenza automatica.
 * Non modifica date, licenze precedenti o dati della dispensa. */
(function () {
    'use strict';
    const api = Object.freeze({
        stato: () => Object.freeze({ambiente: 'lancio-gratuito', scadenza: null}),
        autorizza: async () => Object.freeze({consentita: true, motivo: 'lancio-gratuito', scadenza: null})
    });
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
    window.EatLancioGratuitoIT = true;
    window.EatServizioEsportazioneIT = api;
})();
