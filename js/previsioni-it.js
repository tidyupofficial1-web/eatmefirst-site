/* Stime locali ricavate dai consumi registrati. */
(function () {
    const giorno = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const numeroGiorno = s => Date.parse(s + 'T00:00:00Z') / 86400000;
    const mediana = valori => { const a = [...valori].sort((a,b) => a-b); return (a[Math.floor((a.length-1)/2)] + a[Math.floor(a.length/2)]) / 2; };
    function ritmo(giorni, prodotto, nOggi) {
        const osservati = giorni.flatMap(g => g.prodotti.filter(v => v.prodotto === prodotto).map(v => ({...v, data: g.data})));
        const consumi = osservati.filter(v => v.consumo > 0);
        const primo = osservati[0];
        if (!primo || consumi.length < 3 || nOggi - numeroGiorno(primo.data) < 14 || nOggi - numeroGiorno(consumi.at(-1).data) > 45) return null;
        const media = consumi.reduce((totale, v) => totale + Number(v.consumo), 0) / (nOggi - numeroGiorno(primo.data));
        return Number.isFinite(media) && media > 0 ? media : null;
    }

    function eccedenze(dati, dispensa, adesso = new Date()) {
        if (dati?.versione !== 1 || !Array.isArray(dati.giorni)) return [];
        const oggi = giorno(adesso);
        const nOggi = numeroGiorno(oggi);
        const storico = dati.giorni
            .filter(g => Array.isArray(g?.prodotti) && g.data <= oggi && numeroGiorno(g.data) >= nOggi - 180)
            .sort((a, b) => a.data.localeCompare(b.data));
        const gruppi = new Map();
        for (const prodotto of dispensa) {
            const {data, giorni} = EatScadenze.descrivi(prodotto, oggi);
            const quantita = EatStorico.quantitaUtile(prodotto);
            if (!data || giorni < 0 || quantita <= 0) continue;
            const chiave = EatStorico.chiaveProdotto(prodotto);
            if (!gruppi.has(chiave)) gruppi.set(chiave, {nome: prodotto.nome, lotti: new Map()});
            const lotti = gruppi.get(chiave).lotti;
            lotti.set(data, {giorni, quantita: (lotti.get(data)?.quantita || 0) + quantita});
        }
        const avvisi = [];
        for (const [chiave, {nome, lotti}] of gruppi) {
            const alGiorno = ritmo(storico, chiave, nOggi);
            if (alGiorno === null) continue;
            let consumoAssegnato = 0;
            // Il consumo previsto va prima alla scorta con la data più vicina.
            for (const [data, {giorni, quantita}] of [...lotti].sort(([a], [b]) => a.localeCompare(b))) {
                const consumo = Math.min(quantita, Math.max(0, alGiorno * giorni - consumoAssegnato));
                consumoAssegnato += consumo;
                const avanzo = Math.round((quantita - consumo) * 100) / 100;
                if (avanzo > 0) avvisi.push({nome, data, avanzo});
            }
        }
        return avvisi.sort((a, b) => a.data.localeCompare(b.data));
    }

    function calcola(dati, dispensa, adesso = new Date()) {
        const vuoto = testo => ({testo, prodotti: [], prossima: null});
        if (!dati || dati.versione !== 1 || !Array.isArray(dati.giorni)) return vuoto('Le stime verdi richiedono almeno due mesi di carichi e consumi registrati.');
        const oggi = giorno(adesso), nOggi = numeroGiorno(oggi);
        const inizio = new Date(dati.iniziato + 'T12:00:00');
        const mese = inizio.getMonth() + 2;
        const maturo = new Date(inizio.getFullYear(), mese, 1, 12);
        maturo.setDate(Math.min(inizio.getDate(), new Date(maturo.getFullYear(), maturo.getMonth()+1, 0).getDate()));
        if (oggi < giorno(maturo)) return vuoto('Stiamo imparando le tue abitudini: le stime inizieranno dopo due mesi di registrazioni, con dati sufficienti.');
        const giorni = dati.giorni.filter(g => g.data <= oggi && numeroGiorno(g.data) >= nOggi - 180);
        // Tre prodotti distinti nello stesso giorno; più carichi nella giornata sono uniti.
        // I primi sette giorni possono rappresentare il riempimento iniziale della casa.
        const spese = giorni.filter(g => numeroGiorno(g.data) >= numeroGiorno(dati.iniziato) + 7 && new Set(g.prodotti.filter(p => p.carico > 0).map(p => p.prodotto)).size >= 3).map(g => g.data).sort();
        if (spese.length < 4) return vuoto('Servono almeno quattro probabili spese principali dopo il riempimento iniziale per stimare la prossima.');
        const recenti = spese.slice(-7), intervalli = recenti.slice(1).map((v,i) => numeroGiorno(v)-numeroGiorno(recenti[i]));
        const frequenza = mediana(intervalli);
        if (frequenza < 3 || frequenza > 45 || Math.max(...intervalli) / Math.min(...intervalli) > 2.5) return vuoto('Le date delle spese sono ancora troppo irregolari per una stima attendibile.');
        const prossimaNumero = numeroGiorno(recenti.at(-1)) + Math.round(frequenza);
        if (prossimaNumero < nOggi) return vuoto('La spesa prevista non risulta ancora registrata: attendiamo nuovi carichi prima di aggiornare la stima.');
        const prossima = new Date(prossimaNumero * 86400000).toISOString().slice(0,10);
        // La lista prepara la prossima spesa: la scorta deve coprire anche l'intervallo successivo.
        const coperturaNumero = prossimaNumero + Math.round(frequenza);
        const copertura = new Date(coperturaNumero * 86400000).toISOString().slice(0,10);
        const gruppi = new Map();
        for (const p of dispensa) {
            const chiave = EatStorico.chiaveProdotto(p);
            if (!gruppi.has(chiave)) gruppi.set(chiave, {prodotto: chiave, nome: p.nome || 'Prodotto', quantita: 0});
            gruppi.get(chiave).quantita += EatStorico.quantitaUtile(p);
        }
        const prodotti = [];
        for (const p of gruppi.values()) {
            const alGiorno = ritmo(giorni, p.prodotto, nOggi);
            if (alGiorno === null) continue;
            if (p.quantita > 0 && p.quantita / alGiorno < coperturaNumero - nOggi) prodotti.push({...p, prossima});
        }
        return {prossima, copertura, prodotti, testo: `Prossima spesa stimata: ${prossima.split('-').reverse().join('/')}. Valutiamo se la scorta basterà fino alla spesa seguente, prevista per il ${copertura.split('-').reverse().join('/')}. Verde: il prodotto c’è, ma potrebbe non bastare. Decidi tu se acquistarlo; puoi spuntarlo per lasciarlo in fondo.`};
    }
    function aggiorna() {
        const dispensa = EatStorico.leggi('eat_dispensa_locale');
        const rawDispensa = localStorage.getItem('eat_dispensa_locale');
        const rawConsumi = localStorage.getItem(EatStorico.chiaveConsumi);
        const previsione = calcola(JSON.parse(rawConsumi || 'null'), dispensa);
        const lista = EatStorico.leggi('eat_lista_spesa_v1'), rawLista = localStorage.getItem('eat_lista_spesa_v1');
        let cambiata = false;
        const previsti = new Set(previsione.prodotti.map(p => p.prodotto));
        const dopo = lista.filter(p => {
            const conserva = !p.previsione_automatica || p.checked || previsti.has(p.prodotto_chiave) || p.tipo === 'esaurito';
            if (!conserva) cambiata = true;
            return conserva;
        });
        for (const p of previsione.prodotti) {
            const esistente = dopo.find(v => v.prodotto_chiave === p.prodotto || v.nome === p.nome);
            const giacenza = Math.round(p.quantita * 100) / 100;
            if (esistente) {
                if (esistente.tipo !== 'scadenza') continue;
                if (esistente.giacenza !== giacenza || esistente.prossima_spesa !== p.prossima) { Object.assign(esistente, {giacenza, prossima_spesa: p.prossima}); cambiata = true; }
            } else {
                dopo.push({id: Date.now()+Math.floor(Math.random()*100000), nome:p.nome, tipo:'scadenza', checked:false, giacenza, prodotto_chiave:p.prodotto, previsione_automatica:true, prossima_spesa:p.prossima});
                cambiata = true;
            }
        }
        if (cambiata) EatStorico.registra('Previsione spesa', 'Aggiornamento dei suggerimenti verdi', {eat_lista_spesa_v1:dopo}, {eat_lista_spesa_v1:rawLista, eat_dispensa_locale:rawDispensa, [EatStorico.chiaveConsumi]:rawConsumi});
        return previsione;
    }
    window.EatPrevisioni = {calcola, aggiorna, eccedenze};
})();
