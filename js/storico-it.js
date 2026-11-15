/* Ultime 15 operazioni: variazioni delle singole righe, non copie della dispensa. */
(function () {
    const KEY = 'eat_storico_operazioni_v1';
    const JOURNAL = 'eat_storico_transazione_v1';
    const META = 'eat_dati_metadati_v1';
    const RECUPERO = 'eat_backup_precedente_v1';
    const CONSUMI = 'eat_previsioni_consumi_v1';
    const giornoLocale = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const normalizza = v => String(v || '').trim().toLocaleLowerCase('it').replace(/\s+/g, ' ');
    const chiaveProdotto = p => p.barcode ? 'ean:' + String(p.barcode).replace(/^0+(?=\d)/, '') : 'nome:' + normalizza(p.nome) + '|categoria:' + normalizza(p.categoria);
    function quantitaUtile(p) {
        const n = p.pezzi_rimanenti == null ? (Number(p.quantita) || 1) * (Number(p.pezzi_per_confezione) || 1) : Number(p.pezzi_rimanenti);
        const percentuale = p.percentuale == null ? 100 : Number(p.percentuale);
        return Number.isFinite(n) && Number.isFinite(percentuale) ? Math.max(0, n) * Math.max(0, Math.min(100, percentuale)) / 100 : 0;
    }
    function movimentoConsumi(tipo, prima, dopo) {
        if (!['Carico', 'Scarico', 'Consumo parziale'].includes(tipo)) return [];
        const totali = righe => {
            const m = new Map();
            for (const p of righe) m.set(chiaveProdotto(p), (m.get(chiaveProdotto(p)) || 0) + quantitaUtile(p));
            return m;
        };
        const a = totali(prima), b = totali(dopo), movimenti = [];
        for (const prodotto of new Set([...a.keys(), ...b.keys()])) {
            const delta = (b.get(prodotto) || 0) - (a.get(prodotto) || 0);
            if (tipo === 'Carico' && delta > 0.000001) movimenti.push({prodotto, carico: delta, consumo: 0});
            if (tipo !== 'Carico' && delta < -0.000001) movimenti.push({prodotto, carico: 0, consumo: -delta});
        }
        return movimenti;
    }
    function aggiornaConsumi(movimenti, giorno, segno = 1) {
        const dati = JSON.parse(localStorage.getItem(CONSUMI) || 'null') || {versione: 1, iniziato: giorno, giorni: []};
        if (dati.versione !== 1 || !Array.isArray(dati.giorni)) throw Error('Memoria dei consumi non leggibile.');
        let g = dati.giorni.find(v => v.data === giorno);
        if (!g) { g = {data: giorno, prodotti: []}; dati.giorni.push(g); }
        for (const m of movimenti) {
            let p = g.prodotti.find(v => v.prodotto === m.prodotto);
            if (!p) { p = {prodotto: m.prodotto, carico: 0, consumo: 0}; g.prodotti.push(p); }
            p.carico = Math.max(0, p.carico + segno * m.carico);
            p.consumo = Math.max(0, p.consumo + segno * m.consumo);
        }
        g.prodotti = g.prodotti.filter(p => p.carico > 0.000001 || p.consumo > 0.000001);
        // Un anno abbondante di totali giornalieri, senza nomi, immagini o copie dei prodotti.
        const limite = new Date(); limite.setDate(limite.getDate() - 400);
        dati.giorni = dati.giorni.filter(v => v.prodotti.length && v.data >= giornoLocale(limite)).sort((a, b) => a.data.localeCompare(b.data));
        return JSON.stringify(dati);
    }
    const CHIAVI = ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1', 'eat_catalogo_prodotti_v1'];
    const LIMIT = 15;
    const PREFERENZE = ['eat_categorie_personalizzate_v1', 'eat_ubicazioni_personalizzate_v1',
        'eat_ultima_ubicazione', 'eat_ultima_categoria', 'eat_ultima_sottocategoria', 'eat_ultimo_fornitore',
        'eatmefirst_username', 'eat_user_name', 'eatmefirst_consent', 'eatmefirst_consent_date','eatmefirst_terms_version','eatmefirst_terms_accepted_at', 'eat_terms_accepted',
        'eat_hide_max_carico', 'eat_hide_menu_guide', 'eat_eva_welcome_closed', 'emf_nascondi_intro_inventario',
        'hide_leo_banner_utilita_it', 'hide_leo_banner_statistiche', 'eatmefirst_expiry_date', 'eat_questionario_bozza_it_v1',
        ...[5,20,45,90,110].map(g=>`eatmefirst_msg_${g}_visto`)];
    const CHIAVI_BACKUP = [...CHIAVI, KEY, META, CONSUMI, ...PREFERENZE];
    const CHIAVI_TRASFERIMENTO = [...CHIAVI_BACKUP, 'emf_dispensa', 'emf_spesa'];
    let copiaRecuperoControllata = null;
    const nuovoId = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
    const copia = v => JSON.parse(JSON.stringify(v));
    function pulisci(riga) {
        const risultato = copia(riga);
        delete risultato.indiceGlobale;
        return risultato;
    }
    function ordinato(v) {
        if (Array.isArray(v)) return v.map(ordinato);
        if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, ordinato(v[k])]));
        return v;
    }
    const uguali = (a, b) => JSON.stringify(ordinato(a)) === JSON.stringify(ordinato(b));
    function firma(riga) {
        const testo = JSON.stringify(ordinato(pulisci(riga)));
        let a = 2166136261, b = 5381;
        for (let i = 0; i < testo.length; i++) {
            a = Math.imul(a ^ testo.charCodeAt(i), 16777619);
            b = Math.imul(b, 33) ^ testo.charCodeAt(i);
        }
        return testo.length + ':' + (a >>> 0).toString(16) + ':' + (b >>> 0).toString(16);
    }
    function ripristina(chiave, valore) {
        if (valore === null) localStorage.removeItem(chiave);
        else localStorage.setItem(chiave, valore);
    }
    function ripristinaGruppo(prima) {
        // Libera prima lo spazio usato dai nuovi valori, poi ripristina gli originali.
        // Il journal resta disponibile se il browser si interrompe nel frattempo.
        // Lo storico può custodire le foto richiamate dal journal compatto:
        // sostituirlo direttamente evita un intervallo senza alcuna copia recuperabile.
        for (const k of Object.keys(prima)) if (k !== KEY) localStorage.removeItem(k);
        if (Object.prototype.hasOwnProperty.call(prima, KEY)) ripristina(KEY, prima[KEY]);
        for (const [k, v] of Object.entries(prima)) if (k !== KEY) ripristina(k, v);
    }
    function preparaJournal(prima, valori = {}) {
        // Una foto può essere ripetuta nella bacheca e nello storico: nel journal basta una copia.
        const conteggi = new Map();
        for (const raw of Object.values(prima)) {
            if (typeof raw !== 'string') continue;
            for (const match of raw.matchAll(/"data:image\/[^"\r\n]+"/g)) {
                if (match[0].length > 1024) conteggi.set(match[0], (conteggi.get(match[0]) || 0) + 1);
            }
        }
        const ripetute = [...conteggi].filter(([, n]) => n > 1);
        if (!ripetute.length) return JSON.stringify({istante: Date.now(), prima});
        let prefisso = '__eat_foto_journal__';
        while (Object.values(prima).some(raw => typeof raw === 'string' && raw.includes(prefisso))) prefisso += '_';
        const storicoPrima = prima[KEY], storicoDopo = valori[KEY];
        const immagini = ripetute.map(([foto], i) => {
            // Il singolo setItem dello storico è atomico: se entrambe le versioni
            // contengono questa foto, il recupero può leggerla lì senza ricopiarla.
            const stabile = typeof storicoPrima === 'string' && typeof storicoDopo === 'string' && storicoPrima.includes(foto) && storicoDopo.includes(foto);
            return [JSON.stringify(prefisso + i), stabile ? {storico: firma(foto)} : foto];
        });
        const ridotta = Object.fromEntries(Object.entries(prima).map(([k, raw]) => {
            if (raw !== null) immagini.forEach(([segnaposto], i) => { raw = raw.split(ripetute[i][0]).join(segnaposto); });
            return [k, raw];
        }));
        // Senza 'prima' al livello principale, anche una vecchia pagina rifiuta il formato anziché ripristinare segnaposto.
        return JSON.stringify({istante: Date.now(), compatto: {prima: ridotta, immagini}});
    }
    function espandiJournal(j) {
        if (!j?.compatto) return j;
        const c = j.compatto;
        if (!c.prima || !Array.isArray(c.immagini)) throw Error('Copia temporanea non leggibile: chiedi assistenza.');
        const immagini = c.immagini.map(v => {
            if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'string') throw Error('Copia temporanea non valida.');
            if (typeof v[1] === 'string') return v;
            if (!v[1] || typeof v[1].storico !== 'string') throw Error('Riferimento foto non valido.');
            const raw = localStorage.getItem(KEY) || '';
            const trovate = [...new Set([...raw.matchAll(/"data:image\/[^"\r\n]+"/g)].map(m => m[0]).filter(foto => firma(foto) === v[1].storico))];
            if (trovate.length !== 1) throw Error('Foto di recupero non disponibile: non fare altre modifiche e chiedi assistenza.');
            return [v[0], trovate[0]];
        });
        const prima = Object.fromEntries(Object.entries(c.prima).map(([k, raw]) => {
            if (raw !== null && typeof raw !== 'string') throw Error('Copia temporanea non valida.');
            if (raw !== null) for (const [segnaposto, foto] of immagini) raw = raw.split(segnaposto).join(foto);
            return [k, raw];
        }));
        return {...j, prima};
    }
    function recupera() {
        const trasferimento = localStorage.getItem(RECUPERO);
        if (trasferimento && trasferimento !== copiaRecuperoControllata) {
            const record = JSON.parse(trasferimento);
            if (record.stato === 'in_corso') {
                if (Date.now() - record.istante < 30000) throw Error('Trasferimento in corso o interrotto. Attendi 30 secondi e ricarica la pagina.');
                if (!record.prima || Object.keys(record.prima).some(k => !CHIAVI_TRASFERIMENTO.includes(k)) || Object.values(record.prima).some(v => v !== null && typeof v !== 'string')) throw Error('Copia di recupero non valida: chiedi assistenza.');
                ripristinaGruppo(record.prima);
                record.stato = 'completato';
                localStorage.setItem(RECUPERO, JSON.stringify(record));
                alert('Un trasferimento interrotto è stato annullato. La situazione precedente è stata recuperata.');
            }
            copiaRecuperoControllata = localStorage.getItem(RECUPERO);
        }
        const raw = localStorage.getItem(JOURNAL);
        if (!raw) return;
        const j = espandiJournal(JSON.parse(raw));
        if (!j || !j.prima || !Number.isFinite(j.istante)) throw Error('Salvataggio interrotto non leggibile: chiedi assistenza.');
        if (Date.now() - j.istante < 30000) throw Error('Un salvataggio è in corso o è stato interrotto. Attendi 30 secondi e ricarica la pagina.');
        for (const [k, v] of Object.entries(j.prima)) {
            if (![...CHIAVI, KEY, META, CONSUMI, 'eat_ultimo_scarico_annullabile_v1'].includes(k)) throw Error('Salvataggio interrotto non valido.');
            if (v !== null && typeof v !== 'string') throw Error('Valori di recupero non validi.');
        }
        ripristinaGruppo(j.prima);
        localStorage.removeItem(JOURNAL);
        alert('È stato recuperato un salvataggio interrotto. Ricontrolla l’ultima operazione: potrebbe essere da ripetere.');
    }
    function transazione(valori, attesi) {
        recupera();
        for (const [k, raw] of Object.entries(attesi)) {
            if (localStorage.getItem(k) !== raw) throw Error('I dati sono cambiati in un’altra pagina. Ricarica prima di riprovare.');
        }
        const prima = Object.fromEntries(Object.keys(valori).map(k => [k, localStorage.getItem(k)]));
        try { localStorage.setItem(JOURNAL, preparaJournal(prima, valori)); }
        catch (_) { throw Error('Spazio del browser insufficiente per la copia di sicurezza dell’operazione. Nessuna modifica effettuata. Conserva una copia esterna prima di chiedere assistenza; non cancellare i dati del browser.'); }
        try {
            for (const [k, raw] of Object.entries(valori)) ripristina(k, raw);
            localStorage.removeItem(JOURNAL);
        } catch (errore) {
            try {
                ripristinaGruppo(prima);
                localStorage.removeItem(JOURNAL);
            } catch (_) {
                throw Error('Salvataggio interrotto: non fare altre modifiche. Attendi 30 secondi, poi ricarica per il recupero.');
            }
            throw Error('Operazione non salvata: controlla lo spazio disponibile nel browser.');
        }
    }
    function leggi(chiave) {
        if (!CHIAVI.includes(chiave)) throw Error('Elenco non supportato.');
        recupera();
        let raw = localStorage.getItem(chiave);
        // Migrazione una sola volta: una dispensa vuota già salvata resta vuota.
        if (raw === null && chiave === 'eat_dispensa_locale') raw = localStorage.getItem('emf_dispensa');
        const righe = JSON.parse(raw || '[]');
        if (!Array.isArray(righe) || righe.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw Error('Dati locali non validi: ' + chiave);
        const ids = new Set();
        let cambiata = false;
        righe.forEach(r => {
            if (!r._emf_id || ids.has(r._emf_id)) { r._emf_id = nuovoId(); cambiata = true; }
            if (!r._emf_rev) { r._emf_rev = nuovoId(); cambiata = true; }
            ids.add(r._emf_id);
        });
        if (cambiata || (raw !== null && localStorage.getItem(chiave) === null)) localStorage.setItem(chiave, JSON.stringify(righe));
        return righe;
    }
    function elenco() {
        recupera();
        const voci = JSON.parse(localStorage.getItem(KEY) || '[]');
        if (!Array.isArray(voci) || voci.some(v => !v || !Array.isArray(v.cambiamenti) || !v.id)) throw Error('Storico non leggibile: chiedi assistenza prima di modificarlo.');
        return voci;
    }
    function metadati() {
        const raw = localStorage.getItem(META);
        if (!raw) return null;
        const m = JSON.parse(raw);
        if (!m || typeof m.dataset !== 'string' || !m.dataset || typeof m.revisione !== 'string' || !m.revisione || !Array.isArray(m.precedenti) || m.precedenti.some(v => typeof v !== 'string') || (m.modificato_il !== null && !Number.isFinite(Date.parse(m.modificato_il)))) throw Error('Data e versione dei dati non leggibili.');
        return m;
    }
    function nuovaRevisione() {
        const prima = metadati();
        return {dataset: prima?.dataset || nuovoId(), revisione: nuovoId(), precedenti: prima ? [prima.revisione, ...prima.precedenti].slice(0, 128) : [], modificato_il: new Date().toISOString()};
    }
    function preparaEsportazione() {
        recupera();
        for (const k of CHIAVI) leggi(k);
        let m = metadati();
        if (!m) {
            const date = elenco().flatMap(v => [v.data, v.annullata_il]).filter(v => v && Number.isFinite(Date.parse(v))).sort((a, b) => Date.parse(b) - Date.parse(a));
            m = {dataset: nuovoId(), revisione: nuovoId(), precedenti: [], modificato_il: date[0] || null};
            localStorage.setItem(META, JSON.stringify(m));
        }
        return m;
    }
    function situazione() {
        recupera();
        return Object.fromEntries(CHIAVI_TRASFERIMENTO.map(k => [k, localStorage.getItem(k)]));
    }
    function precedente() {
        recupera();
        const raw = localStorage.getItem(RECUPERO);
        if (!raw) return null;
        const record = JSON.parse(raw);
        return record.stato === 'completato' ? record : null;
    }
    function sostituisci(dati, attesi) {
        recupera();
        if (!dati || Object.keys(dati).some(k => !CHIAVI_BACKUP.includes(k)) || Object.values(dati).some(v => v !== null && typeof v !== 'string')) throw Error('Dati da trasferire non validi.');
        const prima = situazione();
        if (!uguali(prima, attesi)) throw Error('I dati sono cambiati dopo l’anteprima. Seleziona di nuovo il file.');
        const record = {stato: 'in_corso', istante: Date.now(), prima};
        // Una sola copia precedente: svolge anche la funzione di recupero da interruzioni.
        try { localStorage.setItem(RECUPERO, JSON.stringify(record)); }
        catch (_) { throw Error('Non c’è spazio per conservare la copia di recupero. Nessun dato è stato sostituito. Esporta la situazione presente prima di liberare spazio.'); }
        try {
            for (const k of CHIAVI_TRASFERIMENTO) ripristina(k, dati[k] ?? null);
            record.stato = 'completato';
            localStorage.setItem(RECUPERO, JSON.stringify(record));
            localStorage.removeItem('eat_ultimo_scarico_annullabile_v1');
        } catch (errore) {
            try {
                ripristinaGruppo(prima);
                record.stato = 'completato';
                localStorage.setItem(RECUPERO, JSON.stringify(record));
            } catch (_) { throw Error('Trasferimento interrotto. Non fare altre modifiche; attendi 30 secondi e ricarica per recuperare i dati.'); }
            throw Error('Importazione non eseguita. I dati precedenti sono stati conservati. Controlla lo spazio disponibile nel browser.');
        }
    }
    function registra(tipo, descrizione, aggiornamenti, attesi = {}, riferimenti = []) {
        recupera();
        for (const [k, raw] of Object.entries(attesi)) {
            if (localStorage.getItem(k) !== raw) throw Error('I dati sono cambiati in un’altra pagina. Ricarica prima di riprovare.');
        }
        const storico = elenco();
        const rawStorico = localStorage.getItem(KEY);
        const cambiamenti = [], valori = {}, risultati = {};
        let movimentiConsumi = [];
        const verifiche = {...attesi, [KEY]: rawStorico};
        for (const [chiave, nuoveRighe] of Object.entries(aggiornamenti)) {
            if (!Array.isArray(nuoveRighe)) throw Error('Elenco da salvare non valido.');
            const prima = leggi(chiave);
            if (!(chiave in verifiche)) verifiche[chiave] = localStorage.getItem(chiave);
            const dopo = nuoveRighe.map(pulisci);
            const ids = new Set();
            dopo.forEach(r => {
                if (!r._emf_id) r._emf_id = nuovoId();
                if (ids.has(r._emf_id)) throw Error('Due righe hanno lo stesso identificativo. Ricarica la pagina.');
                ids.add(r._emf_id);
            });
            const precedenti = new Map(prima.map(r => [r._emf_id, r]));
            dopo.forEach(r => {
                const precedente = precedenti.get(r._emf_id);
                if (!precedente) {
                    r._emf_rev = nuovoId();
                    cambiamenti.push({chiave, id: r._emf_id, modo: 'aggiunta', dopoFirma: firma(r)});
                } else {
                    const campi = {};
                    for (const k of new Set([...Object.keys(precedente), ...Object.keys(r)])) {
                        if (['_emf_id', '_emf_rev', 'indiceGlobale'].includes(k)) continue;
                        const aveva = Object.hasOwn(precedente, k), ha = Object.hasOwn(r, k);
                        if (aveva !== ha || !uguali(precedente[k] ?? null, r[k] ?? null)) campi[k] = aveva ? {presente: true, valore: precedente[k]} : {presente: false};
                    }
                    r._emf_rev = Object.keys(campi).length ? nuovoId() : precedente._emf_rev;
                    if (Object.keys(campi).length) cambiamenti.push({chiave, id: r._emf_id, modo: 'modifica', campi, revPrima: precedente._emf_rev, dopoFirma: firma(r)});
                }
            });
            prima.forEach((r, posizione) => {
                if (!ids.has(r._emf_id)) cambiamenti.push({chiave, id: r._emf_id, modo: 'rimozione', prima: pulisci(r), posizione});
            });
            risultati[chiave] = dopo;
            if (chiave === 'eat_dispensa_locale') movimentiConsumi = movimentoConsumi(tipo, prima, dopo);
            valori[chiave] = JSON.stringify(dopo);
        }
        if (!cambiamenti.length) return risultati;
        const giornoConsumi = giornoLocale();
        if (movimentiConsumi.length) {
            verifiche[CONSUMI] = localStorage.getItem(CONSUMI);
            valori[CONSUMI] = aggiornaConsumi(movimentiConsumi, giornoConsumi);
        }
        storico.unshift({id: nuovoId(), data: new Date().toISOString(), tipo, descrizione: String(descrizione).slice(0, 600), cambiamenti, riferimenti, annullata: false, movimentiConsumi, giornoConsumi});
        valori[KEY] = JSON.stringify(storico.slice(0, LIMIT));
        verifiche[META] = localStorage.getItem(META);
        valori[META] = JSON.stringify(nuovaRevisione());
        valori.eat_ultimo_scarico_annullabile_v1 = null;
        transazione(valori, verifiche);
        return risultati;
    }
    function motivo(id, storico = elenco(), letture = {}) {
        const indice = storico.findIndex(v => v.id === id), voce = storico[indice];
        if (!voce) return 'Operazione non più presente nelle ultime 15.';
        if (voce.annullata) return 'Operazione già annullata.';
        const coinvolti = new Set(voce.cambiamenti.map(c => c.chiave + ':' + c.id));
        const successiva = storico.slice(0, indice).find(v => !v.annullata && [...v.cambiamenti, ...(v.riferimenti || [])].some(c => coinvolti.has(c.chiave + ':' + c.id)));
        if (successiva) return 'Annulla prima l’operazione successiva: ' + successiva.descrizione;
        for (const c of voce.cambiamenti) {
            if (!CHIAVI.includes(c.chiave)) return 'Operazione non riconosciuta.';
            const righe = letture[c.chiave] || (letture[c.chiave] = leggi(c.chiave));
            const riga = righe.find(r => r._emf_id === c.id);
            if (c.modo === 'rimozione' ? !!riga : !riga || firma(riga) !== c.dopoFirma) return 'I dati di questa operazione sono stati modificati: non è possibile annullarla in sicurezza.';
        }
        return '';
    }
    function annulla(id) {
        const storico = elenco(), rawStorico = localStorage.getItem(KEY);
        const blocco = motivo(id, storico);
        if (blocco) throw Error(blocco);
        const voce = storico.find(v => v.id === id), liste = {}, attesi = {[KEY]: rawStorico};
        for (const c of voce.cambiamenti) {
            if (!liste[c.chiave]) {
                liste[c.chiave] = leggi(c.chiave);
                attesi[c.chiave] = localStorage.getItem(c.chiave);
            }
            const righe = liste[c.chiave], index = righe.findIndex(r => r._emf_id === c.id);
            if (c.modo === 'rimozione' ? index !== -1 : index === -1 || firma(righe[index]) !== c.dopoFirma) throw Error('I dati sono cambiati durante il controllo. Ricarica la pagina.');
            if (c.modo === 'aggiunta') righe.splice(index, 1);
            else if (c.modo === 'rimozione') righe.splice(Math.min(c.posizione, righe.length), 0, copia(c.prima));
            else if (c.modo === 'modifica') {
                for (const [k, dato] of Object.entries(c.campi)) {
                    if (dato.presente) righe[index][k] = copia(dato.valore);
                    else delete righe[index][k];
                }
                righe[index]._emf_rev = c.revPrima;
            } else throw Error('Tipo di operazione non riconosciuto.');
        }
        voce.annullata = true;
        voce.annullata_il = new Date().toISOString();
        const valori = Object.fromEntries(Object.entries(liste).map(([k, v]) => [k, JSON.stringify(v)]));
        valori[KEY] = JSON.stringify(storico);
        if (voce.movimentiConsumi?.length) {
            attesi[CONSUMI] = localStorage.getItem(CONSUMI);
            valori[CONSUMI] = aggiornaConsumi(voce.movimentiConsumi, voce.giornoConsumi, -1);
        }
        attesi[META] = localStorage.getItem(META);
        valori[META] = JSON.stringify(nuovaRevisione());
        transazione(valori, attesi);
    }
    function coerente(chiave, righe) {
        return uguali(leggi(chiave).map(pulisci), righe.map(pulisci));
    }
    function eliminaPostItSenzaRecupero(id, atteso) {
        recupera();
        const chiave = 'eat_bacheca_notes_v1';
        const raw = localStorage.getItem(chiave);
        if (typeof atteso !== 'string' || raw !== atteso) throw Error('La bacheca è cambiata. Ricarica prima di riprovare.');
        const righe = JSON.parse(raw);
        if (!Array.isArray(righe)) throw Error('Bacheca non leggibile.');
        const corrispondenti = righe.filter(n => n.id === id);
        if (corrispondenti.length !== 1 || !corrispondenti[0].photo) throw Error('Post-it con foto non individuato in modo univoco.');
        const nuove = righe.filter(n => n.id !== id);
        // Singola scrittura atomica, più piccola dell'originale: nessuna copia foto per l'annullamento.
        localStorage.setItem(chiave, JSON.stringify(nuove));
        let metadatiAggiornati = true;
        try { localStorage.setItem(META, JSON.stringify(nuovaRevisione())); }
        catch (_) { metadatiAggiornati = false; }
        return {righe: nuove, metadatiAggiornati};
    }
    window.EatStorico = {nuovoId, leggi, elenco, registra, motivo, annulla, coerente, limite: LIMIT,
        chiaviBackup: [...CHIAVI_BACKUP], chiaveMetadati: META, metadati, preparaEsportazione, situazione, precedente, sostituisci,
        chiaveConsumi: CONSUMI, chiaveProdotto, quantitaUtile, eliminaPostItSenzaRecupero};
})();
