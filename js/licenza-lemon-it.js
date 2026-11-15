/* Verifica esplicita dei soli prodotti Lemon Squeezy di TEST.
 * Non attiva istanze, non salva codici o dati personali, non concede diritti locali.
 * Prodotti live e sblocco esportazione richiedono un successivo collaudo separato.
 */
(function () {
    'use strict';
    const prodottiTest = Object.freeze({1490991: 'Semestrale', 1491015: 'Annuale'});
    const negozio = 512106;
    let occupato = false;

    async function verifica(codice) {
        if (occupato) throw new Error('Attendi la fine del controllo in corso.');
        const chiave = String(codice || '').trim();
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(chiave)) {
            throw new Error('Incolla il codice completo ricevuto da Lemon Squeezy, compresi i trattini.');
        }
        occupato = true;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const risposta = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
                method: 'POST',
                headers: {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({license_key: chiave}).toString(),
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
                signal: controller.signal
            });
            let dati;
            try { dati = await risposta.json(); }
            catch (_) { throw new Error('Risposta non leggibile. Nessuna attivazione è stata effettuata. Riprova più tardi.'); }
            if (risposta.status === 429) throw new Error('Troppi controlli ravvicinati. Attendi un minuto prima di riprovare.');
            if (risposta.status >= 500) throw new Error('Il servizio di verifica non è disponibile. Riprova più tardi.');
            const licenza = dati.license_key;
            if (!risposta.ok || dati.valid !== true || !licenza ||
                !['active', 'inactive'].includes(licenza.status)) {
                throw new Error('Codice non valido, scaduto o disabilitato. Controlla la ricevuta; non occorre acquistare di nuovo per riprovare.');
            }
            const meta = dati.meta;
            if (!meta || Number(meta.store_id) !== negozio ||
                !Object.hasOwn(prodottiTest, Number(meta.product_id))) {
                throw new Error('Il codice non appartiene ai piani EatMeFirst configurati per questa prova.');
            }
            if (typeof licenza.key !== 'string' || licenza.key.toLowerCase() !== chiave.toLowerCase()) {
                throw new Error('La risposta non corrisponde al codice inserito. Nessuna attivazione effettuata.');
            }
            const scadenza = Date.parse(licenza.expires_at);
            if (typeof licenza.expires_at !== 'string' || !Number.isFinite(scadenza) || scadenza <= Date.now()) {
                throw new Error('La scadenza del codice è assente, non leggibile o già trascorsa. Controlla l’ordine Lemon Squeezy.');
            }
            return Object.freeze({piano: prodottiTest[Number(meta.product_id)], scadenza: licenza.expires_at});
        } catch (errore) {
            if (errore.name === 'AbortError') throw new Error('Il controllo ha impiegato troppo tempo. Nessuna attivazione effettuata: puoi riprovare.');
            if (errore instanceof TypeError) throw new Error('Collegamento a Lemon Squeezy non riuscito. Controlla Internet e riprova: i tuoi dati restano invariati.');
            throw errore;
        } finally {
            clearTimeout(timer);
            occupato = false;
        }
    }
    window.EatLicenzaLemonIT = Object.freeze({verifica});
    const form = document.getElementById('lemon-code-form');
    if (!form) return;
    const input = document.getElementById('lemon-code');
    const bottone = document.getElementById('lemon-code-submit');
    const esito = document.getElementById('lemon-code-result');
    form.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        if (bottone.disabled) return;
        bottone.disabled = true;
        input.readOnly = true;
        form.setAttribute('aria-busy', 'true');
        esito.textContent = 'Controllo del codice in corso…';
        try {
            const risultato = await verifica(input.value);
            esito.textContent = `Codice di prova valido — piano ${risultato.piano}. Scadenza Lemon Squeezy: ${new Date(risultato.scadenza).toLocaleString('it-IT')}. Il periodo parte dall’acquisto, non da questo controllo. Nessuna attivazione consumata; sblocco dell’esportazione ancora da collegare.`;
            input.value = '';
        } catch (errore) {
            esito.textContent = errore.message;
        } finally {
            bottone.disabled = false;
            input.readOnly = false;
            form.removeAttribute('aria-busy');
        }
    });
})();
