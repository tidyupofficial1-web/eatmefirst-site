/* Invia solo i campi del questionario dopo una conferma esplicita. */
(function () {
    const KEY = 'eat_questionario_bozza_it_v1';
    const form = document.getElementById('questionario'), stato = document.getElementById('stato');
    const campi = ['email','frequenza','motivo','parziale','confezioni','aggiornamento','difficolta','utilita','nuova','cambiamento'];
    let invio = false, completato = false;
    const scelte = [...form.querySelectorAll('input[name="funzioni"]')];
    try {
        const nome = localStorage.getItem('eatmefirst_username') || localStorage.getItem('eat_user_name');
        if (nome?.trim()) document.getElementById('saluto').textContent = `Ciao ${nome.trim().slice(0,80)}, sono Leo! 👋`;
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const dati = JSON.parse(raw);
            for (const campo of campi) if (typeof dati[campo] === 'string') document.getElementById(campo).value = dati[campo].slice(0,2000);
            for (const c of scelte) c.checked = Array.isArray(dati.funzioni) && dati.funzioni.includes(c.value);
            stato.textContent = 'Bozza recuperata da questo browser. Nessuna risposta è stata inviata.';
        }
    } catch (_) { stato.textContent = 'Non è stato possibile recuperare la bozza. Nessun dato è stato cancellato.'; }
    function salva(completa = false) {
        try {
            const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value]));
            dati.funzioni = scelte.filter(c=>c.checked).map(c=>c.value);
            localStorage.setItem(KEY,JSON.stringify(dati));
            stato.textContent = 'Bozza salvata in questo browser. Nessuna risposta inviata.';
        } catch (_) { stato.textContent = 'Bozza non salvata: controlla lo spazio disponibile e i permessi del browser.'; }
    }
    document.getElementById('salva').addEventListener('click',()=>salva());
    form.addEventListener('submit',async evento=>{
        evento.preventDefault();
        if (invio || completato || !form.reportValidity()) return;
        const selezionate = scelte.filter(c=>c.checked);
        if (!selezionate.length || (selezionate.length > 1 && selezionate.some(c=>c.value === 'Nessuna'))) {
            stato.textContent = 'Alla domanda 2 scegli le funzioni usate oppure soltanto «Non ne uso ancora nessuna».';
            scelte[0].focus(); return;
        }
        if (!confirm('Inviare le risposte e la tua email a EatMeFirst tramite Formspree? La dispensa non verrà allegata.')) return;
        const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value.trim()]));
        dati.funzioni = selezionate.map(c=>c.value);
        dati.subject = 'PAGINA FORM EATMEFIRST — Questionario';
        invio = true;
        const pulsante = document.getElementById('invia');
        pulsante.disabled = true;
        stato.textContent = 'Invio in corso. Attendi la conferma…';
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(),30000);
        try {
            const risposta = await fetch('https://formspree.io/f/xvkkwkzj', {
                method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'},
                body:JSON.stringify(dati), signal:controller.signal
            });
            if (!risposta.ok) throw new Error('Invio non accettato');
            completato = true;
            stato.textContent = 'Grazie! Formspree ha ricevuto il questionario per EatMeFirst. Il codice premio non viene ancora generato automaticamente. Puoi conservare questa pagina come conferma.';
        } catch (_) {
            stato.textContent = 'Non abbiamo ricevuto la conferma dell’invio. Le risposte restano nella pagina: puoi salvare la bozza. Prima di riprovare, considera che il messaggio potrebbe essere già arrivato.';
        } finally {
            clearTimeout(timeout); invio = false; pulsante.disabled = completato;
        }
    });
    document.getElementById('elimina').addEventListener('click',()=>{
        if (!confirm('Vuoi eliminare la bozza del questionario da questo browser? La dispensa non viene modificata.')) return;
        try { localStorage.removeItem(KEY); form.reset(); stato.textContent = 'Bozza eliminata. La dispensa non è stata modificata.'; }
        catch (_) { stato.textContent = 'Non è stato possibile eliminare la bozza.'; }
    });
})();
