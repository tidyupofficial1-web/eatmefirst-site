const testiScarico = window.EatScaricoTesti?.[document.documentElement.lang];
function testoScarico(originale) {
    return testiScarico?.labels[originale] ?? originale;
}
function messaggioScarico(chiave, valori, originale) {
    return testiScarico?.messages[chiave]?.replace(/\{(\w+)\}/g, (_, nome) => valori[nome]) ?? originale;
}
function erroreScarico(messaggio) {
    return testiScarico?.error ?? EatErroriEN(messaggio);
}

let dispensaGlobale = [];
let prodottoSelezionato = null;
let percentualeAttuale = 100;
let indiceModificaAttuale = null;
let indiceSpostamento = null;
let indiceScaricoPezzi = null;
let operazioneInCorso = null;

function memorizzaPrimaDiScaricare(azione, tipo = 'Scarico') {
    try {
        if (!EatStorico.coerente('eat_dispensa_locale', dispensaGlobale)) throw Error('La dispensa è cambiata. Ricarica la pagina prima di continuare.');
        for (const key of ['eat_spesa_locale', 'eat_lista_spesa_v1']) EatStorico.leggi(key);
        operazioneInCorso = {
            tipo, descrizione: azione, aggiornamenti: {}, riferimenti: [],
            attesi: Object.fromEntries(['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale'].map(k => [k, localStorage.getItem(k)]))
        };
        return true;
    } catch (errore) {
        alert(erroreScarico(errore.message));
        return false;
    }
}

function pezziDisponibili(p) {
    const espliciti = Number(p.pezzi_rimanenti);
    if (Number.isSafeInteger(espliciti) && espliciti >= 0) return espliciti;
    const conf = Number(p.quantita) || 1;
    const pezzi = Number(p.pezzi_per_confezione) || 1;
    return Math.max(0, Math.round(conf * pezzi));
}

window.addEventListener('DOMContentLoaded', async () => {
    // Controllo se il messaggio di Eva è stato chiuso in precedenza
    if (localStorage.getItem('eat_eva_welcome_closed') === 'true') {
        const box = document.getElementById('evaWelcomeBox');
        if (box) box.style.display = 'none';
    }

    await caricaDispensaCombinata();
});

function aggiornaScaricoSeLibero() {
    const aperta = ['modalScaricoPezzi', 'modalScaricoVisual', 'modalModificaScheda', 'modalSpostaPezzi', 'modalRiepilogoScarico'].some(id => document.getElementById(id).style.display === 'flex');
    if (!aperta) caricaDispensaCombinata();
}
window.addEventListener('pageshow', aggiornaScaricoSeLibero);
window.addEventListener('focus', aggiornaScaricoSeLibero);
window.addEventListener('storage', evento => { if (evento.key === 'eat_dispensa_locale' || evento.key === null) setTimeout(aggiornaScaricoSeLibero, 100); });

function chiudiWelcomeEva() {
    const box = document.getElementById('evaWelcomeBox');
    if (box) box.style.display = 'none';
    localStorage.setItem('eat_eva_welcome_closed', 'true');
}

/* Unica dispensa locale, condivisa con Carico e con lo storico. */
async function caricaDispensaCombinata() {
    try {
        dispensaGlobale = EatStorico.leggi('eat_dispensa_locale');
        if (EatUbicazioni.ricorda([], dispensaGlobale)) EatUbicazioni.suggerisci('ubicazioni-scarico', dispensaGlobale);
        popolaFiltri();
        filtraDispensa();
    } catch (errore) { alert(testoScarico("Could not read inventory. ") + erroreScarico(errore.message)); }
}

function salvaDispensaAggiornata() {
    try {
        if (!operazioneInCorso) throw Error('Operazione non preparata: ricarica la pagina.');
        const op = operazioneInCorso;
        const risultati = EatStorico.registra(op.tipo, op.descrizione,
            {...op.aggiornamenti, eat_dispensa_locale: dispensaGlobale}, op.attesi, op.riferimenti);
        dispensaGlobale = risultati.eat_dispensa_locale;
        operazioneInCorso = null;
        return true;
    } catch (errore) {
        operazioneInCorso = null;
        alert(testoScarico("Operation not saved. ") + erroreScarico(errore.message));
        caricaDispensaCombinata();
        return false;
    }
}

function popolaFiltri() {
    const ubSelect = document.getElementById('filtroUbicazione');

    const ubs = [...new Set(dispensaGlobale.map(p => p.ubicazione).filter(Boolean))];


    ubSelect.replaceChildren(new Option(testoScarico("All locations"), ''));
    ubs.forEach(u => ubSelect.appendChild(new Option(u, u)));

    EatCategorie.filtri(dispensaGlobale, true);
}

function filtraDispensa() {
    const query = document.getElementById('filtroNome').value.toLowerCase();
    const ub = document.getElementById('filtroUbicazione').value;
    const cat = document.getElementById('filtroCategoria').value;

    const container = document.getElementById('listaRisultati');
    const filtrati = dispensaGlobale.filter(p =>
        (p.nome || "").toLowerCase().includes(query) &&
        (ub === "" || p.ubicazione === ub) &&
        (cat === "" || p.categoria === cat) &&
        (!document.getElementById('filtroSottocategoria').value || p.sottocategoria === document.getElementById('filtroSottocategoria').value)
    );

    if (filtrati.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-style: italic;">${testoScarico("No products found in your inventory.")}</div>`;
        return;
    }

    container.innerHTML = filtrati.map((p) => {
        const index = dispensaGlobale.indexOf(p);
        const fotoProdotto = EatCategorie.foto(p.immagine || p.foto);
        const n = pezziDisponibili(p);
        const dettaglioPezzi = ` | 📦 ${n} ${n === 1 ? testoScarico("item available") : testoScarico("items available")}`;

        return `
        <div class="product-item">
            <div class="product-info-left">
                <img src="${fotoProdotto}" alt="${testoScarico("Preview")}" class="product-thumb">
                <div>
                    <strong>${EatCategorie.escape(p.nome || testoScarico("Unnamed product"))}</strong><br>
                    <small>${EatCategorie.escape(p.categoria)}${p.sottocategoria ? ' → ' + EatCategorie.escape(p.sottocategoria) : ''}</small><br>
                    <small style="color: var(--text-muted)">📍 ${p.ubicazione ? EatCategorie.escape(p.ubicazione) : `<span style="color:#e74c3c;">${testoScarico("Unassigned")}</span>`}${dettaglioPezzi} | ⏳ ${testoScarico("Remaining:")} ${p.percentuale ?? 100}%</small>
                    ${EatPromemoria.html(p)}
                </div>
            </div>
            <div class="actions-group">
                <button class="btn-modifica" onclick="apriModalModifica(${index})">📌 ${testoScarico("Notes and reminders")}</button>
                ${n > 1 ? `<button class="btn-modifica" onclick="apriModalSpostaPezzi(${index})">📦 ${testoScarico("Move items")}</button>` : ''}
                <button class="btn-parziale" onclick="apriModalVisual(${index})">${testoScarico("Partial use")}</button>
                <button class="btn-esaurito" onclick="segnaEsauritoDiretto(${index})">${testoScarico("Remove items")}</button>
            </div>
        </div>
    `;}).join('');
}

function apriModalModifica(index) {
    const p = dispensaGlobale[index];
    if (!p) return;
    indiceModificaAttuale = index;
    document.getElementById('modNomeProdotto').textContent = p.nome || testoScarico("Unnamed product");
    document.getElementById('modEditNote').value = p.note || '';
    document.getElementById('modDestinazione').value = p.promemoria?.destinazione || '';
    document.getElementById('modDataEvento').value = p.promemoria?.data_evento || '';
    document.getElementById('modAnticipoEvento').value = p.promemoria?.anticipo_giorni ?? '';
    aggiornaConflittoEvento();
    const conflitto = EatPromemoria.conflitto(p, document.getElementById('modDataEvento').value);
    document.getElementById('modConfermaEvento').checked = p.promemoria?.conferma_oltre_scadenza === true &&
        p.promemoria?.scadenza_confermata === conflitto.scadenza &&
        p.promemoria?.evento_confermato === document.getElementById('modDataEvento').value;
    document.getElementById('modalModificaScheda').style.display = 'flex';
}

function aggiornaConflittoEvento() {
    const p = dispensaGlobale[indiceModificaAttuale];
    if (!p) return;
    const confronto = EatPromemoria.conflitto(p, document.getElementById('modDataEvento').value);
    document.getElementById('modAvvisoEvento').hidden = !confronto.testo;
    document.getElementById('modTestoAvvisoEvento').textContent = confronto.testo;
    document.getElementById('modConfermaEventoLabel').style.display = confronto.oltre ? 'block' : 'none';
    document.getElementById('modConfermaEvento').checked = false;
}

function chiudiModalModifica() {
    document.getElementById('modalModificaScheda').style.display = 'none';
    indiceModificaAttuale = null;
}

function salvaModificaScheda() {
    const p = dispensaGlobale[indiceModificaAttuale];
    if (!p || indiceModificaAttuale === null) return;
    const risultato = EatPromemoria.valida(document.getElementById('modDestinazione').value,
        document.getElementById('modDataEvento').value, document.getElementById('modAnticipoEvento').value);
    if (risultato.errore) { alert(risultato.errore); return; }
    const memo = risultato.promemoria;
    const confronto = EatPromemoria.conflitto(p, memo?.data_evento);
    if (confronto.oltre && !document.getElementById('modConfermaEvento').checked) {
        alert(testoScarico("Read the date warning and tick the box if you still want to reserve this product."));
        return;
    }
    if (memo) {
        memo.conferma_oltre_scadenza = confronto.oltre && document.getElementById('modConfermaEvento').checked;
        memo.scadenza_confermata = confronto.oltre ? confronto.scadenza : null;
        memo.evento_confermato = confronto.oltre ? memo.data_evento : null;
    }
    const aggiornata = [...dispensaGlobale];
    aggiornata[indiceModificaAttuale] = {...p, note: document.getElementById('modEditNote').value.trim(), promemoria: memo};
    try {
        if (!EatStorico.coerente('eat_dispensa_locale', dispensaGlobale)) throw Error('La dispensa è cambiata: ricarica la pagina.');
        const attesa = localStorage.getItem('eat_dispensa_locale');
        const risultatoStorico = EatStorico.registra('Note e promemoria', `Notes and reminders for ${p.nome}`, {eat_dispensa_locale: aggiornata}, {eat_dispensa_locale: attesa});
        aggiornata.splice(0, aggiornata.length, ...risultatoStorico.eat_dispensa_locale);
    } catch (errore) {
        alert(testoScarico("Notes and reminders not saved. ") + erroreScarico(errore.message));
        return;
    }
    dispensaGlobale = aggiornata;
    chiudiModalModifica();
    filtraDispensa();
}

function segnaEsauritoDiretto(index) {
    const prod = dispensaGlobale[index];
    if (!prod) return;
    indiceScaricoPezzi = index;
    document.getElementById('infoScaricoPezzi').textContent = `${prod.nome || testoScarico('Product name')} — ${prod.ubicazione || testoScarico("unassigned location")} — ${pezziDisponibili(prod)} ${testoScarico("items available")}`;
    const campo = document.getElementById('quantitaPezziScarico');
    campo.value = '';
    campo.max = String(pezziDisponibili(prod));
    document.getElementById('modalScaricoPezzi').style.display = 'flex';
    campo.focus();
}

function chiudiScaricoPezzi() {
    document.getElementById('modalScaricoPezzi').style.display = 'none';
    indiceScaricoPezzi = null;
}

let risolviRiepilogoScarico = null;
let focusPrimaRiepilogoScarico = null;

function chiediConfermaScarico(testo, prodotto) {
    if (risolviRiepilogoScarico) return Promise.resolve(false);
    const richiamo = document.getElementById('riepilogoScaricoRichiamo');
    richiamo.innerHTML = EatPromemoria.html(prodotto);
    richiamo.hidden = !richiamo.innerHTML;
    document.getElementById('riepilogoScaricoTesto').textContent = testo;
    focusPrimaRiepilogoScarico = document.activeElement;
    document.getElementById('modalRiepilogoScarico').style.display = 'flex';
    return new Promise(resolve => {
        risolviRiepilogoScarico = resolve;
        document.getElementById('riepilogoScaricoAnnulla').focus();
    });
}

function concludiRiepilogoScarico(conferma) {
    if (!risolviRiepilogoScarico) return;
    const risolvi = risolviRiepilogoScarico;
    risolviRiepilogoScarico = null;
    document.getElementById('modalRiepilogoScarico').style.display = 'none';
    focusPrimaRiepilogoScarico?.focus();
    risolvi(conferma === true);
}

function tastieraRiepilogoScarico(evento) {
    if (evento.key === 'Escape') {
        evento.preventDefault();
        concludiRiepilogoScarico(false);
    } else if (evento.key === 'Tab') {
        const annulla = document.getElementById('riepilogoScaricoAnnulla');
        const conferma = document.getElementById('riepilogoScaricoConferma');
        if (evento.shiftKey && document.activeElement === annulla) { evento.preventDefault(); conferma.focus(); }
        else if (!evento.shiftKey && document.activeElement === conferma) { evento.preventDefault(); annulla.focus(); }
    }
}

async function confermaNumeroPezziScarico() {
    const p = dispensaGlobale[indiceScaricoPezzi];
    if (!p) return;
    const disponibili = pezziDisponibili(p);
    const campo = document.getElementById('quantitaPezziScarico');
    if (campo.value.trim() === '') { alert(testoScarico("Enter the quantity before continuing.")); return; }
    const quanti = Number(campo.value);
    if (!Number.isSafeInteger(quanti) || quanti < 1 || quanti > disponibili) {
        alert(messaggioScarico("range", {max: disponibili}, `Enter a whole number from 1 to ${disponibili}.`)); return;
    }
    const rimanenti = disponibili - quanti;
    const riordina = rimanenti === 0 && !p.origine_confezione;
    const riordino = riordina ? `YES: one pack of ${Number(p.pezzi_per_confezione) || 1} ${Number(p.pezzi_per_confezione) === 1 ? 'item' : 'items'}.` : 'NO';
    const riepilogo = messaggioScarico("removal", {name: p.nome, location: p.ubicazione || testoScarico("Not specified"), available: disponibili, removed: quanti, left: rimanenti, shopping: riordina ? messaggioScarico("yes", {n: Number(p.pezzi_per_confezione) || 1}, riordino) : messaggioScarico("no", {}, riordino)}, `REMOVAL SUMMARY\n\nProduct: ${p.nome}\nLocation: ${p.ubicazione || testoScarico("Not specified")}\nAvailable: ${disponibili} ${disponibili === 1 ? 'item' : 'items'}\nTo remove: ${quanti} ${quanti === 1 ? 'item' : 'items'}\nRemaining: ${rimanenti} ${rimanenti === 1 ? 'item' : 'items'}\nAdd to shopping list: ${riordino}\n\nConfirm and save?`);
    const indice = indiceScaricoPezzi;
    const statoProdotto = JSON.stringify(p);
    const statoSalvato = localStorage.getItem('eat_dispensa_locale');
    if (!await chiediConfermaScarico(riepilogo, p)) return;
    if (indiceScaricoPezzi !== indice || dispensaGlobale[indice] !== p || JSON.stringify(p) !== statoProdotto || localStorage.getItem('eat_dispensa_locale') !== statoSalvato) {
        alert(testoScarico("The inventory changed while the summary was open. Check it again before removing items."));
        chiudiScaricoPezzi();
        await caricaDispensaCombinata();
        return;
    }
    if (!memorizzaPrimaDiScaricare(`Remove ${quanti} ${quanti === 1 ? 'item' : 'items'} of ${p.nome}`)) return;
    if (rimanenti === 0) {
        if (riordina) spostaInListaSpesa(p);
        dispensaGlobale.splice(indiceScaricoPezzi, 1);
    } else {
        p.pezzi_rimanenti = rimanenti;
        p.quantita = Math.ceil(rimanenti / Math.max(1, Number(p.pezzi_per_confezione) || 1));
    }
    if (!salvaDispensaAggiornata()) return;
    chiudiScaricoPezzi();
    popolaFiltri();
    filtraDispensa();
}

function apriModalSpostaPezzi(index) {
    const p = dispensaGlobale[index];
    if (!p || pezziDisponibili(p) < 2) return;
    indiceSpostamento = index;
    document.getElementById('titoloSpostaPezzi').textContent = p.nome || testoScarico('Product name');
    document.getElementById('riepilogoSpostaPezzi').textContent = `${pezziDisponibili(p)} ${testoScarico("items available")} — ${p.ubicazione || testoScarico("unspecified location")}`;
    const input = document.getElementById('numeroPezziDaSpostare');
    input.max = String(pezziDisponibili(p));
    input.value = '1';
    document.getElementById('destinazioneSpostaPezzi').value = '';
    EatUbicazioni.suggerisci('ubicazioni-scarico', dispensaGlobale);
    const scelte = document.getElementById('scelteDestinazioneSposta');
    scelte.replaceChildren();
    EatUbicazioni.elenco(dispensaGlobale).filter(nome => nome.trim().toLocaleLowerCase('it') !== String(p.ubicazione || '').trim().toLocaleLowerCase('it')).forEach(nome => {
        const scelta = document.createElement('button');
        scelta.type = 'button';
        scelta.textContent = nome;
        scelta.setAttribute('aria-pressed', 'false');
        scelta.style.cssText = 'flex:none;width:100%;min-height:36px;padding:5px 10px;font-size:15px;line-height:1.3;text-align:left;white-space:normal;overflow-wrap:anywhere;background:#21262d;color:#f0f6fc;border:1px solid #586475;border-radius:6px;cursor:pointer';
        scelta.onclick = () => {
            document.getElementById('destinazioneSpostaPezzi').value = nome;
            evidenziaDestinazioneSposta(nome);
        };
        scelte.appendChild(scelta);
    });
    document.getElementById('destinazioneSpostaPezzi').oninput = event => evidenziaDestinazioneSposta(event.target.value);
    document.getElementById('modalSpostaPezzi').style.display = 'flex';
}

function evidenziaDestinazioneSposta(nome) {
    for (const scelta of document.getElementById('scelteDestinazioneSposta').children) {
        const selezionata = scelta.textContent === nome;
        scelta.setAttribute('aria-pressed', String(selezionata));
        scelta.style.background = selezionata ? '#1f5285' : '#21262d';
        scelta.style.borderColor = selezionata ? '#79c0ff' : '#586475';
    }
}

function chiudiModalSpostaPezzi() {
    document.getElementById('modalSpostaPezzi').style.display = 'none';
    indiceSpostamento = null;
}

function confermaSpostaPezzi() {
    const p = dispensaGlobale[indiceSpostamento];
    if (!p) return;
    const disponibili = pezziDisponibili(p);
    const numero = Number(document.getElementById('numeroPezziDaSpostare').value);
    const destinazione = EatUbicazioni.canonica(document.getElementById('destinazioneSpostaPezzi').value, dispensaGlobale);
    if (!Number.isSafeInteger(numero) || numero < 1 || numero > disponibili) {
        alert(messaggioScarico("range", {max: disponibili}, `Enter a whole number from 1 to ${disponibili}.`)); return;
    }
    if (!destinazione || destinazione.toLowerCase() === String(p.ubicazione || '').toLowerCase()) {
        alert(testoScarico("Enter a location different from the current one.")); return;
    }
    if (!confirm(messaggioScarico("move", {n: numero, name: p.nome, from: p.ubicazione, to: destinazione}, `Move ${numero} ${numero === 1 ? 'item' : 'items'} of "${p.nome}" from ${p.ubicazione} to ${destinazione}?`))) return;
    if (!memorizzaPrimaDiScaricare(messaggioScarico("move", {n: numero, name: p.nome, from: p.ubicazione, to: destinazione}, `Move ${numero} ${numero === 1 ? 'item' : 'items'} of ${p.nome}: ${p.ubicazione} → ${destinazione}`), 'Spostamento')) return;
    if (!EatUbicazioni.ricorda([destinazione], dispensaGlobale)) return;
    const origine = p.ubicazione;
    const rimanenti = disponibili - numero;
    const copia = { ...p, _emf_id: EatStorico.nuovoId(), ubicazione: destinazione, quantita: numero, pezzi_per_confezione: 1, pezzi_rimanenti: numero, data_spostamento: new Date().toISOString(), origine_confezione: p.origine_confezione || origine };
    // Una confezione parzialmente svuotata conserva il formato originale.
    if (rimanenti === 0) {
        dispensaGlobale.splice(indiceSpostamento, 1);
        // Lista della spesa: si riordina quando termina la scorta nella posizione d'origine.
        if (!p.origine_confezione) spostaInListaSpesa(p);
    } else {
        p.pezzi_rimanenti = rimanenti;
        p.quantita = Math.ceil(rimanenti / Math.max(1, Number(p.pezzi_per_confezione) || 1));
    }
    dispensaGlobale.push(copia);
    if (!salvaDispensaAggiornata()) return;
    chiudiModalSpostaPezzi();
    popolaFiltri();
    filtraDispensa();
}

function spostaInListaSpesa(prod) {
    if (!operazioneInCorso) throw Error('Operazione non preparata.');
    const formato = Number(prod.pezzi_per_confezione) || 1;
    const voceAcquisto = formato > 1 ? `${prod.nome} — pack of ${formato} ${formato === 1 ? 'item' : 'items'}` : prod.nome;
    const spesa = EatStorico.leggi('eat_spesa_locale');
    const lista = EatStorico.leggi('eat_lista_spesa_v1');
    for (const [chiave, righe] of [['eat_spesa_locale', spesa], ['eat_lista_spesa_v1', lista]]) {
        const prodottoChiave = EatStorico.chiaveProdotto(prod);
        const esistente = righe.find(s => s.prodotto_chiave === prodottoChiave || s.nome === voceAcquisto);
        if (esistente) {
            operazioneInCorso.riferimenti.push({chiave, id: esistente._emf_id});
            if (chiave === 'eat_lista_spesa_v1') Object.assign(esistente, {nome: voceAcquisto, tipo: 'esaurito', checked: false, prodotto_chiave: prodottoChiave});
            else esistente.stato = 'esaurito';
        }
        else if (chiave === 'eat_spesa_locale') righe.push({nome: voceAcquisto, categoria: prod.categoria || 'General', quantita: 1, stato: 'esaurito'});
        else righe.push({id: Date.now() + Math.floor(Math.random() * 100000), nome: voceAcquisto, tipo: 'esaurito', checked: false, prodotto_chiave: prodottoChiave});
        operazioneInCorso.aggiornamenti[chiave] = righe;
    }
}

function apriModalVisual(index) {
    prodottoSelezionato = dispensaGlobale[index];
    if (!prodottoSelezionato) return;

    prodottoSelezionato.indiceGlobale = index;
    percentualeAttuale = prodottoSelezionato.percentuale || 100;

    // Su prodotti multipli il consumo parziale riguarda un pezzo solo.
    const scelta = document.getElementById('sceltaPezzoParziale');
    scelta.style.display = pezziDisponibili(prodottoSelezionato) > 1 ? 'block' : 'none';

    document.getElementById('modalNomeProdotto').innerText = prodottoSelezionato.nome || testoScarico("Unnamed product");
    document.getElementById('modalUbicazioneAttuale').innerText = messaggioScarico("location", {location: prodottoSelezionato.ubicazione || testoScarico("Not specified")}, `Current location: ${prodottoSelezionato.ubicazione || testoScarico("Not specified")}`);
    document.getElementById('levelSlider').value = percentualeAttuale;

    popolaUbicazioniModal(prodottoSelezionato.ubicazione);
    disegnaFormaSVG(prodottoSelezionato.forma || 'cilindro_verticale', percentualeAttuale);
    aggiornaEtichette(percentualeAttuale);

    document.getElementById('modalScaricoVisual').style.display = 'flex';
}

function popolaUbicazioniModal(ubicazioneCorrente) {
    const select = document.getElementById('nuovaUbicazioneSelect');
    const inputCustom = document.getElementById('inputNuovaUbicazioneCustom');
    inputCustom.style.display = 'none';
    inputCustom.value = '';

    EatUbicazioni.popolaSelect(select, ubicazioneCorrente, testoScarico("Keep in: "), dispensaGlobale);
}

function verificaNuovaUbicazione(valore) {
    const inputCustom = document.getElementById('inputNuovaUbicazioneCustom');
    if (valore === 'ALTRO') {
        inputCustom.style.display = 'block';
        inputCustom.focus();
    } else {
        inputCustom.style.display = 'none';
        inputCustom.value = '';
    }
}

function disegnaFormaSVG(forma, percentuale) {
    const container = document.getElementById('shapeContainer');
    const hVerde = (percentuale / 100) * 140;
    const hRosso = 140 - hVerde;

    if (forma === 'cilindro_verticale' || forma === 'parallelepipedo' || !forma) {
        container.innerHTML = `
            <svg width="100" height="160" viewBox="0 0 100 160" class="shape-canvas" onclick="gestisciClickAltezza(event)">
                <rect x="15" y="10" width="70" height="140" rx="8" fill="#e74c3c" />
                <rect x="15" y="${10 + hRosso}" width="70" height="${hVerde}" rx="0" fill="#2ecc71" />
                <rect x="15" y="10" width="70" height="140" rx="8" fill="none" stroke="#ffffff" stroke-width="3" />
            </svg>
        `;
    } else if (forma === 'cilindro_orizzontale') {
        const wVerde = (percentuale / 100) * 160;
        container.innerHTML = `
            <svg width="180" height="90" viewBox="0 0 180 90" class="shape-canvas" onclick="gestisciClickLarghezza(event)">
                <rect x="10" y="20" width="160" height="50" rx="25" fill="#e74c3c" />
                <rect x="10" y="20" width="${wVerde}" height="50" rx="0" fill="#2ecc71" />
                <rect x="10" y="20" width="160" height="50" rx="25" fill="none" stroke="#ffffff" stroke-width="3" />
            </svg>
        `;
    } else if (forma === 'forma_circolare') {
        const angolo = (percentuale / 100) * 360;
        const rad = (angolo - 90) * (Math.PI / 180);
        const x = 70 + 60 * Math.cos(rad);
        const y = 70 + 60 * Math.sin(rad);
        const largeArc = angolo > 180 ? 1 : 0;

        container.innerHTML = `
            <svg width="140" height="140" viewBox="0 0 140 140" class="shape-canvas">
                <circle cx="70" cy="70" r="60" fill="#e74c3c" stroke="#ffffff" stroke-width="3" />
                ${percentuale > 0 ? `
                <path d="M 70 70 L 70 10 A 60 60 0 ${largeArc} 1 ${x} ${y} Z" fill="#2ecc71" />
                ` : ''}
            </svg>
        `;
    }
}

function gestisciClickAltezza(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    let p = Math.round(100 - ((clickY / rect.height) * 100));
    p = Math.max(0, Math.min(100, p));
    document.getElementById('levelSlider').value = p;
    aggiornaLivelloVisivo(p);
}

function gestisciClickLarghezza(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let p = Math.round((clickX / rect.width) * 100);
    p = Math.max(0, Math.min(100, p));
    document.getElementById('levelSlider').value = p;
    aggiornaLivelloVisivo(p);
}

function aggiornaLivelloVisivo(valore) {
    percentualeAttuale = parseInt(valore);
    disegnaFormaSVG(prodottoSelezionato.forma || 'cilindro_verticale', percentualeAttuale);
    aggiornaEtichette(percentualeAttuale);
}

function aggiornaEtichette(p) {
    document.getElementById('lblRimanente').innerText = p + '%';
    document.getElementById('lblConsumato').innerText = (100 - p) + '%';
}

function chiudiModalScarico() {
    document.getElementById('modalScaricoVisual').style.display = 'none';
}

async function confermaScaricoEffettivo() {
    const idx = prodottoSelezionato.indiceGlobale;
    if (idx !== undefined && dispensaGlobale[idx]) {
        const selectVal = document.getElementById('nuovaUbicazioneSelect').value;
        let nuovaUbicazione = dispensaGlobale[idx].ubicazione;

        if (selectVal === 'ALTRO') {
            const customVal = document.getElementById('inputNuovaUbicazioneCustom').value.trim();
            if (customVal !== "") {
                nuovaUbicazione = customVal;
            }
        } else if (selectVal !== "") {
            nuovaUbicazione = selectVal;
        }

        const msg = percentualeAttuale <= 0
            ? (pezziDisponibili(dispensaGlobale[idx]) > 1 ? messaggioScarico("one", {name: dispensaGlobale[idx].nome}, `Confirm using ONE whole item of "${dispensaGlobale[idx].nome}"?`) : messaggioScarico("zero", {name: dispensaGlobale[idx].nome}, `The product "${dispensaGlobale[idx].nome}" has reached 0% and will be treated as used up. Confirm and add it to the shopping list?`))
            : messaggioScarico("partial", {name: dispensaGlobale[idx].nome, value: percentualeAttuale, location: nuovaUbicazione}, `Update "${dispensaGlobale[idx].nome}" to ${percentualeAttuale}% remaining in "${nuovaUbicazione}"?`);

        const statoProdotto = JSON.stringify(dispensaGlobale[idx]);
        const statoSalvato = localStorage.getItem('eat_dispensa_locale');
        if (!await chiediConfermaScarico(msg, dispensaGlobale[idx])) return;
        if (JSON.stringify(dispensaGlobale[idx]) !== statoProdotto || localStorage.getItem('eat_dispensa_locale') !== statoSalvato) {
            alert(testoScarico("The inventory changed while the summary was open. Check it again before removing items."));
            chiudiModalScarico();
            await caricaDispensaCombinata();
            return;
        }
        if (!memorizzaPrimaDiScaricare(`Use of ${dispensaGlobale[idx].nome}: from ${dispensaGlobale[idx].percentuale ?? 100}% to ${percentualeAttuale}%`, 'Consumo parziale')) return;

        nuovaUbicazione = EatUbicazioni.canonica(nuovaUbicazione, dispensaGlobale);
        if (!EatUbicazioni.ricorda([nuovaUbicazione], dispensaGlobale)) return;
        const pezzi = pezziDisponibili(dispensaGlobale[idx]);
        if (pezzi > 1 && percentualeAttuale < 100 && percentualeAttuale > 0) {
            const singolo = { ...dispensaGlobale[idx], _emf_id: EatStorico.nuovoId(), quantita: 1, pezzi_per_confezione: 1, pezzi_rimanenti: 1, percentuale: percentualeAttuale, ubicazione: nuovaUbicazione, origine_confezione: dispensaGlobale[idx].origine_confezione || dispensaGlobale[idx].ubicazione };
            dispensaGlobale[idx].pezzi_rimanenti = pezzi - 1;
            dispensaGlobale[idx].quantita = Math.ceil((pezzi - 1) / Math.max(1, Number(dispensaGlobale[idx].pezzi_per_confezione) || 1));
            dispensaGlobale.push(singolo);
        } else if (pezzi > 1 && percentualeAttuale === 0) {
            dispensaGlobale[idx].pezzi_rimanenti = pezzi - 1;
            dispensaGlobale[idx].quantita = Math.ceil((pezzi - 1) / Math.max(1, Number(dispensaGlobale[idx].pezzi_per_confezione) || 1));
        } else {
            dispensaGlobale[idx].percentuale = percentualeAttuale;
            dispensaGlobale[idx].ubicazione = nuovaUbicazione;
        }

        if (percentualeAttuale <= 0 && pezzi === 1) {
            if (!dispensaGlobale[idx].origine_confezione) spostaInListaSpesa(dispensaGlobale[idx]);
            dispensaGlobale.splice(idx, 1);
        }

        if (!salvaDispensaAggiornata()) return;
        chiudiModalScarico();
        popolaFiltri();
        filtraDispensa();
    }
}
