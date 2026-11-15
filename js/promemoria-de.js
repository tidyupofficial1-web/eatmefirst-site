/* Destinazioni ed eventi sono distinti dalla scadenza della merce. */
(function () {
    const testo = v => typeof v === 'string' ? v.trim() : '';
    const escape = v => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    function valida(destinazione, data, anticipo) {
        destinazione = testo(destinazione);
        data = testo(data);
        if (!destinazione && !data && String(anticipo ?? '').trim() === '') return {promemoria: null};
        if (!destinazione) return {errore: 'Gib an, für wen oder welches Ereignis das Produkt reserviert ist.'};
        if (!data) {
            if (String(anticipo ?? '').trim() !== '') return {errore: 'Gib ein Ereignisdatum an, um eine Erinnerung festzulegen.'};
            return {promemoria: {destinazione, data_evento: '', anticipo_giorni: null}};
        }
        if (!EatScadenze.formato(data)) return {errore: 'Gib ein gültiges Ereignisdatum ein.'};
        const giorni = Number(anticipo);
        if (String(anticipo ?? '').trim() === '' || !Number.isSafeInteger(giorni) || giorni < 0 || giorni > 365) {
            return {errore: 'Gib 0 bis 365 Tage vorher an. 0 bedeutet Erinnerung am Ereignistag.'};
        }
        return {promemoria: {destinazione, data_evento: data, anticipo_giorni: giorni}};
    }
    function conflitto(p, dataEvento) {
        if (!EatScadenze.formato(dataEvento)) return {oltre: false, testo: ''};
        const scadenza = EatScadenze.descrivi(p);
        if (!scadenza.data) return {oltre: false, testo: p.tipo_scadenza === 'nessuna' ? '' : 'Produktdatum nicht berechenbar: Prüfe die Angaben vor dem Ereignis.'};
        const oltre = dataEvento > scadenza.data;
        return {oltre, scadenza: scadenza.data, testo: oltre ? `Achtung: Das ${scadenza.tipo === 'tassativa' ? 'verbindliche Datum' : 'Richtdatum'} des Produkts ist der ${EatScadenze.formato(scadenza.data)}, vor dem Ereignis am ${EatScadenze.formato(dataEvento)}. Prüfe, ob es für den vorgesehenen Zweck noch geeignet ist.` : ''};
    }
    function stato(p, oggi = EatScadenze.oggi()) {
        const memo = p.promemoria;
        if (!memo || !testo(memo.destinazione)) return null;
        const risultato = {destinazione: testo(memo.destinazione), data: '', attivo: false, giorni: null, testo: 'Reserviert für: ' + testo(memo.destinazione)};
        const verifica = valida(memo.destinazione, memo.data_evento, memo.anticipo_giorni);
        if (verifica.errore || !memo.data_evento) return risultato;
        const giorni = Math.round((new Date(memo.data_evento + 'T00:00:00Z') - new Date(oggi + 'T00:00:00Z')) / 86400000);
        risultato.data = memo.data_evento;
        risultato.giorni = giorni;
        risultato.attivo = giorni <= Number(memo.anticipo_giorni);
        risultato.testo = giorni < 0 ? `Ereignis war vor ${-giorni} ${giorni === -1 ? 'Tag' : 'Tagen'}: Prüfe die Erinnerung` :
            giorni === 0 ? 'Ereignis heute' : giorni === 1 ? 'Ereignis morgen' : `Ereignis in ${giorni} Tagen`;
        return risultato;
    }
    function html(p) {
        const memo = stato(p);
        const nota = testo(p.note);
        if (!memo && !nota) return '';
        let contenuto = memo ? `<strong>📌 Reserviert für: ${escape(memo.destinazione)}</strong>` : '';
        if (memo?.data) contenuto += `<br>${EatScadenze.formato(memo.data)} · ${escape(memo.testo)}`;
        if (memo?.data) {
            const avviso = conflitto(p, memo.data);
            if (avviso.testo) contenuto += `<br><strong>⚠ ${escape(avviso.testo)}</strong>`;
        }
        if (nota) contenuto += `${contenuto ? '<br>' : ''}Notiz: ${escape(nota)}`;
        return `<div style="margin-top:8px;font-size:13px;white-space:normal;overflow-wrap:anywhere">${contenuto}</div>`;
    }
    function avvisoUso(p) {
        const memo = stato(p);
        let avviso = memo ? `\n\n📌 Dieses Produkt ist reserviert für: ${memo.destinazione}${memo.data ? ' — ' + EatScadenze.formato(memo.data) : ''}.` : '';
        if (testo(p.note)) avviso += '\nNotiz: ' + testo(p.note);
        if (memo?.data) {
            const confl = conflitto(p, memo.data);
            if (confl.testo) avviso += '\n' + confl.testo;
        }
        return avviso ? avviso + '\nDiesen Vorrat verwenden?' : '';
    }
    window.EatPromemoria = {valida, conflitto, stato, html, avvisoUso};
})();
