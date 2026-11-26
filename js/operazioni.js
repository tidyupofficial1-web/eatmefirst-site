const testiOperazioni = window.EatOperazioniTesti?.[document.documentElement.lang];
const tipiOperazioni = {Carico:'Product Entry', Scarico:'Removal', 'Foto prodotto':'Product photo', 'Note e promemoria':'Notes and reminders', Spostamento:'Move', 'Consumo parziale':'Partial use', 'Lista della spesa':'Shopping list'};

function tipoOperazione(tipo) {
    return (testiOperazioni?.types ?? tipiOperazioni)[tipo] ?? tipo;
}
function erroreOperazione(messaggio) {
    if (!testiOperazioni) return EatErroriEN(messaggio);
    const prefisso = 'Annulla prima l’operazione successiva: ';
    if (messaggio.startsWith(prefisso)) return testiOperazioni.later + ' ' + messaggio.slice(prefisso.length);
    if (messaggio === 'Operazione già annullata.') return testiOperazioni.already;
    return testiOperazioni.error;
}

let selezionata = null;
let focusPrecedente = null;
function aggiorna() {
    const corpo = document.getElementById('operazioni');
    corpo.replaceChildren();
    try {
        const voci = EatStorico.elenco();
        const letture = {};
        document.getElementById('stato').textContent = voci.length ? (testiOperazioni?.count.replace('{count}', voci.length) ?? `${voci.length} recent operations, newest first.`) : (testiOperazioni?.empty ?? 'No operations recorded. Earlier movements are not reconstructed.');
        voci.forEach(voce => {
            const riga = document.createElement('tr');
            if (voce.annullata) riga.className = 'annullata';
            for (const testo of [new Date(voce.data).toLocaleString(testiOperazioni ? document.documentElement.lang : 'en-GB'), tipoOperazione(voce.tipo), voce.descrizione]) {
                const cella = document.createElement('td');
                cella.textContent = testo;
                riga.appendChild(cella);
            }
            const scelta = document.createElement('td');
            const motivo = EatStorico.motivo(voce.id, voci, letture);
            const pulsante = document.createElement('button');
            pulsante.type = 'button';
            pulsante.textContent = voce.annullata ? (testiOperazioni?.undone ?? 'Already undone') : (testiOperazioni?.undo ?? 'Undo operation');
            pulsante.disabled = !!motivo;
            pulsante.addEventListener('click', () => apriConferma(voce.id));
            scelta.appendChild(pulsante);
            if (motivo) {
                const spiegazione = document.createElement('span');
                spiegazione.className = 'motivo';
                spiegazione.textContent = erroreOperazione(motivo);
                scelta.appendChild(spiegazione);
            }
            riga.appendChild(scelta);
            corpo.appendChild(riga);
        });
    } catch (errore) { document.getElementById('stato').textContent = erroreOperazione(errore.message); }
}
function apriConferma(id) {
    try {
        const motivo = EatStorico.motivo(id);
        if (motivo) { document.getElementById('stato').textContent = erroreOperazione(motivo); aggiorna(); return; }
        const voce = EatStorico.elenco().find(v => v.id === id);
        selezionata = id;
        focusPrecedente = document.activeElement;
        document.getElementById('descrizioneConferma').textContent = `${testiOperazioni ? tipoOperazione(voce.tipo) : voce.tipo} — ${voce.descrizione}`;
        document.getElementById('confermaOperazione').hidden = false;
        document.getElementById('nonAnnullare').focus();
    } catch (errore) { document.getElementById('stato').textContent = erroreOperazione(errore.message); }
}
function chiudiConferma() {
    selezionata = null;
    document.getElementById('confermaOperazione').hidden = true;
    focusPrecedente?.focus();
}
function eseguiAnnullamento() {
    if (!selezionata) return;
    try {
        EatStorico.annulla(selezionata);
        chiudiConferma();
        aggiorna();
        document.getElementById('stato').textContent = testiOperazioni?.done ?? 'Operation undone. Other independent changes were kept.';
    } catch (errore) { chiudiConferma(); aggiorna(); document.getElementById('stato').textContent = erroreOperazione(errore.message); }
}
function tastieraConferma(evento) {
    if (evento.key === 'Escape') { evento.preventDefault(); chiudiConferma(); }
    if (evento.key === 'Tab') {
        const primo = document.getElementById('nonAnnullare'), ultimo = document.getElementById('annullaOperazione');
        if (evento.shiftKey && document.activeElement === primo) { evento.preventDefault(); ultimo.focus(); }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primo.focus(); }
    }
}
let attesaAggiornamento = null;
window.addEventListener('storage', () => {
    clearTimeout(attesaAggiornamento);
    attesaAggiornamento = setTimeout(aggiorna, 100);
});
window.addEventListener('focus', aggiorna);
document.addEventListener('visibilitychange', () => { if (!document.hidden) aggiorna(); });
aggiorna();
