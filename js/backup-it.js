/* Backup manuali locali. Nessun invio di dati a server o per email. */
(function () {
    const META = EatStorico.chiaveMetadati;
    const CHIAVI = EatStorico.chiaviBackup.filter(k => k !== META);
    const ARRAY = ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1'];
    const DATI_PRINCIPALI = [...ARRAY, 'eat_catalogo_prodotti_v1', 'eat_storico_operazioni_v1', EatStorico.chiaveConsumi];
    const FIRMA = 'eat_backup_firma_dispositivo_it_v1';
    function normalizzaFirma(valore) {
        if (typeof valore !== 'string' || valore.length > 60 || /[\u0000-\u001f\u007f]/.test(valore)) throw Error('Per riconoscere chi salva usa un nome di massimo 60 caratteri, su una sola riga.');
        return valore.trim().replace(/\s+/g, ' ');
    }
    function leggiFirma() {
        try { return normalizzaFirma(localStorage.getItem(FIRMA) || ''); }
        catch (_) { return ''; }
    }
    function salvaFirma(valore) {
        const firma = normalizzaFirma(valore);
        if (firma) localStorage.setItem(FIRMA, firma);
        else localStorage.removeItem(FIRMA);
        return firma;
    }
    const dataGiorno = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v));
    const movimentiValidi = v => Array.isArray(v) && v.every(p => p && typeof p.prodotto === 'string' && p.prodotto.length <= 2000 && Number.isFinite(p.carico) && p.carico >= 0 && Number.isFinite(p.consumo) && p.consumo >= 0);
    const oggetto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    const CAMPI_TESTO = ['nome', 'ubicazione', 'categoria', 'sottocategoria', 'note', 'barcode', 'immagine', 'foto', 'text', 'photo'];
    function controllaRiga(r, chiave) {
        if (!oggetto(r)) throw Error('Riga del backup non valida.');
        for (const campo of CAMPI_TESTO) {
            if (r[campo] !== undefined && r[campo] !== null && typeof r[campo] !== 'string') throw Error('Un campo del prodotto o della lista non è valido.');
        }
        if (['eat_lista_spesa_v1', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1'].includes(chiave) && (!Number.isSafeInteger(r.id) || r.id < 0)) throw Error('Una voce della lista non ha un identificativo valido.');
        if (r.pezzi_rimanenti !== undefined && (!Number.isSafeInteger(Number(r.pezzi_rimanenti)) || Number(r.pezzi_rimanenti) < 0)) throw Error('Quantità non valida nel backup.');
    }
    function controllaChiavi(v) {
        if (!v || typeof v !== 'object') return;
        for (const [k, valore] of Object.entries(v)) {
            if (['__proto__', 'constructor', 'prototype'].includes(k)) throw Error('Il file contiene campi non consentiti.');
            controllaChiavi(valore);
        }
    }
    function controllaMetadati(m) {
        if (m === null) return;
        if (!oggetto(m) || typeof m.dataset !== 'string' || !m.dataset || typeof m.revisione !== 'string' || !m.revisione || !Array.isArray(m.precedenti) || m.precedenti.length > 128 || m.precedenti.some(v => typeof v !== 'string') || (m.modificato_il !== null && (typeof m.modificato_il !== 'string' || !Number.isFinite(Date.parse(m.modificato_il))))) throw Error('Data e versione del backup non valide.');
    }
    function valida(file) {
        if (!oggetto(file) || file.app !== 'EatMeFirst' || file.versione !== 1) throw Error('Scegli un backup EatMeFirst creato con questa funzione. Il formato non è riconosciuto.');
        if (!oggetto(file.dati) || !Number.isFinite(Date.parse(file.creato_il))) throw Error('Il backup è incompleto o danneggiato.');
        if (file.salvato_da !== undefined) normalizzaFirma(file.salvato_da);
        controllaChiavi(file);
        controllaMetadati(file.metadati);
        for (const [k, raw] of Object.entries(file.dati)) {
            if (!CHIAVI.includes(k) || typeof raw !== 'string') throw Error('Il backup contiene dati non riconosciuti: ' + k);
            if (ARRAY.includes(k) || k === 'eat_catalogo_prodotti_v1') {
                const righe = JSON.parse(raw);
                if (!Array.isArray(righe) || righe.some(r => !oggetto(r))) throw Error('Elenco non valido nel backup: ' + k);
                for (const r of righe) controllaRiga(r, k);
                controllaChiavi(righe);
            } else if (k === 'eat_questionario_bozza_it_v1') {
                const bozza = JSON.parse(raw);
                if (!oggetto(bozza) || Object.entries(bozza).some(([campo,v]) => campo === 'funzioni' ? !Array.isArray(v) || v.some(s=>typeof s !== 'string') : typeof v !== 'string')) throw Error('Bozza del questionario non valida.');
                controllaChiavi(bozza);
            } else if (k === EatStorico.chiaveConsumi) {
                const dati = JSON.parse(raw);
                if (!oggetto(dati) || dati.versione !== 1 || !dataGiorno(dati.iniziato) || !Array.isArray(dati.giorni) || dati.giorni.length > 401 || dati.giorni.some(g => !g || !dataGiorno(g.data) || !movimentiValidi(g.prodotti))) throw Error('Memoria delle previsioni non valida.');
                controllaChiavi(dati);
            } else if (k === 'eat_storico_operazioni_v1') {
                const storico = JSON.parse(raw);
                if (!Array.isArray(storico) || storico.length > 15) throw Error('Storico del backup non valido.');
                for (const op of storico) {
                    if (!oggetto(op) || typeof op.id !== 'string' || !Array.isArray(op.cambiamenti) || typeof op.descrizione !== 'string' || typeof op.tipo !== 'string') throw Error('Operazione nello storico non valida.');
                    if (op.movimentiConsumi !== undefined && (!movimentiValidi(op.movimentiConsumi) || !dataGiorno(op.giornoConsumi))) throw Error('Consumi nello storico non validi.');
                    for (const c of op.cambiamenti) {
                        if (!oggetto(c) || ![...ARRAY, 'eat_catalogo_prodotti_v1'].includes(c.chiave) || typeof c.id !== 'string' || !['aggiunta', 'rimozione', 'modifica'].includes(c.modo)) throw Error('Movimento nello storico non valido.');
                        if (c.modo === 'rimozione' && (!oggetto(c.prima) || c.prima._emf_id !== c.id || !Number.isSafeInteger(c.posizione) || c.posizione < 0)) throw Error('Dati di ripristino non validi.');
                        if (c.modo === 'rimozione') controllaRiga(c.prima, c.chiave);
                        if (c.modo !== 'rimozione' && typeof c.dopoFirma !== 'string') throw Error('Controllo di ripristino mancante.');
                        if (c.modo === 'modifica' && (!oggetto(c.campi) || Object.keys(c.campi).some(k => ['_emf_id', '_emf_rev', 'indiceGlobale', 'id'].includes(k)) || Object.values(c.campi).some(v => !oggetto(v) || typeof v.presente !== 'boolean'))) throw Error('Modifica nello storico non valida.');
                        if (c.modo === 'modifica') {
                            for (const [campo, dato] of Object.entries(c.campi)) {
                                if (CAMPI_TESTO.includes(campo) && dato.presente && dato.valore !== null && typeof dato.valore !== 'string') throw Error('Testo nello storico non valido.');
                            }
                        }
                    }
                }
                controllaChiavi(storico);
            } else if (k === 'eat_ubicazioni_personalizzate_v1') {
                const luoghi = JSON.parse(raw);
                if (!Array.isArray(luoghi) || luoghi.some(v => typeof v !== 'string')) throw Error('Elenco delle ubicazioni non valido.');
            } else if (k === 'eat_categorie_personalizzate_v1') {
                const categorie = JSON.parse(raw);
                if (!oggetto(categorie) || !Array.isArray(categorie.gruppi) || !Array.isArray(categorie.prodotti) || categorie.gruppi.some(g => !oggetto(g) || typeof g.nome !== 'string' || !Array.isArray(g.sottocategorie) || g.sottocategorie.some(v => typeof v !== 'string'))) throw Error('Categorie del backup non valide.');
                controllaChiavi(categorie);
            }
        }
        for (const k of ARRAY) if (!Object.hasOwn(file.dati, k)) throw Error('Il backup non contiene tutti gli elenchi necessari.');
        return file;
    }
    function daSituazione(situazione) {
        const dati = {};
        for (const k of CHIAVI) {
            if (situazione[k] !== null && situazione[k] !== undefined) dati[k] = situazione[k];
            else if (ARRAY.includes(k)) dati[k] = '[]';
        }
        return valida({app: 'EatMeFirst', versione: 1, creato_il: new Date().toISOString(), metadati: situazione[META] ? JSON.parse(situazione[META]) : null, dati});
    }
    function crea(firma = leggiFirma()) {
        const autore = normalizzaFirma(firma);
        EatStorico.preparaEsportazione();
        const file = daSituazione(EatStorico.situazione());
        if (autore) file.salvato_da = autore;
        return file;
    }
    function leggi(testo) {
        if (typeof testo !== 'string' || testo.length > 25000000) throw Error('Il file è troppo grande o non è leggibile.');
        try { return valida(JSON.parse(testo)); }
        catch (errore) { throw Error('Backup non utilizzabile. ' + errore.message); }
    }
    function riepilogo(file) {
        return {prodotti: JSON.parse(file.dati.eat_dispensa_locale).length,
            spesa: JSON.parse(file.dati.eat_lista_spesa_v1).length,
            coseDaFare: JSON.parse(file.dati.eat_cose_da_fare_v1).length,
            postIt: JSON.parse(file.dati.eat_bacheca_notes_v1).length,
            operazioni: JSON.parse(file.dati.eat_storico_operazioni_v1 || '[]').length,
            catalogo: JSON.parse(file.dati.eat_catalogo_prodotti_v1 || '[]').length,
            ultimaModifica: file.metadati?.modificato_il || null,
            salvatoDa: file.salvato_da || ''};
    }
    function confronta(file, attuali = EatStorico.situazione()) {
        valida(file);
        const locali = daSituazione(attuali), a = locali.metadati, b = file.metadati;
        const stessi = DATI_PRINCIPALI.every(k => (locali.dati[k] || '[]') === (file.dati[k] || '[]'));
        const vuota = ARRAY.every(k => JSON.parse(locali.dati[k]).length === 0) && JSON.parse(locali.dati.eat_catalogo_prodotti_v1 || '[]').length === 0;
        if (stessi) return {tipo: 'uguale', rischio: false, testo: 'Il contenuto è uguale a quello presente. La sostituzione non è necessaria.'};
        if (vuota) return {tipo: 'vuota', rischio: false, testo: 'Questo browser non contiene prodotti o liste: puoi importare la dispensa del file.'};
        if (!a?.modificato_il || !b?.modificato_il) return {tipo: 'data_sconosciuta', rischio: true, testo: 'Non è possibile stabilire quale dispensa sia più recente: manca la data dell’ultima modifica di una delle due.'};
        if (a.dataset !== b.dataset) return {tipo: 'origine_diversa', rischio: true, testo: 'Le dispense hanno origini diverse. La sola data non garantisce che una contenga tutte le modifiche dell’altra.'};
        if (a.revisione === b.revisione) return {tipo: 'divergente', rischio: true, testo: 'Le dispense dichiarano la stessa versione ma hanno contenuti diversi. Scegli quale conservare.'};
        if (b.precedenti.includes(a.revisione)) {
            const coerente = Date.parse(b.modificato_il) >= Date.parse(a.modificato_il);
            return {tipo: 'piu_recente', rischio: !coerente, testo: coerente ? 'La dispensa nel file è più recente di quella presente. Puoi sostituire quella locale.' : 'Il file contiene una versione successiva, ma le date non coincidono con questo ordine: controlla l’orologio dei dispositivi.'};
        }
        if (a.precedenti.includes(b.revisione)) return {tipo: 'piu_vecchia', rischio: true, testo: 'Il file contiene una versione precedente. Importandolo perderesti le modifiche più recenti presenti qui.'};
        return {tipo: 'divergente', rischio: true, testo: 'Le due dispense sono state modificate separatamente, oppure il loro collegamento è troppo vecchio per verificarlo. Importando il file sostituirai anche le modifiche presenti soltanto qui.'};
    }
    function importa(file, attesi, confermaRischio = false) {
        valida(file);
        const confronto = confronta(file, attesi);
        if (confronto.rischio && !confermaRischio) throw Error('Leggi l’avviso e conferma esplicitamente quale dispensa vuoi conservare.');
        const dati = {...file.dati, [META]: file.metadati ? JSON.stringify(file.metadati) : null};
        EatStorico.sostituisci(dati, attesi);
    }
    function precedente() {
        const record = EatStorico.precedente();
        return record ? daSituazione(record.prima) : null;
    }
    function nomeFile(file) {
        const firma = normalizzaFirma(file.salvato_da || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return 'EatMeFirst-dispensa-' + file.creato_il.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '-UTC') + (firma ? '-' + firma : '') + '.json';
    }
    window.EatBackup = {crea, leggi, riepilogo, confronta, importa, precedente, nomeFile, daSituazione, leggiFirma, salvaFirma};
})();
