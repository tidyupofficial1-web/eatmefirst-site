/* Calendario locale: nessuna modifica della dispensa durante la consultazione. */
(function () {
    const ANTICIPO = 10;
    const pad = n => String(n).padStart(2, '0');
    function oggi(data = new Date()) {
        return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
    }
    function leggiData(valore) {
        if (typeof valore !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) return null;
        const [anno, mese, giorno] = valore.split('-').map(Number);
        if (anno < 1) return null;
        const data = new Date(0);
        data.setUTCHours(0, 0, 0, 0);
        data.setUTCFullYear(anno, mese - 1, giorno);
        return data.getUTCFullYear() === anno && data.getUTCMonth() === mese - 1 && data.getUTCDate() === giorno ? data : null;
    }
    const iso = d => `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    function calcola(tipo, valore, giornoCarico) {
        if (tipo === 'nessuna') return {valida: true, data: null};
        if (tipo === 'esatta') return leggiData(valore) ? {valida: true, data: valore} : {valida: false, messaggio: 'Seleziona una data precisa valida.'};
        if (!['giorni', 'mesi'].includes(tipo)) return {valida: false, messaggio: 'Scegli come indicare la scadenza.'};
        const numero = Number(valore);
        const massimo = tipo === 'giorni' ? 365 : 60;
        if (String(valore ?? '').trim() === '' || !Number.isSafeInteger(numero) || numero < 1 || numero > massimo) {
            return {valida: false, messaggio: `Inserisci un numero intero da 1 a ${massimo} nel campo ${tipo}.`};
        }
        const data = leggiData(giornoCarico);
        if (!data) return {valida: false, messaggio: 'Data di carico mancante o non valida: scadenza non calcolabile.'};
        if (tipo === 'giorni') data.setUTCDate(data.getUTCDate() + numero);
        else {
            // 31 gennaio + 1 mese = ultimo giorno di febbraio, senza slittare a marzo.
            const giorno = data.getUTCDate();
            data.setUTCDate(1);
            data.setUTCMonth(data.getUTCMonth() + numero);
            const fineMese = new Date(data.getTime());
            fineMese.setUTCMonth(fineMese.getUTCMonth() + 1);
            fineMese.setUTCDate(0);
            data.setUTCDate(Math.min(giorno, fineMese.getUTCDate()));
        }
        return {valida: true, data: iso(data)};
    }
    function dataProdotto(p) {
        if (p.tipo_scadenza === 'nessuna') return {valida: true, data: null};
        if (p.data_scadenza) return leggiData(p.data_scadenza) ? {valida: true, data: p.data_scadenza} : {valida: false};
        let giornoCarico = null;
        if (typeof p.data_carico === 'string' && p.data_carico) {
            if (leggiData(p.data_carico)) giornoCarico = p.data_carico;
            else {
                const data = new Date(p.data_carico);
                if (Number.isFinite(data.getTime())) giornoCarico = oggi(data);
            }
        }
        return calcola(p.tipo_scadenza, p.valore_scadenza, giornoCarico);
    }
    function formato(data) {
        return leggiData(data) ? data.split('-').reverse().join('/') : '';
    }
    function descrivi(p, giorno = oggi()) {
        const risultato = dataProdotto(p);
        const tassativa = p.tassativo === true;
        const tipo = tassativa ? 'tassativa' : 'indicativa';
        if (!risultato.valida) return {data: null, giorni: null, allerta: false, colore: 'normale', testo: 'Scadenza non calcolabile: verifica i dati', tipo, posticipata: false};
        if (!risultato.data) return {data: null, giorni: null, allerta: false, colore: 'normale', testo: 'Nessuna scadenza indicata', tipo, posticipata: false};
        const giorni = Math.round((leggiData(risultato.data) - leggiData(giorno)) / 86400000);
        const posticipata = !!leggiData(p.data_scadenza_iniziale) && risultato.data > p.data_scadenza_iniziale;
        const prefisso = tassativa ? 'Scadenza tassativa' : 'Scadenza indicativa';
        const tempo = giorni < 0 ? `Data ${tipo} superata da ${-giorni} ${giorni === -1 ? 'giorno' : 'giorni'}` :
            giorni === 0 ? `${prefisso}: oggi` : giorni === 1 ? `${prefisso}: domani` : `${prefisso} tra ${giorni} giorni`;
        return {data: risultato.data, giorni, allerta: giorni <= ANTICIPO,
            colore: giorni <= ANTICIPO ? (tassativa ? 'rossa' : 'gialla') : 'normale',
            testo: tempo, tipo, posticipata};
    }
    function confronta(a, b) {
        const da = dataProdotto(a).data, db = dataProdotto(b).data;
        if (da && db && da !== db) return da < db ? -1 : 1;
        if (!!da !== !!db) return da ? -1 : 1;
        return Number(b.tassativo === true) - Number(a.tassativo === true);
    }
    function html(p) {
        const s = descrivi(p);
        const colori = {rossa: '#ff7b72', gialla: '#f1c40f', normale: 'var(--text-muted)'};
        const etichetta = s.giorni !== null && s.giorni < 0 ? 'DATA SUPERATA' : s.giorni === 0 ? 'SCADE OGGI' : '';
        const richiamo = etichetta ? `<strong class="${s.giorni === 0 ? 'scadenza-badge-oggi' : 'scadenza-badge-superata'}" style="--scadenza-bordo:${colori[s.colore]}"><span class="scadenza-icona-superata" aria-hidden="true">⚠</span> ${etichetta}</strong><br>` : '';
        return `<span style="color:${colori[s.colore]};font-size:13px">${richiamo}${s.data ? formato(s.data) + '<br>' : ''}${s.testo}${s.posticipata ? '<br>↻ Data già posticipata · iniziale: ' + formato(p.data_scadenza_iniziale) : ''}</span>`;
    }
    function classeAllerta(p) {
        const s = descrivi(p);
        if (s.giorni === 0) return ' scadenza-oggi' + (p.tassativo === true ? ' scadenza-oggi-tassativa' : '');
        return s.giorni !== null && s.giorni < 0 ? ' scadenza-superata' + (p.tassativo === true ? ' scadenza-superata-tassativa' : '') : '';
    }
    function osserva(aggiorna) {
        let giorno = oggi();
        setInterval(() => {
            if (oggi() !== giorno) { giorno = oggi(); aggiorna(); }
        }, 30000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) { giorno = oggi(); aggiorna(); }
        });
        window.addEventListener('focus', aggiorna);
        window.addEventListener('storage', evento => { if (evento.key === 'eat_dispensa_locale' || evento.key === null) setTimeout(aggiorna, 100); });
    }
    window.EatScadenze = {oggi, calcola, formato, descrivi, confronta, html, classeAllerta, osserva};
})();
