/* Invia solo i campi del questionario dopo una conferma esplicita. */
(function () {
    const KEY = 'eat_questionario_bozza_it_v1';
    const form = document.getElementById('questionario'), stato = document.getElementById('stato');
    const campi = ['email','frequenza','motivo','parziale','confezioni','aggiornamento','difficolta','utilita','nuova','cambiamento'];
    let invio = false, completato = false;
    const scelte = [...form.querySelectorAll('input[name="funzioni"]')];
    try {
        const nome = localStorage.getItem('eatmefirst_username') || localStorage.getItem('eat_user_name');
        if (nome?.trim()) document.getElementById('saluto').textContent = `Hi ${nome.trim().slice(0,80)}, I’m Leo! 👋`;
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const dati = JSON.parse(raw);
            for (const campo of campi) if (typeof dati[campo] === 'string') document.getElementById(campo).value = dati[campo].slice(0,2000);
            for (const c of scelte) c.checked = Array.isArray(dati.funzioni) && dati.funzioni.includes(c.value);
            stato.textContent = 'Draft restored from this browser. No answers have been sent.';
        }
    } catch (_) { stato.textContent = 'The draft could not be restored. No data has been deleted.'; }
    function salva(completa = false) {
        try {
            const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value]));
            dati.funzioni = scelte.filter(c=>c.checked).map(c=>c.value);
            localStorage.setItem(KEY,JSON.stringify(dati));
            stato.textContent = 'Draft saved in this browser. No answers sent.';
        } catch (_) { stato.textContent = 'Draft not saved: check available space and browser permissions.'; }
    }
    document.getElementById('salva').addEventListener('click',()=>salva());
    form.addEventListener('submit',async evento=>{
        evento.preventDefault();
        if (invio || completato || !form.reportValidity()) return;
        const selezionate = scelte.filter(c=>c.checked);
        if (!selezionate.length || (selezionate.length > 1 && selezionate.some(c=>c.value === 'Nessuna'))) {
            stato.textContent = "In question 2, choose the features you use or only “I don't use any yet”.";
            scelte[0].focus(); return;
        }
        if (!confirm('Send your answers and email to EatMeFirst through Formspree? Your inventory will not be attached.')) return;
        const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value.trim()]));
        dati.funzioni = selezionate.map(c=>c.value);
        dati.subject = 'PAGINA FORM EATMEFIRST — Questionario';
        invio = true;
        const pulsante = document.getElementById('invia');
        pulsante.disabled = true;
        stato.textContent = 'Sending. Please wait for confirmation…';
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(),30000);
        try {
            const risposta = await fetch('https://formspree.io/f/xvkkwkzj', {
                method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'},
                body:JSON.stringify(dati), signal:controller.signal
            });
            if (!risposta.ok) throw new Error('Invio non accettato');
            completato = true;
            stato.textContent = 'Thank you! Formspree has received your EatMeFirst questionnaire. The reward code is not yet generated automatically. You can keep this page as confirmation.';
        } catch (_) {
            stato.textContent = 'We have not received confirmation. Your answers are still on this page: you can save a draft. Before trying again, remember the message may already have arrived.';
        } finally {
            clearTimeout(timeout); invio = false; pulsante.disabled = completato;
        }
    });
    document.getElementById('elimina').addEventListener('click',()=>{
        if (!confirm('Delete the questionnaire draft from this browser? Your inventory will not change.')) return;
        try { localStorage.removeItem(KEY); form.reset(); stato.textContent = 'Draft deleted. Your inventory has not changed.'; }
        catch (_) { stato.textContent = 'The draft could not be deleted.'; }
    });
})();
