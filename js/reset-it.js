/* Azzeramenti espliciti: copia precedente obbligatoria e diritti conservati. */
(function () {
    const CATALOGO='eat_catalogo_prodotti_v1';
    const protetti=['eatmefirst_consent','eatmefirst_consent_date','eatmefirst_terms_version','eatmefirst_terms_accepted_at','eat_terms_accepted','eatmefirst_expiry_date',...[5,20,45,90,110].map(g=>`eatmefirst_msg_${g}_visto`)];
    const campiCatalogo=['barcode','nome','categoria','sottocategoria','ubicazione','fornitore','immagine','dettagli_tecnici','ricerca_prodotto','pezzi_per_confezione'];
    function catalogo(righe) {
        const m=new Map();
        for(const p of righe) {
            if(!p || typeof p.nome !== 'string') continue;
            const scheda=Object.fromEntries(campiCatalogo.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));
            // Ubicazione e formato diversi possono essere utili anche con lo stesso codice.
            const chiave=JSON.stringify([EatStorico.chiaveProdotto(p),p.ubicazione||'',p.fornitore||'',p.pezzi_per_confezione||1]);
            m.set(chiave,scheda);
        }
        return [...m.values()];
    }
    function prepara(tipo) {
        if(!['nuovo_inizio','reset_totale'].includes(tipo)) throw Error('Tipo di azzeramento non valido.');
        EatStorico.preparaEsportazione();
        const attesi=EatStorico.situazione();
        // Verifica anche la leggibilità della copia che servirà per il recupero.
        EatBackup.daSituazione(attesi);
        return {tipo,attesi};
    }
    function esegui(p) {
        if(!p || !['nuovo_inizio','reset_totale'].includes(p.tipo)) throw Error('Prepara di nuovo l’azzeramento.');
        EatBackup.daSituazione(p.attesi);
        const dati=p.tipo==='nuovo_inizio'?{...p.attesi}:Object.fromEntries(EatStorico.chiaviBackup.map(k=>[k,null]));
        // Elimina dalle chiavi accettate le copie legacy: sostituisci le pulisce dopo lo snapshot.
        for(const k of Object.keys(dati)) if(!EatStorico.chiaviBackup.includes(k)) delete dati[k];
        if(p.tipo==='nuovo_inizio') {
            dati[CATALOGO]=JSON.stringify(catalogo([...JSON.parse(p.attesi[CATALOGO]||'[]'),...JSON.parse(p.attesi.eat_dispensa_locale||'[]')]));
            // Le note delle liste restano; i suggerimenti verdi dipendenti dal vecchio consumo no.
            dati.eat_lista_spesa_v1=JSON.stringify(JSON.parse(p.attesi.eat_lista_spesa_v1||'[]').filter(v=>!v.previsione_automatica || v.tipo==='esaurito'));
            dati.eat_previsioni_consumi_v1=null;
        } else {
            for(const k of protetti) dati[k]=p.attesi[k]??null;
            // Le condizioni già accettate evitano di ripassare dalla presentazione iniziale.
        }
        dati.eat_dispensa_locale='[]';
        dati.eat_storico_operazioni_v1='[]';
        const vecchi=p.attesi[EatStorico.chiaveMetadati]?JSON.parse(p.attesi[EatStorico.chiaveMetadati]):null;
        dati[EatStorico.chiaveMetadati]=JSON.stringify({dataset:vecchi?.dataset||EatStorico.nuovoId(),revisione:EatStorico.nuovoId(),precedenti:vecchi?[vecchi.revisione,...vecchi.precedenti].slice(0,128):[],modificato_il:new Date().toISOString()});
        // Lo stesso salvataggio protetto dell'importazione conserva la copia precedente.
        EatStorico.sostituisci(dati,p.attesi);
        return {catalogo:JSON.parse(dati[CATALOGO]||'[]').length};
    }
    window.EatReset={prepara,esegui,catalogo};
})();
