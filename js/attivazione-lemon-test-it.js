/* Gestione esplicita delle istanze Lemon di prova. Nessuna chiamata all'apertura.
 * Credenziali separate dalla dispensa e dai suoi backup. Non concede diritti live.
 * API: https://docs.lemonsqueezy.com/api/license-api
 */
(function () {
    'use strict';
    const CHIAVE = 'eat_lemon_dispositivo_test_v1';
    const PIANI = Object.freeze({1490991:'Semestrale',1491015:'Annuale'});
    const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
    function crea({memoria, invia, blocchi, nuovoId, adesso = () => new Date()}) {
        let occupato = false;
        function leggi() {
            const raw = memoria.getItem(CHIAVE);
            if (raw === null) return null;
            let record;
            try { record = JSON.parse(raw); } catch (_) { throw Error('Dati di attivazione non leggibili. Non attivare di nuovo: verifica prima le istanze nel negozio.'); }
            if (!record || record.versione !== 1 || !UUID.test(record.codice) ||
                !['in-attesa','attiva','incerta'].includes(record.fase) ||
                (record.istanza != null && !UUID.test(record.istanza))) {
                throw Error('Dati di attivazione incompleti. Verifica le istanze nel negozio prima di riprovare.');
            }
            return record;
        }
        function salva(record) {
            const testo = JSON.stringify(record);
            memoria.setItem(CHIAVE, testo);
            if (memoria.getItem(CHIAVE) !== testo) throw Error('Il browser non ha conservato i dati di attivazione.');
        }
        function stato() {
            const record = leggi();
            return record ? Object.freeze({fase:record.fase, istanza:record.istanza || null,
                piano:record.piano || null, scadenza:record.scadenza || null}) : null;
        }
        async function esclusiva(azione) {
            if (occupato) throw Error('Attendi la fine dell’operazione in corso.');
            if (!blocchi || typeof blocchi.request !== 'function') {
                throw Error('Questo browser non permette di proteggere l’attivazione tra più schede. Usa un browser aggiornato da un indirizzo locale sicuro.');
            }
            occupato = true;
            try {
                return await blocchi.request(CHIAVE, {ifAvailable:true}, async lock => {
                    if (!lock) throw Error('Un’altra scheda sta gestendo il codice. Attendi e riprova.');
                    return azione();
                });
            } finally { occupato = false; }
        }
        async function richiesta(azione, campi) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            try {
                const risposta = await invia('https://api.lemonsqueezy.com/v1/licenses/' + azione, {
                    method:'POST', headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
                    body:new URLSearchParams(campi).toString(), credentials:'omit', referrerPolicy:'no-referrer', signal:controller.signal
                });
                if (risposta.status === 429) throw Error('Troppi tentativi. Attendi un minuto.');
                if (risposta.status >= 500) throw Error('Lemon Squeezy non è disponibile.');
                const dati = await risposta.json();
                if (!dati || typeof dati !== 'object') throw Error('Risposta del servizio non leggibile.');
                return {ok:risposta.ok, dati};
            } catch (errore) {
                if (errore.name === 'AbortError' || errore instanceof TypeError || errore instanceof SyntaxError) {
                    throw Error('Risposta non ricevuta o non leggibile. Controlla la connessione.');
                }
                throw errore;
            } finally { clearTimeout(timer); }
        }
        function verificaRisposta(risposta, codice, istanza = null) {
            const {ok, dati} = risposta, licenza = dati.license_key, meta = dati.meta;
            if (!ok || dati.valid !== true || !licenza || !['active','inactive'].includes(licenza.status)) {
                throw Error('Codice o attivazione non validi, scaduti o disabilitati.');
            }
            if (!meta || Number(meta.store_id) !== 512106 || !Object.hasOwn(PIANI, Number(meta.product_id))) {
                throw Error('Il codice non appartiene ai prodotti EatMeFirst configurati per la prova.');
            }
            if (typeof licenza.key !== 'string' || licenza.key.toLowerCase() !== codice.toLowerCase()) {
                throw Error('Risposta non corrispondente al codice.');
            }
            if (typeof licenza.expires_at !== 'string' || !Number.isFinite(Date.parse(licenza.expires_at)) || Date.parse(licenza.expires_at) <= adesso().getTime()) {
                throw Error('La scadenza del codice è assente o già trascorsa.');
            }
            if (istanza && (licenza.status !== 'active' || dati.instance?.id !== istanza)) {
                throw Error('L’attivazione di questo dispositivo non è più valida.');
            }
            return {piano:PIANI[Number(meta.product_id)],scadenza:licenza.expires_at};
        }
        async function controllaRecord(record) {
            if (record.fase !== 'attiva' || !record.istanza) throw Error('Attivazione non confermata. Verifica le istanze nel negozio; non ripetere l’attivazione.');
            const risposta = await richiesta('validate', {license_key:record.codice,instance_id:record.istanza});
            const info = verificaRisposta(risposta, record.codice, record.istanza);
            return Object.freeze({valida:true,stato:'active',istanza:record.istanza,...info,verificataIl:adesso().toISOString(),ambiente:'test'});
        }
        function controlla() {
            return esclusiva(async () => {
                const record = leggi();
                if (!record) throw Error('Nessun codice attivato su questo browser.');
                return controllaRecord(record);
            });
        }
        function attiva(codice) {
            return esclusiva(async () => {
                const key = String(codice || '').trim().toLowerCase();
                if (!UUID.test(key)) throw Error('Incolla il codice completo con i trattini.');
                const esistente = leggi();
                if (esistente) {
                    if (esistente.codice.toLowerCase() === key) return controllaRecord(esistente);
                    throw Error('Prima libera l’attivazione presente su questo browser. La durata del nuovo codice parte dal suo acquisto.');
                }
                const info = verificaRisposta(await richiesta('validate',{license_key:key}),key);
                const id = nuovoId();
                if (!UUID.test(id)) throw Error('Impossibile identificare questa attivazione.');
                const record = {versione:1,fase:'in-attesa',codice:key,nome:'EatMeFirst prova ' + id,istanza:null,...info};
                // Scrittura prima della richiesta: senza memoria non si consuma un posto.
                salva(record);
                let risposta;
                try { risposta = await richiesta('activate',{license_key:key,instance_name:record.nome}); }
                catch (_) { throw Error('Esito dell’attivazione incerto. Non riprovare: controlla prima le istanze del codice nel negozio Lemon.'); }
                const dati = risposta.dati;
                if (dati.activated === false) {
                    memoria.removeItem(CHIAVE);
                    throw Error('Attivazione rifiutata. Controlla la scadenza e il limite dei dispositivi nel negozio.');
                }
                const istanza = dati.instance?.id;
                // Conserva la ricevuta anche se il successivo controllo non riesce.
                if (!risposta.ok || dati.activated !== true || !UUID.test(istanza) || dati.license_key?.key?.toLowerCase() !== key) {
                    throw Error('Esito dell’attivazione incerto. Controlla le istanze nel negozio prima di riprovare.');
                }
                record.istanza = istanza;
                record.fase = 'attiva';
                try { salva(record); }
                catch (_) {
                    // Se non si può conservare l'istanza, prova a restituire subito il posto.
                    let liberata = false;
                    try {
                        const r = await richiesta('deactivate',{license_key:key,instance_id:istanza});
                        liberata = r.ok && r.dati.deactivated === true && r.dati.license_key?.key === key;
                    } catch (_) {}
                    if (liberata) memoria.removeItem(CHIAVE);
                    throw Error(liberata ? 'Il browser non ha salvato l’attivazione: il posto è stato liberato. Nessuno sblocco effettuato.' : 'Il browser non ha salvato l’attivazione. Controlla e libera l’istanza nel negozio prima di riprovare.');
                }
                // Verifica indipendente dell'istanza prima di dichiarare successo.
                return controllaRecord(record);
            });
        }
        function disattiva() {
            return esclusiva(async () => {
                const record = leggi();
                if (!record) return;
                if (!record.istanza) throw Error('Non è arrivato l’identificativo dell’attivazione. Controlla e libera l’istanza nel negozio.');
                const r = await richiesta('deactivate',{license_key:record.codice,instance_id:record.istanza});
                if (!r.ok || r.dati.deactivated !== true || r.dati.license_key?.key?.toLowerCase() !== record.codice.toLowerCase()) {
                    throw Error('Disattivazione non confermata. I dati del codice restano su questo browser per riprovare.');
                }
                memoria.removeItem(CHIAVE);
            });
        }
        return Object.freeze({stato,attiva,controlla,disattiva});
    }
    const api = Object.freeze({crea,chiaveMemoria:CHIAVE});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else window.EatAttivazioneLemonTestIT = api;
})();
