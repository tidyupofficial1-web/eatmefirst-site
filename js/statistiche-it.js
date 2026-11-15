/* Report locali: scorte presenti e consumi registrati sono misure separate. */
(function () {
    let dispensa = [];
    const lingua = document.documentElement?.lang?.slice(0,2) || 'it';
    const dizionario = window.EatStatisticheTraduzioni?.[lingua] || {};
    const t = (testo,n) => (dizionario[testo] || testo).replaceAll('{n}',String(n));
    const el = id => document.getElementById(id);
    const numero = v => new Intl.NumberFormat(lingua, {maximumFractionDigits: 2}).format(v);
    const arrotonda = v => Math.round((v + Number.EPSILON) * 100) / 100;
    const quantita = v => `${numero(v)} ${t(arrotonda(v) === 1 ? 'pezzo equivalente' : 'pezzi equivalenti')}`;
    function riga(lista, nome, valore) {
        const li = document.createElement('li'); li.className = 'ranking-item';
        const titolo = document.createElement('span'), dato = document.createElement('span');
        titolo.textContent = nome; dato.textContent = valore;
        li.append(titolo, dato); lista.appendChild(li);
    }
    function scorte(righe) {
        const gruppi = new Map();
        for (const p of righe) {
            const k = EatStorico.chiaveProdotto(p);
            if (!gruppi.has(k)) gruppi.set(k, {chiave: k, nome: p.nome || t('Prodotto senza nome'), quantita: 0});
            gruppi.get(k).quantita += EatStorico.quantitaUtile(p);
        }
        return [...gruppi.values()].sort((a,b) => b.quantita-a.quantita || a.nome.localeCompare(b.nome,lingua));
    }
    function fornitori() {
        const select = el('supplier-select'), precedente = select.value;
        const nomi = [...new Set(dispensa.map(p => String(p.fornitore || p.acquistato_da || p.negozio || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
        select.replaceChildren(new Option(t(nomi.length ? 'Tutti i negozi e fornitori' : 'Nessun punto vendita registrato'), 'all'));
        for (const nome of nomi) select.appendChild(new Option(nome,nome));
        select.value = nomi.includes(precedente) ? precedente : 'all';
        aggiornaReportFornitori();
    }
    function aggiornaReportFornitori() {
        const lista = el('supplier-ranking-list'); lista.replaceChildren();
        const gruppi = new Map(), scelto = el('supplier-select').value;
        for (const p of dispensa) {
            const nome = String(p.fornitore || p.acquistato_da || p.negozio || '').trim();
            if (!nome || (scelto !== 'all' && nome !== scelto)) continue;
            gruppi.set(nome,(gruppi.get(nome)||0)+1);
        }
        for (const [nome,n] of [...gruppi].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],lingua))) riga(lista,nome,t(n === 1 ? '{n} riga presente in dispensa' : '{n} righe presenti in dispensa',n));
        if (!gruppi.size) riga(lista,t('Nessun punto vendita registrato'),t('Puoi indicarlo durante il Carico.'));
    }
    function consumi() {
        const gruppi = scorte(dispensa), lista = el('top-products-list'); lista.replaceChildren();
        el('total-pantry-count').textContent = String(dispensa.length);
        const primi = gruppi.filter(p => arrotonda(p.quantita) === arrotonda(gruppi[0].quantita));
        el('top-product-name').textContent = primi.length > 1 ? t('{n} prodotti a pari merito',primi.length) : gruppi[0]?.nome || t('Nessun prodotto');
        el('top-product-qty').textContent = gruppi.length ? quantita(gruppi[0].quantita) + (primi.length > 1 ? ' '+t('per prodotto') : '') : t('Nessuna scorta presente');
        for (const p of gruppi.slice(0,5)) riga(lista,p.nome,quantita(p.quantita));
        if (!gruppi.length) riga(lista,t('Dispensa vuota'),t('Nessuna giacenza da mostrare.'));
        const elenco = el('consumi-registrati'); elenco.replaceChildren();
        const raw = localStorage.getItem(EatStorico.chiaveConsumi);
        const memoria = raw ? JSON.parse(raw) : null, totali = new Map();
        if (memoria && (memoria.versione !== 1 || !Array.isArray(memoria.giorni))) throw Error('Memoria dei consumi non leggibile.');
        const oggi = new Date(); const limite = new Date(oggi.getFullYear(),oggi.getMonth(),oggi.getDate()-29);
        const dataLocale = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        for (const g of memoria?.giorni || []) {
            if (g.data < dataLocale(limite) || g.data > dataLocale(oggi)) continue;
            for (const p of g.prodotti) if (p.consumo > 0) totali.set(p.prodotto,(totali.get(p.prodotto)||0)+p.consumo);
        }
        const nomi = new Map(gruppi.map(p=>[p.chiave,p.nome]));
        for (const [k,n] of [...totali].sort((a,b)=>b[1]-a[1])) {
            const nome = nomi.get(k) || (k.startsWith('ean:') ? t('Codice a barre')+' '+k.slice(4) : k.replace(/^nome:/,'').split('|categoria:')[0]);
            riga(elenco,nome,quantita(n));
        }
        el('nota-consumi').textContent = t('Scarichi e consumi parziali registrati negli ultimi 30 giorni, dalla raccolta dei dati disponibile. Gli annullamenti correggono i totali; gli spostamenti non contano. Un pezzo al 50% vale mezzo pezzo. Lo Scarico non distingue ancora consumo da scarto.');
        if (!totali.size) riga(elenco,t('Nessun consumo registrato nel periodo'),t('I movimenti precedenti alla raccolta dei dati non vengono ricostruiti.'));
    }
    function caricaDatiStatistiche() {
        try {
            dispensa = EatStorico.leggi('eat_dispensa_locale');
            fornitori(); consumi();
            el('statistiche-stato').textContent = '';
        } catch (errore) {
            el('statistiche-stato').textContent = lingua === 'it' ? 'Statistiche non disponibili: ' + errore.message : t('Statistiche non disponibili. I dati non sono stati modificati.');
            for (const id of ['supplier-ranking-list','top-products-list','consumi-registrati']) el(id).replaceChildren();
            el('top-product-name').textContent = t('Non disponibile'); el('top-product-qty').textContent = ''; el('total-pantry-count').textContent = '—';
        }
    }
    window.aggiornaReportFornitori = aggiornaReportFornitori;
    window.caricaDatiStatistiche = caricaDatiStatistiche;
    window.dismissLeoBanner = () => { el('leo-banner').style.display = 'none'; localStorage.setItem('hide_leo_banner_statistiche','true'); };
    window.switchTab = (id,event) => {
        document.querySelectorAll('.tab-content').forEach(v=>v.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(v=>v.classList.remove('active'));
        el(id).classList.add('active'); event.currentTarget.classList.add('active');
    };
    document.addEventListener('DOMContentLoaded',()=>{
        if (localStorage.getItem('hide_leo_banner_statistiche') === 'true') el('leo-banner').style.display='none';
        caricaDatiStatistiche();
    });
    window.addEventListener('focus',caricaDatiStatistiche);
    window.addEventListener('pageshow',caricaDatiStatistiche);
    window.addEventListener('storage',e=>{if ([null,'eat_dispensa_locale',EatStorico.chiaveConsumi].includes(e.key)) setTimeout(caricaDatiStatistiche,100);});
})();
