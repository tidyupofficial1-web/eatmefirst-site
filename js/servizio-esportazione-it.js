/* Collegamento locale di prova tra licenze Lemon e download della dispensa.
 * Nessuna richiesta di rete finché l'utente non attiva/controlla/esporta.
 * Dopo la prova gratuita si rivalida online l'istanza prima di ogni export.
 * Nessuna credenziale, risposta Lemon o nuova scadenza entra nel backup.
 */
(function () {
    'use strict';
    function crea({memoria, attivazioni, valuta, adesso = () => new Date(), protocollo = () => 'https:'}) {
        function prova() {
            return valuta({consenso:memoria.getItem('eatmefirst_consent'),primaAccettazione:memoria.getItem('eatmefirst_consent_date')}, adesso());
        }
        function indirizzoCondiviso() {
            if (!['http:','https:'].includes(protocollo())) throw Error('Per collegare codice ed esportazione, apri l’app dall’indirizzo locale di prova anziché dal file. I dati che avevi nel file non vengono spostati automaticamente.');
        }
        function stato() {
            return Object.freeze({ambiente:'test',prova:prova(),attivazione:attivazioni().stato()});
        }
        async function autorizza() {
            const gratuita = prova();
            if (gratuita.consentita) return Object.freeze({...gratuita,ambiente:'test'});
            indirizzoCondiviso();
            if (!attivazioni().stato()) throw Error('Per esportare dopo i quattro mesi serve un codice attivato su questo browser. Puoi inserirlo nella sezione Codice e dispositivi. Importazione e funzioni di base restano disponibili.');
            const licenza = await attivazioni().controlla();
            if (licenza.ambiente !== 'test') throw Error('Ambiente del codice non corrispondente a questa configurazione di prova.');
            const diritto = valuta({consenso:memoria.getItem('eatmefirst_consent'),primaAccettazione:memoria.getItem('eatmefirst_consent_date'),licenzaVerificata:licenza},adesso());
            if (!diritto.consentita) throw Error('Il periodo disponibile per esportare è terminato. Le copie già create e l’uso della dispensa restano disponibili.');
            return Object.freeze({...diritto,ambiente:'test'});
        }
        async function attiva(codice) { indirizzoCondiviso(); return attivazioni().attiva(codice); }
        async function controlla() { indirizzoCondiviso(); return attivazioni().controlla(); }
        async function disattiva() { indirizzoCondiviso(); return attivazioni().disattiva(); }
        return Object.freeze({stato,autorizza,attiva,controlla,disattiva});
    }
    if (typeof module !== 'undefined' && module.exports) { module.exports = Object.freeze({crea}); return; }
    let gestore;
    const memoria = {getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
    window.EatServizioEsportazioneIT = crea({memoria,protocollo:()=>window.location.protocol,
        valuta:(...args)=>window.EatDirittoEsportazioneIT.valuta(...args),
        attivazioni:()=>gestore || (gestore = window.EatAttivazioneLemonTestIT.crea({memoria,
            invia:(...args)=>fetch(...args),blocchi:globalThis.navigator?.locks,nuovoId:()=>crypto.randomUUID()}))
    });
})();
