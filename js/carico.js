const testiCarico = window.EatCaricoTesti?.[document.documentElement.lang];
function testoCarico(originale) {
    return testiCarico?.messages[originale] ?? originale;
}

function pezziDisponibili(p) {
    if (Number.isSafeInteger(p.pezzi_rimanenti) && p.pezzi_rimanenti >= 0) return p.pezzi_rimanenti;
    const q = Number(p.quantita), n = Number(p.pezzi_per_confezione || 1);
    return (Number.isSafeInteger(q) && q > 0 ? q : 1) * (Number.isSafeInteger(n) && n > 0 ? n : 1);
}

let html5QrCodeScanner = null;
window.dettagliEstesiCorrenti = {};

function impostaFotoProdotto(sorgente = '') {
    const img = document.getElementById('prodotto-foto');
    const valida = typeof sorgente === 'string' && /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif);)/i.test(sorgente);
    img.setAttribute('data-foto-prodotto', valida ? sorgente : '');
    img.alt = valida ? 'Product preview' : 'EatMeFirst logo: product photo unavailable';
    // Il logo è solo una sostituzione visiva, non diventa la foto salvata del prodotto.
    img.onerror = valida ? () => impostaFotoProdotto() : null;
    img.src = valida ? sorgente : '../../IMG/logo_1024_white.png';
}

function completaFotoMancante(barcode, immagine) {
    if (!barcode || typeof immagine !== 'string' || !/^https:\/\//i.test(immagine)) return false;
    const aggiornamenti = {}, attesi = {};
    for (const chiave of ['eat_dispensa_locale', 'eat_catalogo_prodotti_v1']) {
        const righe = EatStorico.leggi(chiave);
        attesi[chiave] = localStorage.getItem(chiave);
        let modificata = false;
        const nuove = righe.map(p => {
            const fotoMancante = !p.immagine || /(?:^|\/)logo_1024_white\.png(?:[?#].*)?$/i.test(p.immagine);
            if (p.barcode !== barcode || !fotoMancante) return p;
            modificata = true;
            return {...p, immagine};
        });
        if (modificata) aggiornamenti[chiave] = nuove;
    }
    if (!Object.keys(aggiornamenti).length) return false;
    EatStorico.registra('Foto prodotto', 'Added missing photo for barcode ' + barcode, aggiornamenti, attesi);
    return true;
}

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('eat_hide_max_carico') !== 'true') {
        document.getElementById('maxPresentationBox').style.display = 'flex';
    }
    ripristinaUltimiValoriMemoria();
    aggiornaCatalogoCarico();
    EatCategorie.suggerisci();
    if (EatUbicazioni.ricorda()) EatUbicazioni.suggerisci('ubicazioni-carico');
});

function chiudiMaxTemporaneo() {
    document.getElementById('maxPresentationBox').style.display = 'none';
}

function chiudiMaxDefinitivo() {
    document.getElementById('maxPresentationBox').style.display = 'none';
    localStorage.setItem('eat_hide_max_carico', 'true');
}

function ripristinaUltimiValoriMemoria() {
    const ultimaUbicazione = localStorage.getItem('eat_ultima_ubicazione');
    const ultimaCategoria = localStorage.getItem('eat_ultima_categoria');
    const ultimoFornitore = localStorage.getItem('eat_ultimo_fornitore');

    if (ultimaUbicazione && !document.getElementById('prodotto-ubicazione').value) {
        document.getElementById('prodotto-ubicazione').value = ultimaUbicazione;
    }
    if (ultimaCategoria && !document.getElementById('prodotto-categoria').value) {
        EatCategorie.imposta(ultimaCategoria, localStorage.getItem('eat_ultima_sottocategoria') || '');
    }
    if (ultimoFornitore && !document.getElementById('prodotto-fornitore').value) {
        document.getElementById('prodotto-fornitore').value = ultimoFornitore;
    }
}

/* --- GESTIONE SCANNER LIVE INTERNO --- */
function avviaScannerLive() {
    const overlay = document.getElementById('scanner-overlay');
    overlay.style.display = 'flex';

    if (!html5QrCodeScanner) {
        html5QrCodeScanner = new Html5Qrcode("scanner-container");
    }

    const config = { fps: 10, qrbox: { width: 280, height: 140 } };

    html5QrCodeScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
            annullaRicercaCodice();
            document.getElementById('prodotto-barcode').value = decodedText;
            cercaProdottoOnline(decodedText);
            chiudiScannerLive();
        },
        (errorMessage) => {}
    ).catch(err => {
        alert(testoCarico("⚠️ Unable to start the camera. Check your browser permissions."));
        chiudiScannerLive();
    });
}

function chiudiScannerLive() {
    if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
        html5QrCodeScanner.stop().then(() => {
            document.getElementById('scanner-overlay').style.display = 'none';
        }).catch(err => {
            document.getElementById('scanner-overlay').style.display = 'none';
        });
    } else {
        document.getElementById('scanner-overlay').style.display = 'none';
    }
}

/* --- RICERCA RAPIDA ONLINE (Open Food Facts / Database Mirati) --- */
function cercaCodiceManuale() {
    const campo = document.getElementById('prodotto-barcode');
    const barcode = campo.value.replace(/\s+/g, '');
    if (!/^\d{8,14}$/.test(barcode)) {
        document.getElementById('esito-ricerca-codice').textContent = testoCarico("Enter an 8–14 digit barcode, keeping any leading zeros.");
        campo.focus();
        return;
    }
    campo.value = barcode;
    return cercaProdottoOnline(barcode);
}

let ricercaCodiceCorrente = 0;
let controllerRicercaCodice = null;
let metadatiRicercaCorrente = null;

function annullaRicercaCodice() {
    ricercaCodiceCorrente++;
    controllerRicercaCodice?.abort();
    controllerRicercaCodice = null;
    metadatiRicercaCorrente = null;
    window.dettagliEstesiCorrenti = {};
    impostaFotoProdotto();
    document.getElementById('box-info-tecniche').style.display = 'none';
    document.getElementById('prodotto-peso-badge').style.display = 'none';
    document.getElementById('esito-ricerca-codice').textContent = testoCarico("Press Find product to check this barcode, or enter the product yourself.");
}

async function cercaProdottoOnline(barcode) {
    if (!/^\d{8,14}$/.test(barcode)) {
        document.getElementById('esito-ricerca-codice').textContent = testoCarico("Invalid barcode: enter 8–14 digits or fill in the product yourself.");
        return;
    }
    controllerRicercaCodice?.abort();
    controllerRicercaCodice = new AbortController();
    const ricerca = ++ricercaCodiceCorrente;
    const esito = document.getElementById('esito-ricerca-codice');
    esito.textContent = testoCarico("Searching food, pet food, cosmetics and other products… You can keep filling in the form.");
    let memoriaLocale;
    try {
        memoriaLocale = [...EatStorico.leggi('eat_catalogo_prodotti_v1'), ...EatStorico.leggi('eat_dispensa_locale')];
        if (!Array.isArray(memoriaLocale)) throw Error('Dispensa non valida');
    } catch (errore) {
        esito.textContent = testoCarico("Your local inventory cannot be read. Check the data before saving more products.");
        return;
    }
    const locale = [...memoriaLocale].reverse().find(p => p.barcode === barcode);
    const classificazione = EatCategorie.precedente(barcode);
    EatCategorie.imposta(classificazione?.categoria || '', classificazione?.sottocategoria || '');
    document.getElementById('prodotto-nome').value = locale?.nome || '';
    impostaFotoProdotto();
    document.getElementById('prodotto-peso-badge').style.display = 'none';
    document.getElementById('box-info-tecniche').style.display = 'none';
    impostaFotoProdotto(locale?.immagine);
    if (locale?.ubicazione) document.getElementById('prodotto-ubicazione').value = locale.ubicazione;
    if (locale?.fornitore) document.getElementById('prodotto-fornitore').value = locale.fornitore;
    window.dettagliEstesiCorrenti = {...(locale?.dettagli_tecnici || {})};
    metadatiRicercaCorrente = {barcode, stato: 'in_corso', nome_online: locale?.ricerca_prodotto?.nome_online || '', nome_personalizzato: locale?.ricerca_prodotto?.nome_personalizzato || false};
    const campi = ['prodotto-nome', 'prodotto-categoria', 'prodotto-sottocategoria', 'prodotto-pezzi'];
    const prima = Object.fromEntries(campi.map(id => [id, document.getElementById(id).value]));
    const risultato = await EatRicercaProdotti.cerca(barcode, controllerRicercaCodice.signal);
    if (ricerca !== ricercaCodiceCorrente || document.getElementById('prodotto-barcode').value !== barcode) return;
    if (risultato.stato === 'annullata') return;
    metadatiRicercaCorrente.stato = risultato.stato;
    metadatiRicercaCorrente.controllato_il = new Date().toISOString();
    if (risultato.stato === 'trovato') {
        const scheda = risultato.scheda;
        const campoNome = document.getElementById('prodotto-nome');
        const nomeModificato = locale?.ricerca_prodotto?.nome_personalizzato;
        // Un nome provvisorio può essere completato; un nome corretto dall'utente resta suo.
        const provvisorio = !locale || (!locale.immagine && !locale.ricerca_prodotto) ||
            (locale.ricerca_prodotto && !locale.ricerca_prodotto.nome_online && !nomeModificato);
        if (scheda.nome && campoNome.value === prima['prodotto-nome'] && (provvisorio || !campoNome.value)) campoNome.value = scheda.nome;
        if (scheda.immagine) impostaFotoProdotto(scheda.immagine);
        const campoCategoria = document.getElementById('prodotto-categoria');
        if (!prima['prodotto-categoria'] && !campoCategoria.value && !document.getElementById('prodotto-sottocategoria').value && scheda.categoria) {
            EatCategorie.imposta(scheda.categoria, scheda.sottocategoria);
        }
        const campoPezzi = document.getElementById('prodotto-pezzi');
        if (scheda.pezzi_per_confezione && prima['prodotto-pezzi'] === '1' && campoPezzi.value === '1') campoPezzi.value = String(scheda.pezzi_per_confezione);
        const dettagli = {...window.dettagliEstesiCorrenti};
        const fontiCampi = {...(dettagli.fonti_campi || {})};
        Object.entries(scheda.dettagli).forEach(([key, value]) => {
            if (key === 'fonti') return;
            if (value !== '' && value !== null) {
                dettagli[key] = value;
                fontiCampi[key] = scheda.fonte;
            }
        });
        dettagli.fonti_campi = fontiCampi;
        dettagli.fonti = [...(dettagli.fonti || []), scheda.fonte].filter((fonte, i, tutte) => tutte.findIndex(f => f.url === fonte.url) === i);
        window.dettagliEstesiCorrenti = dettagli;
        metadatiRicercaCorrente.nome_online = scheda.nome;
        metadatiRicercaCorrente.fonte = scheda.fonte;
        metadatiRicercaCorrente.lingua_nome = scheda.lingua_nome;
        if (scheda.quantita_confezione) {
            document.getElementById('prodotto-peso-badge').textContent = scheda.quantita_confezione;
            document.getElementById('prodotto-peso-badge').style.display = 'block';
        }
        document.getElementById('box-info-tecniche').style.display = 'block';
        document.getElementById('testo-info-tecniche').textContent = testoCarico("Information found: you can read it in the product details in Inventory.");
        esito.textContent = testoCarico("Data from ") + scheda.fonte.nome + testoCarico(". Check the name, category and items per pack before saving.");
        try {
            if (completaFotoMancante(barcode, scheda.immagine)) esito.textContent += testoCarico(" The missing photo was also added to saved products: quantities and other details were kept.");
        } catch (errore) {
            esito.textContent += testoCarico(" Could not add the photo to saved products: ") + (testiCarico?.error ?? EatErroriEN(errore.message));
        }
        if (scheda.nome && scheda.lingua_nome !== 'en') esito.textContent += testoCarico(" The name is from the original catalogue: an English version is unavailable.");
        if (scheda.nome && campoNome.value !== scheda.nome) esito.textContent += testoCarico(" Catalogue name: ") + scheda.nome + testoCarico(". Your chosen name was kept; you can change it if you prefer.");
    } else if (risultato.stato === 'non_trovato') {
        esito.textContent = testoCarico("Barcode not found in the four catalogues. You can save the details yourself: we will try again next time you scan it.");
    } else if (risultato.stato === 'limite') {
        esito.textContent = testoCarico("Lookups are temporarily limited. Try again in ") + risultato.attesa + testoCarico(" seconds or enter the details yourself. This does not mean the barcode is unknown.");
    } else {
        esito.textContent = testoCarico("Search is temporarily unavailable or too slow. You can use local details or enter them yourself: we will try again next time you scan.");
    }
}

function aggiornaScadenzaUI() {
    const tipo = document.querySelector('input[name="tipo-scadenza"]:checked').value;
    document.getElementById('valore-giorni').disabled = (tipo !== 'giorni');
    document.getElementById('valore-mesi').disabled = (tipo !== 'mesi');
    document.getElementById('valore-data-esatta').disabled = (tipo !== 'esatta');
}

function resetForm() {
    annullaRicercaCodice();
    document.getElementById('esito-ricerca-codice').textContent = testoCarico("You can also leave the barcode empty and enter the product yourself.");
    document.getElementById('prodotto-barcode').value = "";
    document.getElementById('prodotto-nome').value = "";
    impostaFotoProdotto();
    document.getElementById('prodotto-note').value = "";
    document.getElementById('prodotto-quantita').value = "1";
    document.getElementById('prodotto-pezzi').value = "1";
    document.getElementById('prodotto-tassativo').checked = false;
    document.getElementById('box-info-tecniche').style.display = "none";
    document.getElementById('prodotto-peso-badge').style.display = "none";
    document.getElementById('valore-giorni').value = '';
    document.getElementById('valore-mesi').value = '';
    document.getElementById('valore-data-esatta').value = '';
    document.getElementById('scad-opt-1').checked = true;
    aggiornaScadenzaUI();

    ripristinaUltimiValoriMemoria();
}

function aggiornaCatalogoCarico() {
    try {
        const prodotti = EatStorico.leggi('eat_catalogo_prodotti_v1');
        const select = document.getElementById('scegli-catalogo');
        select.replaceChildren(new Option('Choose a product to add again…',''));
        prodotti.forEach((p,i)=>select.appendChild(new Option(`${p.nome}${p.ubicazione ? ' — '+p.ubicazione : ''}`,String(i))));
        document.getElementById('catalogo-ricordato').hidden = !prodotti.length;
    } catch (errore) { document.getElementById('esito-ricerca-codice').textContent=testoCarico("Cannot read the catalogue: ")+(testiCarico?.error ?? EatErroriEN(errore.message)); }
}
function usaProdottoCatalogo(indice) {
    if (indice === '') return;
    const p = EatStorico.leggi('eat_catalogo_prodotti_v1')[Number(indice)];
    if (!p) return;
    resetForm();
    document.getElementById('prodotto-nome').value=p.nome || '';
    document.getElementById('prodotto-barcode').value=p.barcode || '';
    document.getElementById('prodotto-ubicazione').value=p.ubicazione || '';
    document.getElementById('prodotto-fornitore').value=p.fornitore || '';
    EatCategorie.imposta(p.categoria || '',p.sottocategoria || '');
    document.getElementById('prodotto-pezzi').value=String(Math.max(1,Number(p.pezzi_per_confezione)||1));
    document.getElementById('prodotto-quantita').value='';
    impostaFotoProdotto(p.immagine);
    window.dettagliEstesiCorrenti={...(p.dettagli_tecnici||{})};
    metadatiRicercaCorrente=p.ricerca_prodotto?{...p.ricerca_prodotto}:null;
    document.getElementById('esito-ricerca-codice').textContent=testoCarico("Details restored from your catalogue. Enter the packs purchased and choose the new date before saving.");
}

/* --- SALVATAGGIO IN LOCALSTORAGE CON DATI ESSENZIALI E DETTAGLI DIFFERITI --- */
function salvaProdotto() {
    const barcode = document.getElementById('prodotto-barcode').value;
    const nome = document.getElementById('prodotto-nome').value;
    const {categoria, sottocategoria} = EatCategorie.scelta(document.getElementById('prodotto-categoria').value, document.getElementById('prodotto-sottocategoria').value);
    if (sottocategoria && !categoria) { alert(testoCarico("Choose a category before a subcategory.")); return; }
    const quantita = document.getElementById('prodotto-quantita').value;
    const pezzi = document.getElementById('prodotto-pezzi').value;
    const totalePezzi = Number(quantita) * Number(pezzi);
    if (![Number(quantita), Number(pezzi), totalePezzi].every(n => Number.isSafeInteger(n) && n > 0)) {
        alert(testoCarico("Enter whole numbers greater than zero for packs and items per pack."));
        return;
    }
    const ubicazione = EatUbicazioni.canonica(document.getElementById('prodotto-ubicazione').value);
    const fornitore = document.getElementById('prodotto-fornitore').value;
    const tassativo = document.getElementById('prodotto-tassativo').checked;
    const note = document.getElementById('prodotto-note').value;
    const foto = document.getElementById('prodotto-foto').getAttribute('data-foto-prodotto') || '';

    if (fornitore) localStorage.setItem('eat_ultimo_fornitore', fornitore);

    const tipoScadenza = document.querySelector('input[name="tipo-scadenza"]:checked').value;
    let scadenzaValore = "";


    if (tipoScadenza === 'giorni') {
        scadenzaValore = document.getElementById('valore-giorni').value;
    } else if (tipoScadenza === 'mesi') {
        scadenzaValore = document.getElementById('valore-mesi').value;
    } else if (tipoScadenza === 'esatta') {
        scadenzaValore = document.getElementById('valore-data-esatta').value;
    }

    const istanteCarico = new Date();
    const scadenzaCalcolata = EatScadenze.calcola(tipoScadenza, scadenzaValore, EatScadenze.oggi(istanteCarico));
    if (!scadenzaCalcolata.valida) { alert((testiCarico?.dateError ?? EatErroriEN(scadenzaCalcolata.messaggio))); return; }
    if (tassativo && !scadenzaCalcolata.data) { alert(testoCarico("Enter a date when Strict date is selected.")); return; }
    const scadenzaRiepilogo = scadenzaCalcolata.data ? EatScadenze.formato(scadenzaCalcolata.data) + (tassativo ? testoCarico(" — strict date") : testoCarico(" — indicative date")) : testoCarico("No date entered");

    const datiConferma = {name: nome || testoCarico("Unnamed"), category: [categoria, sottocategoria].filter(Boolean).join(" → "), location: ubicazione || testoCarico("Not specified"), packs: quantita, pieces: pezzi, total: totalePezzi, date: scadenzaRiepilogo};
    const conferma = confirm(testiCarico?.confirm.replace(/\{(\w+)\}/g, (_, chiave) => datiConferma[chiave]) ?? `Product summary:\n\n• Product: ${nome || testoCarico("Unnamed")}\n• Category: ${categoria}${sottocategoria ? " → " + sottocategoria : ""}\n• Location: ${ubicazione || testoCarico("Not specified")}\n• Quantity: ${quantita} packs (${pezzi} items/pack), total ${totalePezzi} items\n• Date: ${scadenzaRiepilogo}\n\nConfirm adding this product to your inventory?`);

    if (!conferma) return;
    if (!EatUbicazioni.ricorda([ubicazione])) return;

    // Impedisce a una risposta tardiva di cambiare la scheda dopo la conferma.
    controllerRicercaCodice?.abort();
    ricercaCodiceCorrente++;
    const ricercaSalvata = metadatiRicercaCorrente?.barcode === barcode ? {...metadatiRicercaCorrente} : {barcode, stato: 'manuale', nome_online: ''};
    if (ricercaSalvata.stato === 'in_corso') ricercaSalvata.stato = 'da_completare';
    ricercaSalvata.nome_personalizzato = ricercaSalvata.nome_online ? nome !== ricercaSalvata.nome_online : false;
    const prodottoData = {
        barcode: barcode,
        nome: nome || testoCarico("Unnamed product"),
        categoria: categoria,
        sottocategoria: sottocategoria,
        ubicazione: ubicazione,
        fornitore: fornitore,
        quantita: parseInt(quantita),
        pezzi_per_confezione: Number(pezzi),
        pezzi_rimanenti: totalePezzi,
        tassativo: tassativo,
        tipo_scadenza: tipoScadenza,
        valore_scadenza: scadenzaValore,
        data_scadenza: scadenzaCalcolata.data,
        data_scadenza_iniziale: scadenzaCalcolata.data,
        note: note,
        immagine: foto,
        dettagli_tecnici: window.dettagliEstesiCorrenti || {},
        ricerca_prodotto: ricercaSalvata,
        data_carico: istanteCarico.toISOString()
    };

    let dispensa = EatStorico.leggi('eat_dispensa_locale');
    const dispensaAttesa = localStorage.getItem('eat_dispensa_locale');
    dispensa.push(prodottoData);
    try {
        EatStorico.registra('Carico', `${prodottoData.nome}: ${totalePezzi} items (${quantita} packs of ${pezzi}) in ${ubicazione || 'unspecified location'}`, {eat_dispensa_locale: dispensa}, {eat_dispensa_locale: dispensaAttesa});
    } catch (errore) {
        alert(testoCarico("Product not saved. ") + (testiCarico?.error ?? EatErroriEN(errore.message)));
        return;
    }
    try {
        EatCategorie.ricorda(prodottoData);
        localStorage.setItem('eat_ultima_categoria', categoria);
        localStorage.setItem('eat_ultima_sottocategoria', sottocategoria);
    } catch (errore) {
        alert(testoCarico("The product was saved, but the category memory could not be updated."));
    }
    EatCategorie.imposta(categoria, sottocategoria);
    if (ubicazione) localStorage.setItem('eat_ultima_ubicazione', ubicazione);
    EatUbicazioni.suggerisci('ubicazioni-carico');

    const altroProdotto = confirm(testiCarico?.saved ?? "✅ Product saved in your inventory!\n\nWould you like to add another product?");

    resetForm();
    window.dettagliEstesiCorrenti = {};

    if (altroProdotto) {
        if (testiCarico) document.getElementById('prodotto-nome').focus();
        else avviaScannerLive();
    } else {
        window.location.href = "../menu.html";
    }
}
