/* Destinazioni ed eventi sono distinti dalla scadenza della merce. */
(function () {
    const testo = v => typeof v === 'string' ? v.trim() : '';
    const escape = v => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    function valida(destinazione, data, anticipo) {
        destinazione = testo(destinazione);
        data = testo(data);
        if (!destinazione && !data && String(anticipo ?? '').trim() === '') return {promemoria: null};
        if (!destinazione) return {errore: 'Indica para quién o qué evento está reservado el producto.'};
        if (!data) {
            if (String(anticipo ?? '').trim() !== '') return {errore: 'Indica la fecha del evento para programar un recordatorio.'};
            return {promemoria: {destinazione, data_evento: '', anticipo_giorni: null}};
        }
        if (!EatScadenze.formato(data)) return {errore: 'Introduce una fecha de evento válida.'};
        const giorni = Number(anticipo);
        if (String(anticipo ?? '').trim() === '' || !Number.isSafeInteger(giorni) || giorni < 0 || giorni > 365) {
            return {errore: 'Introduce de 0 a 365 días antes. 0 significa el día del evento.'};
        }
        return {promemoria: {destinazione, data_evento: data, anticipo_giorni: giorni}};
    }
    function conflitto(p, dataEvento) {
        if (!EatScadenze.formato(dataEvento)) return {oltre: false, testo: ''};
        const scadenza = EatScadenze.descrivi(p);
        if (!scadenza.data) return {oltre: false, testo: p.tipo_scadenza === 'nessuna' ? '' : 'No se puede calcular la fecha del producto: revisa los datos antes del evento.'};
        const oltre = dataEvento > scadenza.data;
        return {oltre, scadenza: scadenza.data, testo: oltre ? `Atención: la ${scadenza.tipo === 'tassativa' ? 'fecha estricta' : 'fecha orientativa'} del producto es ${EatScadenze.formato(scadenza.data)}, antes del evento del ${EatScadenze.formato(dataEvento)}. Comprueba que siga siendo adecuado para el uso previsto.` : ''};
    }
    function stato(p, oggi = EatScadenze.oggi()) {
        const memo = p.promemoria;
        if (!memo || !testo(memo.destinazione)) return null;
        const risultato = {destinazione: testo(memo.destinazione), data: '', attivo: false, giorni: null, testo: 'Reservado para: ' + testo(memo.destinazione)};
        const verifica = valida(memo.destinazione, memo.data_evento, memo.anticipo_giorni);
        if (verifica.errore || !memo.data_evento) return risultato;
        const giorni = Math.round((new Date(memo.data_evento + 'T00:00:00Z') - new Date(oggi + 'T00:00:00Z')) / 86400000);
        risultato.data = memo.data_evento;
        risultato.giorni = giorni;
        risultato.attivo = giorni <= Number(memo.anticipo_giorni);
        risultato.testo = giorni < 0 ? `El evento fue hace ${-giorni} ${giorni === -1 ? 'día' : 'días'}: revisa el recordatorio` :
            giorni === 0 ? 'Evento hoy' : giorni === 1 ? 'Evento mañana' : `Evento dentro de ${giorni} días`;
        return risultato;
    }
    function html(p) {
        const memo = stato(p);
        const nota = testo(p.note);
        if (!memo && !nota) return '';
        let contenuto = memo ? `<strong>📌 Reservado para: ${escape(memo.destinazione)}</strong>` : '';
        if (memo?.data) contenuto += `<br>${EatScadenze.formato(memo.data)} · ${escape(memo.testo)}`;
        if (memo?.data) {
            const avviso = conflitto(p, memo.data);
            if (avviso.testo) contenuto += `<br><strong>⚠ ${escape(avviso.testo)}</strong>`;
        }
        if (nota) contenuto += `${contenuto ? '<br>' : ''}Nota: ${escape(nota)}`;
        return `<div style="margin-top:8px;font-size:13px;white-space:normal;overflow-wrap:anywhere">${contenuto}</div>`;
    }
    function avvisoUso(p) {
        const memo = stato(p);
        let avviso = memo ? `\n\n📌 Este producto está reservado para: ${memo.destinazione}${memo.data ? ' — ' + EatScadenze.formato(memo.data) : ''}.` : '';
        if (testo(p.note)) avviso += '\nNota: ' + testo(p.note);
        if (memo?.data) {
            const confl = conflitto(p, memo.data);
            if (confl.testo) avviso += '\n' + confl.testo;
        }
        return avviso ? avviso + '\n¿Usar este producto?' : '';
    }
    window.EatPromemoria = {valida, conflitto, stato, html, avvisoUso};
})();
