/* Calcolo per l'esportazione: nessun accesso a rete, memoria o dispensa.
 * La licenza deve arrivare da una verifica
 * dell'istanza Lemon per il dispositivo corrente, non dal backup importato.
 */
(function () {
    'use strict';
    const dataValida = value => {
        if (typeof value !== 'string' || !value.trim()) return null;
        const d = new Date(value);
        return Number.isFinite(d.getTime()) ? d : null;
    };
    function fineProva(inizio) {
        const d = new Date(inizio.getFullYear(), inizio.getMonth() + 4, 1, 12);
        d.setDate(Math.min(inizio.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
        return d;
    }
    function stessoGiornoOPrecedente(a, b) {
        const giorno = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        return giorno(a) <= giorno(b);
    }
    function valuta({consenso, primaAccettazione, licenzaVerificata = null}, adesso = new Date()) {
        if (!(adesso instanceof Date) || !Number.isFinite(adesso.getTime())) throw Error('Data di controllo non valida.');
        const inizio = dataValida(primaAccettazione);
        let prova = null;
        if (consenso === 'accepted' && inizio && inizio <= adesso) prova = fineProva(inizio);
        // Come i promemoria attuali, il giorno finale della prova è incluso.
        const provaValida = prova && stessoGiornoOPrecedente(adesso, prova);
        const licenza = licenzaVerificata;
        const scadenza = licenza && dataValida(licenza.scadenza);
        const verificataIl = licenza && dataValida(licenza.verificataIl);
        const licenzaValida = licenza && licenza.valida === true &&
            licenza.stato === 'active' && typeof licenza.istanza === 'string' &&
            licenza.istanza.trim() && verificataIl && verificataIl <= adesso &&
            scadenza && scadenza > adesso;
        // Nessuna somma di mesi: si usa la scadenza effettiva della licenza.
        if (licenzaValida && (!provaValida || scadenza > prova)) {
            return Object.freeze({consentita: true, motivo: 'licenza', scadenza: scadenza.toISOString()});
        }
        if (provaValida) return Object.freeze({consentita: true, motivo: 'prova', scadenza: prova.toISOString()});
        return Object.freeze({consentita: false, motivo: 'nessun-diritto-verificato', scadenza: null});
    }
    const api = Object.freeze({valuta, fineProva});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else window.EatDirittoEsportazioneIT = api;
})();
