/* Invia solo i campi del questionario dopo una conferma esplicita. */
(function () {
    const KEY = 'eat_questionario_bozza_it_v1';
    const form = document.getElementById('questionario'), stato = document.getElementById('stato');
    const campi = ['email','frequenza','motivo','parziale','confezioni','aggiornamento','difficolta','utilita','nuova','cambiamento'];
    let invio = false, completato = false;
    const scelte = [...form.querySelectorAll('input[name="funzioni"]')];
    try {
        const nome = localStorage.getItem('eatmefirst_username') || localStorage.getItem('eat_user_name');
        if (nome?.trim()) document.getElementById('saluto').textContent = `Hallo ${nome.trim().slice(0,80)}, ich bin Leo! 👋`;
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const dati = JSON.parse(raw);
            for (const campo of campi) if (typeof dati[campo] === 'string') document.getElementById(campo).value = dati[campo].slice(0,2000);
            for (const c of scelte) c.checked = Array.isArray(dati.funzioni) && dati.funzioni.includes(c.value);
            stato.textContent = 'Entwurf aus diesem Browser wiederhergestellt. Es wurden keine Antworten gesendet.';
        }
    } catch (_) { stato.textContent = 'Der Entwurf konnte nicht wiederhergestellt werden. Es wurden keine Daten gelöscht.'; }
    function salva(completa = false) {
        try {
            const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value]));
            dati.funzioni = scelte.filter(c=>c.checked).map(c=>c.value);
            localStorage.setItem(KEY,JSON.stringify(dati));
            stato.textContent = 'Entwurf in diesem Browser gespeichert. Keine Antworten gesendet.';
        } catch (_) { stato.textContent = 'Entwurf nicht gespeichert: Prüfe freien Speicher und Browser-Berechtigungen.'; }
    }
    document.getElementById('salva').addEventListener('click',()=>salva());
    form.addEventListener('submit',async evento=>{
        evento.preventDefault();
        if (invio || completato || !form.reportValidity()) return;
        const selezionate = scelte.filter(c=>c.checked);
        if (!selezionate.length || (selezionate.length > 1 && selezionate.some(c=>c.value === 'Nessuna'))) {
            stato.textContent = 'Wähle bei Frage 2 die genutzten Funktionen oder nur „Ich nutze noch keine davon“.';
            scelte[0].focus(); return;
        }
        if (!confirm('Antworten und E-Mail-Adresse über Formspree an EatMeFirst senden? Deine Vorräte werden nicht angehängt.')) return;
        const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value.trim()]));
        dati.funzioni = selezionate.map(c=>c.value);
        dati.subject = 'PAGINA FORM EATMEFIRST — Questionario';
        invio = true;
        const pulsante = document.getElementById('invia');
        pulsante.disabled = true;
        stato.textContent = 'Wird gesendet. Bitte warte auf die Bestätigung…';
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(),30000);
        try {
            const risposta = await fetch('https://formspree.io/f/xvkkwkzj', {
                method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'},
                body:JSON.stringify(dati), signal:controller.signal
            });
            if (!risposta.ok) throw new Error('Invio non accettato');
            completato = true;
            stato.textContent = 'Danke! Formspree hat deinen EatMeFirst-Fragebogen erhalten. Der Prämiencode wird noch nicht automatisch erstellt. Du kannst diese Seite als Bestätigung aufbewahren.';
        } catch (_) {
            stato.textContent = 'Wir haben keine Sendebestätigung erhalten. Deine Antworten bleiben auf der Seite: Du kannst einen Entwurf speichern. Vor einem neuen Versuch beachte bitte, dass die Nachricht bereits angekommen sein könnte.';
        } finally {
            clearTimeout(timeout); invio = false; pulsante.disabled = completato;
        }
    });
    document.getElementById('elimina').addEventListener('click',()=>{
        if (!confirm('Den Fragebogen-Entwurf aus diesem Browser löschen? Deine Vorräte werden nicht verändert.')) return;
        try { localStorage.removeItem(KEY); form.reset(); stato.textContent = 'Entwurf gelöscht. Deine Vorräte wurden nicht verändert.'; }
        catch (_) { stato.textContent = 'Der Entwurf konnte nicht gelöscht werden.'; }
    });
})();
