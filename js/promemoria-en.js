/* Destinazioni ed eventi sono distinti dalla scadenza della merce. */
(function () {
    const labels = window.EatInventarioTesti?.[window.document?.documentElement.lang]?.reminders;
    const message = (key, fallback) => labels?.[key] ?? fallback;
    const testo = v => typeof v === 'string' ? v.trim() : '';
    const escape = v => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    function valida(destinazione, data, anticipo) {
        destinazione = testo(destinazione);
        data = testo(data);
        if (!destinazione && !data && String(anticipo ?? '').trim() === '') return {promemoria: null};
        if (!destinazione) return {errore: message('recipient', 'Enter who or which event this product is reserved for.')};
        if (!data) {
            if (String(anticipo ?? '').trim() !== '') return {errore: message('dateRequired', 'Enter an event date to set a reminder.')};
            return {promemoria: {destinazione, data_evento: '', anticipo_giorni: null}};
        }
        if (!EatScadenze.formato(data)) return {errore: message('invalidDate', 'Enter a valid event date.')};
        const giorni = Number(anticipo);
        if (String(anticipo ?? '').trim() === '' || !Number.isSafeInteger(giorni) || giorni < 0 || giorni > 365) {
            return {errore: message('lead', 'Enter 0 to 365 days beforehand. Use 0 for a reminder on the event day.')};
        }
        return {promemoria: {destinazione, data_evento: data, anticipo_giorni: giorni}};
    }
    function conflitto(p, dataEvento) {
        if (!EatScadenze.formato(dataEvento)) return {oltre: false, testo: ''};
        const scadenza = EatScadenze.descrivi(p);
        if (!scadenza.data) return {oltre: false, testo: p.tipo_scadenza === 'nessuna' ? '' : message('invalidProductDate', 'The product date cannot be calculated: check the details before the event.')};
        const oltre = dataEvento > scadenza.data;
        return {oltre, scadenza: scadenza.data, testo: oltre ? message('conflict', `Warning: the product’s ${scadenza.tipo === 'tassativa' ? 'strict' : 'indicative'} date is ${EatScadenze.formato(scadenza.data)}, before the event on ${EatScadenze.formato(dataEvento)}. Check whether it is still suitable for the intended use.`).replace('{date}', EatScadenze.formato(scadenza.data)).replace('{event}', EatScadenze.formato(dataEvento)) : ''};
    }
    function stato(p, oggi = EatScadenze.oggi()) {
        const memo = p.promemoria;
        if (!memo || !testo(memo.destinazione)) return null;
        const risultato = {destinazione: testo(memo.destinazione), data: '', attivo: false, giorni: null, testo: message('reserved', 'Reserved for: ') + testo(memo.destinazione)};
        const verifica = valida(memo.destinazione, memo.data_evento, memo.anticipo_giorni);
        if (verifica.errore || !memo.data_evento) return risultato;
        const giorni = Math.round((new Date(memo.data_evento + 'T00:00:00Z') - new Date(oggi + 'T00:00:00Z')) / 86400000);
        risultato.data = memo.data_evento;
        risultato.giorni = giorni;
        risultato.attivo = giorni <= Number(memo.anticipo_giorni);
        risultato.testo = giorni < 0 ? message('passed', `Event was ${-giorni} ${giorni === -1 ? 'day' : 'days'} ago: check the reminder`).replace('{n}', -giorni) :
            giorni === 0 ? message('today', 'Event today') : giorni === 1 ? message('tomorrow', 'Event tomorrow') : message('inDays', `Event in ${giorni} days`).replace('{n}', giorni);
        return risultato;
    }
    function html(p) {
        const memo = stato(p);
        const nota = testo(p.note);
        if (!memo && !nota) return '';
        let contenuto = memo ? `<strong>📌 ${message('reserved', 'Reserved for: ')}${escape(memo.destinazione)}</strong>` : '';
        if (memo?.data) contenuto += `<br>${EatScadenze.formato(memo.data)} · ${escape(memo.testo)}`;
        if (memo?.data) {
            const avviso = conflitto(p, memo.data);
            if (avviso.testo) contenuto += `<br><strong>⚠ ${escape(avviso.testo)}</strong>`;
        }
        if (nota) contenuto += `${contenuto ? '<br>' : ''}${message('note', 'Note: ')}${escape(nota)}`;
        return `<div style="margin-top:8px;font-size:13px;white-space:normal;overflow-wrap:anywhere">${contenuto}</div>`;
    }
    function avvisoUso(p) {
        const memo = stato(p);
        let avviso = memo ? `\n\n📌 ${message('reserved', 'This product is reserved for: ')}${memo.destinazione}${memo.data ? ' — ' + EatScadenze.formato(memo.data) : ''}.` : '';
        if (testo(p.note)) avviso += '\n' + message('note', 'Note: ') + testo(p.note);
        if (memo?.data) {
            const confl = conflitto(p, memo.data);
            if (confl.testo) avviso += '\n' + confl.testo;
        }
        return avviso ? avviso + '\n' + message('confirm', 'Confirm using this stock?') : '';
    }
    window.EatPromemoria = {valida, conflitto, stato, html, avvisoUso};
})();
