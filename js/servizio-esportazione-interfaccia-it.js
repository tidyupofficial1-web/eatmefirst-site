/* Comandi espliciti del codice; all'apertura mostra soltanto lo stato locale. */
(function () {
    'use strict';
    const form = document.getElementById('servizio-code-form');
    if (!form) return;
    const el = id=>document.getElementById(id);
    const servizio = ()=>window.EatServizioEsportazioneIT;
    const data = value=>new Date(value).toLocaleString('it-IT');
    function apriCodici() {
        const sezione=el('codice-dispositivi');
        if (sezione) { sezione.open=true; sezione.scrollIntoView({behavior:'auto',block:'center'}); }
    }
    function aggiorna() {
        try {
            const stato=servizio().stato();
            const parti=[];
            if(stato.prova.consentita) parti.push('Esportazione gratuita fino al '+new Date(stato.prova.scadenza).toLocaleDateString('it-IT')+' compreso.');
            else parti.push('Per esportare serve un codice attivato e un controllo online. Importazione e funzioni di base restano disponibili.');
            if(stato.attivazione?.fase==='attiva') parti.push('Codice di prova registrato su questo browser. Scadenza: '+data(stato.attivazione.scadenza)+'. Per verificarlo ora premi Controlla codice.');
            else if(stato.attivazione) parti.push('Esito di una precedente attivazione non confermato: controlla le istanze nel negozio prima di riprovare.');
            else parti.push('Nessun codice di prova registrato su questo browser.');
            el('servizio-stato').textContent=parti.join(' ');
        } catch(e) { el('servizio-stato').textContent=e.message; }
    }
    let occupato=false;
    async function esegui(fn) {
        if(occupato)return;
        occupato=true;
        const pulsanti=['servizio-attiva','servizio-controlla','servizio-disattiva'].map(el);
        pulsanti.forEach(b=>b.disabled=true);
        el('servizio-codice').readOnly=true;
        el('servizio-esito').textContent='Operazione in corso…';
        try { el('servizio-esito').textContent=await fn(); }
        catch(e) { el('servizio-esito').textContent=e.message; }
        finally {occupato=false;pulsanti.forEach(b=>b.disabled=false);el('servizio-codice').readOnly=false;aggiorna();}
    }
    form.addEventListener('submit',evento=>{
        evento.preventDefault();
        if(!el('servizio-consenso').checked){el('servizio-esito').textContent='Conferma che vuoi conservare e attivare il codice di prova su questo browser.';return;}
        return esegui(async()=>{
            const risultato=await servizio().attiva(el('servizio-codice').value);
            el('servizio-codice').value='';
            return 'Codice di prova attivato: piano '+risultato.piano+', scadenza '+data(risultato.scadenza)+'. Puoi ora provare Esporta dispensa nelle Utilità. La scadenza resta quella dell’acquisto.';
        });
    });
    el('servizio-controlla').addEventListener('click',()=>esegui(async()=>{
        const risultato=await servizio().controlla();
        return 'Codice di prova confermato su questo browser. Scadenza: '+data(risultato.scadenza)+'.';
    }));
    el('servizio-disattiva').addEventListener('click',()=>{
        if(occupato || !window.confirm('Disattivare il codice su questo browser e liberare l’attivazione? La dispensa resta invariata e la scadenza non cambia.'))return;
        return esegui(async()=>{await servizio().disattiva();return 'Codice disattivato su questo browser. Se il periodo gratuito è terminato, non potrai esportare finché non attivi un codice valido. Importazione e funzioni di base restano disponibili.';});
    });
    window.EatInterfacciaServizioIT=Object.freeze({aggiorna,apriCodici});
    window.addEventListener('storage',aggiorna);
    aggiorna();
})();
