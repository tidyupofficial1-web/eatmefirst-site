/* Destinazioni ed eventi sono distinti dalla scadenza della merce. */
(function () {
    const testo = v => typeof v === 'string' ? v.trim() : '';
    const escape = v => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    function valida(destinazione, data, anticipo) {
        destinazione = testo(destinazione);
        data = testo(data);
        if (!destinazione && !data && String(anticipo ?? '').trim() === '') return {promemoria: null};
        if (!destinazione) return {errore: 'Scrivi per chi o per quale evento conservi il prodotto.'};
        if (!data) {
            if (String(anticipo ?? '').trim() !== '') return {errore: 'Indica la data dell’evento per impostare l’anticipo.'};
            return {promemoria: {destinazione, data_evento: '', anticipo_giorni: null}};
        }
        if (!EatScadenze.formato(data)) return {errore: 'Inserisci una data evento valida.'};
        const giorni = Number(anticipo);
        if (String(anticipo ?? '').trim() === '' || !Number.isSafeInteger(giorni) || giorni < 0 || giorni > 365) {
            return {errore: 'Indica da 0 a 365 giorni di anticipo. Usa 0 per un avviso il giorno dell’evento.'};
        }
        return {promemoria: {destinazione, data_evento: data, anticipo_giorni: giorni}};
    }
    function conflitto(p, dataEvento) {
        if (!EatScadenze.formato(dataEvento)) return {oltre: false, testo: ''};
        const scadenza = EatScadenze.descrivi(p);
        if (!scadenza.data) return {oltre: false, testo: p.tipo_scadenza === 'nessuna' ? '' : 'Scadenza del prodotto non calcolabile: verifica i dati prima dell’evento.'};
        const oltre = dataEvento > scadenza.data;
        return {oltre, scadenza: scadenza.data, testo: oltre ? `Attenzione: la scadenza ${scadenza.tipo} del prodotto è il ${EatScadenze.formato(scadenza.data)}, prima dell’evento del ${EatScadenze.formato(dataEvento)}. Verifica che sia ancora adatto all’uso previsto.` : ''};
    }
    function stato(p, oggi = EatScadenze.oggi()) {
        const memo = p.promemoria;
        if (!memo || !testo(memo.destinazione)) return null;
        const risultato = {destinazione: testo(memo.destinazione), data: '', attivo: false, giorni: null, testo: 'Riservato: ' + testo(memo.destinazione)};
        const verifica = valida(memo.destinazione, memo.data_evento, memo.anticipo_giorni);
        if (verifica.errore || !memo.data_evento) return risultato;
        const giorni = Math.round((new Date(memo.data_evento + 'T00:00:00Z') - new Date(oggi + 'T00:00:00Z')) / 86400000);
        risultato.data = memo.data_evento;
        risultato.giorni = giorni;
        risultato.attivo = giorni <= Number(memo.anticipo_giorni);
        risultato.testo = giorni < 0 ? `Evento trascorso da ${-giorni} ${giorni === -1 ? 'giorno' : 'giorni'}: verifica il promemoria` :
            giorni === 0 ? 'Evento oggi' : giorni === 1 ? 'Evento domani' : `Evento tra ${giorni} giorni`;
        return risultato;
    }
    function html(p) {
        const memo = stato(p);
        const nota = testo(p.note);
        if (!memo && !nota) return '';
        let contenuto = memo ? `<strong>📌 Riservato: ${escape(memo.destinazione)}</strong>` : '';
        if (memo?.data) contenuto += `<br>${EatScadenze.formato(memo.data)} · ${escape(memo.testo)}`;
        if (memo?.data) {
            const avviso = conflitto(p, memo.data);
            if (avviso.testo) contenuto += `<br><strong>⚠ ${escape(avviso.testo)}</strong>`;
        }
        if (nota) contenuto += `${contenuto ? '<br>' : ''}Note: ${escape(nota)}`;
        return `<div style="margin-top:8px;font-size:13px;white-space:normal;overflow-wrap:anywhere">${contenuto}</div>`;
    }
    function avvisoUso(p) {
        const memo = stato(p);
        let avviso = memo ? `\n\n📌 Questo prodotto è riservato: ${memo.destinazione}${memo.data ? ' — ' + EatScadenze.formato(memo.data) : ''}.` : '';
        if (testo(p.note)) avviso += '\nNota: ' + testo(p.note);
        if (memo?.data) {
            const confl = conflitto(p, memo.data);
            if (confl.testo) avviso += '\n' + confl.testo;
        }
        return avviso ? avviso + '\nConfermi di voler utilizzare questa scorta?' : '';
    }
    window.EatPromemoria = {valida, conflitto, stato, html, avvisoUso};
})();
