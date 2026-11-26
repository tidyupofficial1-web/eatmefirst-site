/* Categorie italiane: nessuna riclassificazione dei prodotti esistenti. */
(function () {
    const KEY = 'eat_categorie_personalizzate_v1';
    const labels = window.EatInventarioTesti?.[window.document?.documentElement.lang]?.inventory;
    const iniziali = []; // Le categorie vengono ricordate solo dopo l’inserimento dell’utente.
    const pulisci = v => typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
    const id = v => pulisci(v).toLocaleLowerCase('en');
    const uguali = (a, b) => id(a) === id(b);
    const escape = v => String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    function foto(valore) {
        return typeof valore === 'string' && (/^https?:\/\//i.test(valore) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(valore)) ? escape(valore) : '../../IMG/logo_1024_white.png';
    }

    function leggi() {
        const memoria = JSON.parse(localStorage.getItem(KEY) || '{"gruppi":[],"prodotti":[]}');
        if (!memoria || !Array.isArray(memoria.gruppi) || !Array.isArray(memoria.prodotti)) throw Error('Invalid category memory');
        return memoria;
    }
    function prodottiLocali() {
        const prodotti = JSON.parse(localStorage.getItem('eat_dispensa_locale') || '[]');
        if (!Array.isArray(prodotti)) throw Error('Invalid inventory');
        return prodotti;
    }
    function aggiungi(gruppi, categoria, sottocategoria) {
        categoria = pulisci(categoria);
        sottocategoria = pulisci(sottocategoria);
        if (!categoria) return;
        let gruppo = gruppi.find(g => uguali(g.nome, categoria));
        if (!gruppo) { gruppo = {nome: categoria, sottocategorie: []}; gruppi.push(gruppo); }
        if (sottocategoria && !gruppo.sottocategorie.some(s => uguali(s, sottocategoria))) gruppo.sottocategorie.push(sottocategoria);
    }
    function elenco() {
        const gruppi = iniziali.map(([nome, sottocategorie]) => ({nome, sottocategorie: [...sottocategorie]}));
        leggi().gruppi.forEach(g => {
            if (!g || !Array.isArray(g.sottocategorie)) throw Error('Invalid group');
            aggiungi(gruppi, g.nome, '');
            g.sottocategorie.forEach(s => aggiungi(gruppi, g.nome, s));
        });
        prodottiLocali().forEach(p => aggiungi(gruppi, p.categoria, p.sottocategoria));
        return gruppi;
    }
    function scelta(categoria, sottocategoria) {
        const gruppo = elenco().find(g => uguali(g.nome, categoria));
        return {
            categoria: gruppo ? gruppo.nome : pulisci(categoria),
            sottocategoria: gruppo ? gruppo.sottocategorie.find(s => uguali(s, sottocategoria)) || pulisci(sottocategoria) : pulisci(sottocategoria)
        };
    }
    function ricorda(prodotto) {
        const memoria = leggi();
        memoria.gruppi = elenco();
        aggiungi(memoria.gruppi, prodotto.categoria, prodotto.sottocategoria);
        if (pulisci(prodotto.barcode)) {
            memoria.prodotti = memoria.prodotti.filter(p => p.barcode !== prodotto.barcode);
            memoria.prodotti.push({barcode: prodotto.barcode, categoria: prodotto.categoria, sottocategoria: prodotto.sottocategoria || ''});
        }
        localStorage.setItem(KEY, JSON.stringify(memoria));
    }
    function precedente(barcode) {
        if (!pulisci(barcode)) return null;
        return leggi().prodotti.find(p => p.barcode === barcode) || [...prodottiLocali()].reverse().find(p => p.barcode === barcode) || JSON.parse(localStorage.getItem('eat_catalogo_prodotti_v1') || '[]').find(p=>p.barcode===barcode) || null;
    }
    function suggerisci() {
        const categorie = document.getElementById('categorie-carico');
        const sotto = document.getElementById('sottocategorie-carico');
        categorie.replaceChildren();
        sotto.replaceChildren();
        const gruppi = elenco();
        gruppi.forEach(g => categorie.appendChild(new Option(g.nome, g.nome)));
        const gruppo = gruppi.find(g => uguali(g.nome, document.getElementById('prodotto-categoria').value));
        if (gruppo) gruppo.sottocategorie.forEach(s => sotto.appendChild(new Option(s, s)));
    }
    function imposta(categoria, sottocategoria = '') {
        document.getElementById('prodotto-categoria').value = categoria || '';
        document.getElementById('prodotto-sottocategoria').value = sottocategoria || '';
        suggerisci();
    }
    function cambiaCategoria() {
        document.getElementById('prodotto-sottocategoria').value = '';
        suggerisci();
    }
    function filtri(prodotti, reset = false) {
        const cat = document.getElementById('filtroCategoria');
        const sub = document.getElementById('filtroSottocategoria');
        if (reset) {
            const valore = cat.value;
            cat.replaceChildren(new Option(labels?.['All categories'] ?? 'All categories', ''));
            [...new Set(prodotti.map(p => p.categoria).filter(Boolean))].sort().forEach(c => cat.appendChild(new Option(c, c)));
            if ([...cat.options].some(o => o.value === valore)) cat.value = valore;
        }
        const valoreSub = sub.value;
        sub.replaceChildren(new Option(labels?.['All subcategories'] ?? 'All subcategories', ''));
        const scelte = prodotti.filter(p => !cat.value || p.categoria === cat.value);
        [...new Set(scelte.map(p => p.sottocategoria).filter(Boolean))].sort().forEach(s => sub.appendChild(new Option(s, s)));
        sub.disabled = !cat.value;
        if (cat.value && [...sub.options].some(o => o.value === valoreSub)) sub.value = valoreSub;
    }
    window.EatCategorie = {scelta, ricorda, precedente, suggerisci, imposta, cambiaCategoria, filtri, escape, foto};
})();
