/* Invia solo i campi del questionario dopo una conferma esplicita. */
(function () {
    const KEY = 'eat_questionario_bozza_it_v1';
    const form = document.getElementById('questionario'), stato = document.getElementById('stato');
    const campi = ['email','frequenza','motivo','parziale','confezioni','aggiornamento','difficolta','utilita','nuova','cambiamento'];
    let invio = false, completato = false;
    const scelte = [...form.querySelectorAll('input[name="funzioni"]')];
    try {
        const nome = localStorage.getItem('eatmefirst_username') || localStorage.getItem('eat_user_name');
        if (nome?.trim()) document.getElementById('saluto').textContent = `Salut ${nome.trim().slice(0,80)}, moi c’est Leo ! 👋`;
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const dati = JSON.parse(raw);
            for (const campo of campi) if (typeof dati[campo] === 'string') document.getElementById(campo).value = dati[campo].slice(0,2000);
            for (const c of scelte) c.checked = Array.isArray(dati.funzioni) && dati.funzioni.includes(c.value);
            stato.textContent = 'Brouillon récupéré dans ce navigateur. Aucune réponse n’a été envoyée.';
        }
    } catch (_) { stato.textContent = 'Impossible de récupérer le brouillon. Aucune donnée n’a été supprimée.'; }
    function salva(completa = false) {
        try {
            const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value]));
            dati.funzioni = scelte.filter(c=>c.checked).map(c=>c.value);
            localStorage.setItem(KEY,JSON.stringify(dati));
            stato.textContent = 'Brouillon enregistré dans ce navigateur. Aucune réponse envoyée.';
        } catch (_) { stato.textContent = 'Brouillon non enregistré : vérifie l’espace disponible et les autorisations du navigateur.'; }
    }
    document.getElementById('salva').addEventListener('click',()=>salva());
    form.addEventListener('submit',async evento=>{
        evento.preventDefault();
        if (invio || completato || !form.reportValidity()) return;
        const selezionate = scelte.filter(c=>c.checked);
        if (!selezionate.length || (selezionate.length > 1 && selezionate.some(c=>c.value === 'Nessuna'))) {
            stato.textContent = 'À la question 2, choisis les fonctions utilisées ou seulement « Je n’en utilise encore aucune ».';
            scelte[0].focus(); return;
        }
        if (!confirm('Envoyer tes réponses et ton e-mail à EatMeFirst via Formspree ? Tes réserves ne seront pas jointes.')) return;
        const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value.trim()]));
        dati.funzioni = selezionate.map(c=>c.value);
        dati.subject = 'PAGINA FORM EATMEFIRST — Questionario';
        invio = true;
        const pulsante = document.getElementById('invia');
        pulsante.disabled = true;
        stato.textContent = 'Envoi en cours. Attends la confirmation…';
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(),30000);
        try {
            const risposta = await fetch('https://formspree.io/f/xvkkwkzj', {
                method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'},
                body:JSON.stringify(dati), signal:controller.signal
            });
            if (!risposta.ok) throw new Error('Invio non accettato');
            completato = true;
            stato.textContent = 'Merci ! Formspree a reçu ton questionnaire EatMeFirst. Le code cadeau n’est pas encore généré automatiquement. Tu peux conserver cette page comme confirmation.';
        } catch (_) {
            stato.textContent = 'Nous n’avons pas reçu de confirmation d’envoi. Tes réponses restent sur cette page : tu peux enregistrer un brouillon. Avant de réessayer, pense que le message est peut-être déjà arrivé.';
        } finally {
            clearTimeout(timeout); invio = false; pulsante.disabled = completato;
        }
    });
    document.getElementById('elimina').addEventListener('click',()=>{
        if (!confirm('Supprimer le brouillon du questionnaire de ce navigateur ? Tes réserves ne seront pas modifiées.')) return;
        try { localStorage.removeItem(KEY); form.reset(); stato.textContent = 'Brouillon supprimé. Tes réserves n’ont pas été modifiées.'; }
        catch (_) { stato.textContent = 'Impossible de supprimer le brouillon.'; }
    });
})();
