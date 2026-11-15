/* Destinazioni ed eventi sono distinti dalla scadenza della merce. */
(function () {
    const testo = v => typeof v === 'string' ? v.trim() : '';
    const escape = v => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    function valida(destinazione, data, anticipo) {
        destinazione = testo(destinazione);
        data = testo(data);
        if (!destinazione && !data && String(anticipo ?? '').trim() === '') return {promemoria: null};
        if (!destinazione) return {errore: 'Indique pour qui ou pour quel événement ce produit est réservé.'};
        if (!data) {
            if (String(anticipo ?? '').trim() !== '') return {errore: 'Indique la date de l’événement pour définir un rappel.'};
            return {promemoria: {destinazione, data_evento: '', anticipo_giorni: null}};
        }
        if (!EatScadenze.formato(data)) return {errore: 'Indique une date d’événement valide.'};
        const giorni = Number(anticipo);
        if (String(anticipo ?? '').trim() === '' || !Number.isSafeInteger(giorni) || giorni < 0 || giorni > 365) {
            return {errore: 'Indique de 0 à 365 jours avant. Avec 0, le rappel apparaît le jour de l’événement.'};
        }
        return {promemoria: {destinazione, data_evento: data, anticipo_giorni: giorni}};
    }
    function conflitto(p, dataEvento) {
        if (!EatScadenze.formato(dataEvento)) return {oltre: false, testo: ''};
        const scadenza = EatScadenze.descrivi(p);
        if (!scadenza.data) return {oltre: false, testo: p.tipo_scadenza === 'nessuna' ? '' : 'La date du produit ne peut pas être calculée : vérifie les données avant l’événement.'};
        const oltre = dataEvento > scadenza.data;
        return {oltre, scadenza: scadenza.data, testo: oltre ? `Attention : la date ${scadenza.tipo === 'tassativa' ? 'impérative' : 'indicative'} du produit est le ${EatScadenze.formato(scadenza.data)}, avant l’événement du ${EatScadenze.formato(dataEvento)}. Vérifie s’il convient encore à l’usage prévu.` : ''};
    }
    function stato(p, oggi = EatScadenze.oggi()) {
        const memo = p.promemoria;
        if (!memo || !testo(memo.destinazione)) return null;
        const risultato = {destinazione: testo(memo.destinazione), data: '', attivo: false, giorni: null, testo: 'Réservé pour : ' + testo(memo.destinazione)};
        const verifica = valida(memo.destinazione, memo.data_evento, memo.anticipo_giorni);
        if (verifica.errore || !memo.data_evento) return risultato;
        const giorni = Math.round((new Date(memo.data_evento + 'T00:00:00Z') - new Date(oggi + 'T00:00:00Z')) / 86400000);
        risultato.data = memo.data_evento;
        risultato.giorni = giorni;
        risultato.attivo = giorni <= Number(memo.anticipo_giorni);
        risultato.testo = giorni < 0 ? `Événement passé depuis ${-giorni} ${giorni === -1 ? 'jour' : 'jours'} : vérifie le rappel` :
            giorni === 0 ? 'Événement aujourd’hui' : giorni === 1 ? 'Événement demain' : `Événement dans ${giorni} jours`;
        return risultato;
    }
    function html(p) {
        const memo = stato(p);
        const nota = testo(p.note);
        if (!memo && !nota) return '';
        let contenuto = memo ? `<strong>📌 Réservé pour : ${escape(memo.destinazione)}</strong>` : '';
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
        let avviso = memo ? `\n\n📌 Ce produit est réservé pour : ${memo.destinazione}${memo.data ? ' — ' + EatScadenze.formato(memo.data) : ''}.` : '';
        if (testo(p.note)) avviso += '\nNote: ' + testo(p.note);
        if (memo?.data) {
            const confl = conflitto(p, memo.data);
            if (confl.testo) avviso += '\n' + confl.testo;
        }
        return avviso ? avviso + '\nConfirmer l’utilisation de cette réserve ?' : '';
    }
    window.EatPromemoria = {valida, conflitto, stato, html, avvisoUso};
})();
