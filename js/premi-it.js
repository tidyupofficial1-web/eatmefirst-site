/* Premi: nessuna chiave segreta nel browser. Serve il registro online dei premi. */
(function () {
    const PENDENTE = 'eat_premio_richiesta_v1';
    let occupato = false;
    function mesi(data, numero) {
        const d = new Date(data.getFullYear(), data.getMonth()+numero, 1, 12);
        d.setDate(Math.min(data.getDate(), new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
        return d;
    }
    function calcolaScadenza(accettazione, scadenza, ora = new Date()) {
        const inizio = new Date(accettazione), attuale = new Date(scadenza || '');
        if (!Number.isFinite(inizio.getTime()) || inizio > ora) throw Error('Controlla la data della prima accettazione.');
        let base = mesi(inizio,4);
        if (base < ora) base = ora;
        if (Number.isFinite(attuale.getTime()) && attuale > base) base = attuale;
        return mesi(base,12).toISOString();
    }
    async function riscatta(codice) {
        if (occupato) throw Error('Attendi la fine dell’attivazione in corso.');
        const endpoint = window.EatPremiConfigurazione?.endpoint;
        if (!endpoint) throw Error('L’attivazione dei codici non è ancora collegata. Conserva l’email con il codice: nessuna scadenza è stata cambiata.');
        const url = new URL(endpoint);
        if (url.protocol !== 'https:') throw Error('Il collegamento dei premi non è valido.');
        const testo = String(codice || '').trim();
        if (!/^[A-Za-z0-9-]{16,160}$/.test(testo)) throw Error('Controlla di avere copiato tutto il codice ricevuto.');
        if (localStorage.getItem('eatmefirst_consent') !== 'accepted') throw Error('Prima accetta le condizioni dell’app.');
        occupato = true;
        let timer;
        try {
            const vecchia = localStorage.getItem('eatmefirst_expiry_date');
            const accettazione = localStorage.getItem('eatmefirst_consent_date');
            calcolaScadenza(accettazione,vecchia); // Rifiuta date iniziali mancanti o future.
            let p = JSON.parse(localStorage.getItem(PENDENTE) || 'null');
            if (p && p.codice !== testo) throw Error('È rimasta un’attivazione da verificare. Riprova con lo stesso codice prima di cambiarlo.');
            if (!p) {
                p = {codice:testo, richiesta:crypto.randomUUID()};
                // Prima della rete: un errore di memoria non deve consumare il codice.
                localStorage.setItem(PENDENTE,JSON.stringify(p));
            }
            const controller = new AbortController();
            timer = setTimeout(()=>controller.abort(),20000);
            const r = await fetch(url.href, {method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
                body:JSON.stringify({codice:p.codice,richiesta:p.richiesta}),signal:controller.signal,credentials:'omit'});
            const risposta = await r.json();
            if (!r.ok) {
                if (risposta.definitivo === true) localStorage.removeItem(PENDENTE);
                throw Error('Codice non attivato. Controlla il codice oppure riprova più tardi.');
            }
            // Il servizio restituisce la stessa ricevuta per i tentativi ripetuti della richiesta.
            if (risposta.richiesta !== p.richiesta || typeof risposta.ricevuta !== 'string' || !risposta.ricevuta ||
                typeof risposta.scadenza !== 'string' || !Number.isFinite(Date.parse(risposta.scadenza)) ||
                Date.parse(risposta.scadenza) <= Date.now()) throw Error('Conferma non leggibile. Conserva il codice e riprova.');
            const corrente = localStorage.getItem('eatmefirst_expiry_date');
            if (corrente !== vecchia) throw Error('La scadenza è cambiata in un’altra scheda. Riprova con lo stesso codice.');
            // Un solo aggiornamento dei diritti. Non si aggiunge un altro anno ad ogni tentativo.
            const scadenza = Number.isFinite(Date.parse(corrente)) && Date.parse(corrente)>Date.parse(risposta.scadenza) ? corrente : risposta.scadenza;
            localStorage.setItem('eatmefirst_expiry_date',scadenza);
            // Se questa pulizia fallisce, la richiesta resta ripetibile senza assegnare un secondo premio.
            try { localStorage.removeItem(PENDENTE); } catch (_) {}
            return scadenza;
        } finally {clearTimeout(timer);occupato=false;}
    }
    window.EatPremiIT = {calcolaScadenza,riscatta};
    window.riscattaCodicePromo = async function () {
        const msg=document.getElementById('promoMessage'), bottone=document.getElementById('riscattaPremio');
        bottone.disabled=true;
        try {
            msg.textContent='Controllo del codice in corso…';
            const fine=await riscatta(document.getElementById('promoCodeInput').value);
            msg.textContent='Premio attivato. Salvataggio esterno disponibile fino al '+new Date(fine).toLocaleDateString('it-IT')+'.';
        } catch (e) {msg.textContent=e.name==='AbortError' || e instanceof TypeError ? 'Non abbiamo ricevuto la conferma. Conserva il codice e riprova: non sarà assegnato due volte.' : e.message;}
        finally {bottone.disabled=false;}
    };
})();
