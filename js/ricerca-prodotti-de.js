/* Consultazione in sola lettura dei quattro archivi Open Facts.
 * Nessun invio della dispensa e nessuna memorizzazione permanente dei fallimenti.
 */
(function () {
    let prossimaRichiesta = 0;
    const testo = valore => typeof valore === 'string' ? valore.trim() : '';
    const lista = valore => Array.isArray(valore) ? valore.filter(v => typeof v === 'string') : [];
    const codice = valore => String(valore || '').replace(/^0+/, '');
    const siti = {
        'world.openfoodfacts.org': ['Open Food Facts', 'food'],
        'world.openpetfoodfacts.org': ['Open Pet Food Facts', 'petfood'],
        'world.openbeautyfacts.org': ['Open Beauty Facts', 'beauty'],
        'world.openproductsfacts.org': ['Open Products Facts', 'product']
    };

    function categoria(tipo, tags) {
        if (tipo === 'petfood') return {categoria: 'Tierbedarf', sottocategoria: 'Futter'};
        if (tipo === 'beauty') return {categoria: 'Körperpflege', sottocategoria: ''};
        if (tipo !== 'food') return {categoria: '', sottocategoria: ''};
        if (tags.some(t => ['en:beverages', 'en:waters', 'en:fruit-juices', 'en:alcoholic-beverages'].includes(t))) {
            return {categoria: 'Getränke', sottocategoria: ''};
        }
        return {categoria: 'Lebensmittel', sottocategoria: ''};
    }

    function normalizza(p, urlRisposta, barcode) {
        if (!p || typeof p !== 'object' || Array.isArray(p)) throw Error('Risposta non valida');
        if (p.code && codice(p.code) !== codice(barcode)) throw Error('Il codice restituito non corrisponde');
        const url = new URL(urlRisposta);
        // L'API può reindirizzare a world-it, world-en, ecc. in base alla lingua.
        // Si accettano soltanto le varianti linguistiche dei quattro domini noti.
        const dominio = url.hostname.replace(/^world-[a-z]{2,3}\./, 'world.');
        const sito = siti[dominio];
        if (!sito) throw Error('Archivio non riconosciuto');
        const tipo = ['food', 'petfood', 'beauty', 'product'].includes(p.product_type) ? p.product_type : sito[1];
        const fonte = {nome: sito[0], url: 'https://' + dominio + '/product/' + encodeURIComponent(barcode)};
        const immagine = testo(p.image_front_url) || testo(p.image_url);
        const quantita = testo(p.quantity);
        // Il formato "12 x 500 ml" indica 12 unità, mentre "500 ml" non indica pezzi.
        const formato = quantita.match(/^(\d+)\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:ml|cl|l|g|kg)\b/i);
        const pezzi = formato ? Number(formato[1]) : null;
        const kcal = p.nutriments && p.nutriments['energy-kcal_100g'];
        const linguaOriginale = testo(p.lang).toLowerCase();
        const ingredientiItaliani = testo(p.ingredients_text_de);
        const ingredienti = ingredientiItaliani || testo(p.ingredients_text);
        return {
            nome: testo(p.product_name_de) || testo(p.product_name),
            lingua_nome: testo(p.product_name_de) ? 'de' : linguaOriginale || 'non_specificata',
            immagine: /^https:\/\//i.test(immagine) ? immagine : '',
            ...categoria(tipo, lista(p.categories_tags)),
            pezzi_per_confezione: Number.isSafeInteger(pezzi) && pezzi > 0 ? pezzi : null,
            quantita_confezione: quantita,
            dettagli: {
                ingredienti,
                lingua_ingredienti: ingredienti ? (ingredientiItaliani ? 'de' : linguaOriginale || 'non_specificata') : '',
                allergeni: lista(p.allergens_tags).join(', '),
                tracce: lista(p.traces_tags).join(', '),
                calorie: kcal !== undefined && kcal !== null && Number.isFinite(Number(kcal)) ? `${Number(kcal)} kcal/100g` : '',
                categorie_origine: testo(p.categories),
                marca: testo(p.brands),
                tipo_prodotto: tipo,
                fonti: [fonte],
                recuperato_il: new Date().toISOString()
            },
            fonte
        };
    }

    async function cerca(barcode, signal) {
        if (!/^\d{8,14}$/.test(barcode)) return {stato: 'codice_non_valido'};
        if (Date.now() < prossimaRichiesta) {
            return {stato: 'limite', attesa: Math.max(1, Math.ceil((prossimaRichiesta - Date.now()) / 1000))};
        }
        // Margine rispetto al limite documentato: 15 consultazioni/minuto/IP.
        prossimaRichiesta = Date.now() + 5000;
        const controller = new AbortController();
        const annulla = () => controller.abort();
        if (signal?.aborted) return {stato: 'annullata'};
        signal?.addEventListener('abort', annulla, {once: true});
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const url = new URL('https://world.openfoodfacts.org/api/v3/product/' + barcode);
            url.search = new URLSearchParams({
                product_type: 'all', lc: 'de', app_name: 'EatMeFirst', app_version: '1.0',
                fields: 'code,lang,product_type,product_name,product_name_de,image_front_url,image_url,categories,categories_tags,quantity,brands,ingredients_text,ingredients_text_de,allergens_tags,traces_tags,nutriments'
            }).toString();
            const risposta = await fetch(url.href, {signal: controller.signal, credentials: 'omit'});
            if (risposta.status === 429) {
                const dopo = risposta.headers.get('Retry-After');
                const secondi = /^\d+$/.test(dopo || '') ? Number(dopo) : Math.ceil((Date.parse(dopo) - Date.now()) / 1000);
                const attesa = Number.isFinite(secondi) ? Math.max(60, secondi) : 60;
                prossimaRichiesta = Date.now() + attesa * 1000;
                return {stato: 'limite', attesa};
            }
            if (risposta.status === 404) return {stato: 'non_trovato'};
            if (!risposta.ok) return {stato: 'non_disponibile'};
            const dati = await risposta.json();
            if (dati.status === 0 || ['en:product-not-found', 'product_not_found'].includes(dati.result?.id)) return {stato: 'non_trovato'};
            if (dati.status === 'failure' || !dati.product) return {stato: 'non_disponibile'};
            return {stato: 'trovato', scheda: normalizza(dati.product, risposta.url || url.href, barcode)};
        } catch (errore) {
            return {stato: signal?.aborted ? 'annullata' : 'non_disponibile'};
        } finally {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', annulla);
        }
    }

    window.EatRicercaProdotti = {cerca};
})();
