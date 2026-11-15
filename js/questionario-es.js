/* Invia solo i campi del questionario dopo una conferma esplicita. */
(function () {
    const KEY = 'eat_questionario_bozza_it_v1';
    const form = document.getElementById('questionario'), stato = document.getElementById('stato');
    const campi = ['email','frequenza','motivo','parziale','confezioni','aggiornamento','difficolta','utilita','nuova','cambiamento'];
    let invio = false, completato = false;
    const scelte = [...form.querySelectorAll('input[name="funzioni"]')];
    try {
        const nome = localStorage.getItem('eatmefirst_username') || localStorage.getItem('eat_user_name');
        if (nome?.trim()) document.getElementById('saluto').textContent = `¡Hola ${nome.trim().slice(0,80)}, soy Leo! 👋`;
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const dati = JSON.parse(raw);
            for (const campo of campi) if (typeof dati[campo] === 'string') document.getElementById(campo).value = dati[campo].slice(0,2000);
            for (const c of scelte) c.checked = Array.isArray(dati.funzioni) && dati.funzioni.includes(c.value);
            stato.textContent = 'Borrador recuperado de este navegador. No se ha enviado ninguna respuesta.';
        }
    } catch (_) { stato.textContent = 'No se pudo recuperar el borrador. No se ha eliminado ningún dato.'; }
    function salva(completa = false) {
        try {
            const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value]));
            dati.funzioni = scelte.filter(c=>c.checked).map(c=>c.value);
            localStorage.setItem(KEY,JSON.stringify(dati));
            stato.textContent = 'Borrador guardado en este navegador. No se ha enviado ninguna respuesta.';
        } catch (_) { stato.textContent = 'Borrador no guardado: comprueba el espacio disponible y los permisos del navegador.'; }
    }
    document.getElementById('salva').addEventListener('click',()=>salva());
    form.addEventListener('submit',async evento=>{
        evento.preventDefault();
        if (invio || completato || !form.reportValidity()) return;
        const selezionate = scelte.filter(c=>c.checked);
        if (!selezionate.length || (selezionate.length > 1 && selezionate.some(c=>c.value === 'Nessuna'))) {
            stato.textContent = 'En la pregunta 2 elige las funciones que usas o solo «Todavía no uso ninguna».';
            scelte[0].focus(); return;
        }
        if (!confirm('¿Enviar tus respuestas y tu correo a EatMeFirst mediante Formspree? No se adjuntará tu despensa.')) return;
        const dati = Object.fromEntries(campi.map(c=>[c,document.getElementById(c).value.trim()]));
        dati.funzioni = selezionate.map(c=>c.value);
        dati.subject = 'PAGINA FORM EATMEFIRST — Questionario';
        invio = true;
        const pulsante = document.getElementById('invia');
        pulsante.disabled = true;
        stato.textContent = 'Enviando. Espera la confirmación…';
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(),30000);
        try {
            const risposta = await fetch('https://formspree.io/f/xvkkwkzj', {
                method:'POST', headers:{'Accept':'application/json','Content-Type':'application/json'},
                body:JSON.stringify(dati), signal:controller.signal
            });
            if (!risposta.ok) throw new Error('Invio non accettato');
            completato = true;
            stato.textContent = '¡Gracias! Formspree ha recibido tu cuestionario de EatMeFirst. El código de regalo aún no se genera automáticamente. Puedes conservar esta página como confirmación.';
        } catch (_) {
            stato.textContent = 'No hemos recibido la confirmación del envío. Tus respuestas siguen en la página: puedes guardar un borrador. Antes de volver a intentarlo, ten en cuenta que el mensaje podría haber llegado.';
        } finally {
            clearTimeout(timeout); invio = false; pulsante.disabled = completato;
        }
    });
    document.getElementById('elimina').addEventListener('click',()=>{
        if (!confirm('¿Eliminar el borrador del cuestionario de este navegador? Tu despensa no se modificará.')) return;
        try { localStorage.removeItem(KEY); form.reset(); stato.textContent = 'Borrador eliminado. Tu despensa no se ha modificado.'; }
        catch (_) { stato.textContent = 'No se pudo eliminar el borrador.'; }
    });
})();
