(() => {
    'use strict';

    const lingua = document.documentElement.lang;
    const fr = lingua === 'fr';
    const es = lingua === 'es';
    const pt = lingua === 'pt-BR';
    const de = lingua === 'de';
    const ja = lingua === 'ja';
    const ar = lingua === 'ar';
    const dizionario = ar ? window.OrtoFirstArabic : ja ? window.OrtoFirstJapanese : de ? window.OrtoFirstGerman : pt ? window.OrtoFirstPortuguese : es ? window.OrtoFirstSpanish : fr ? window.OrtoFirstFrench : lingua === 'en' ? window.OrtoFirstEnglish : null;
    const trad = testo => dizionario?.[testo] ?? testo;
    const cifre = testo => testo.normalize('NFKC').replace(/[٠-٩۰-۹]/g, carattere => String(carattere.charCodeAt(0) & 15)).replace(/٫/g, '.');
    const mostraCategoria = categoria => trad(categoria);

    const key = 'eat_dispensa_orto_it_v1';
    const scorta = document.getElementById('orto-scorta');
    const acquisto = document.getElementById('orto-acquisto');
    const scarico = document.getElementById('orto-scarico');
    const cerca = document.getElementById('orto-cerca');
    const mezza = document.getElementById('orto-mezza');
    const finito = document.getElementById('orto-finito');
    const salvaScarico = document.getElementById('orto-salva-scarico');
    const pezziScarico = document.getElementById('orto-pezzi-scarico');
    const restoLibero = document.getElementById('orto-resto-libero');
    const usatiCampo = scarico.elements['pezzi-usati'];
    const cursore = scarico.elements.percentuale;
    const tipoParziale = scarico.elements['tipo-parziale'];
    const postoParziale = scarico.elements['posto-parziale-orto'];
    const bloccoLivello = document.getElementById('orto-livello');
    const bloccoTipo = document.getElementById('orto-riduzione-tipo');
    const bloccoPostoParziale = document.getElementById('orto-posto-parziale');
    const forma = document.getElementById('orto-forma');
    const rimanente = document.getElementById('orto-rimanente');
    const consumato = document.getElementById('orto-consumato');
    const oggettoLivello = document.getElementById('orto-oggetto-livello');
    const avvisoProva = document.getElementById('orto-prova-attiva');
    const parziale = document.getElementById('orto-parziale');
    const cambioPosto = document.getElementById('orto-cambio-posto');
    const apriParziale = document.getElementById('orto-apri-parziale');
    const apriSposta = document.getElementById('orto-apri-sposta');
    const quantitaAttuale = document.getElementById('orto-quantita-attuale');
    const listaScorte = document.getElementById('orto-scorte');
    const listaAcquisti = document.getElementById('orto-acquisti');
    const statoScorta = document.getElementById('orto-stato-scorta');
    const statoAcquisto = document.getElementById('orto-stato-acquisto');
    const statoScarico = document.getElementById('orto-stato-scarico');
    const campiScorta = ['barcode', 'nome', 'categoria', 'quantita', 'ubicazione', 'scadenza', 'note'];
    const campoScorta = nome => scorta.elements[nome === 'ubicazione' ? 'conservazione-orto' : nome];
    const postoScarico = scarico.elements['posto-orto'];
    const posti = document.getElementById('orto-posti');
    const codiceCampo = scorta.elements.barcode;
    const esitoCodice = document.getElementById('orto-esito-barcode');
    const dialogoScanner = document.getElementById('orto-scanner');
    let ricerca;
    let scanner;
    let avvioScanner = false;
    let scorte = [];
    let prova = null;

    const viste = [...document.querySelectorAll('[data-orto-vista]')];
    const guida = document.getElementById('orto-guida');
    const guidaTitolo = document.getElementById('orto-guida-titolo');
    const guidaTesto = document.getElementById('orto-guida-testo');
    for (const pulsante of document.querySelectorAll('[data-guida-titolo]')) {
        pulsante.addEventListener('click', () => {
            guidaTitolo.textContent = pulsante.dataset.guidaTitolo;
            guidaTesto.textContent = pulsante.dataset.guidaTesto;
            guida.showModal();
        });
    }
    function cambiaVista() {
        const hash = location.hash.slice(1);
        const richiesta = hash === 'dispensa-orto' ? 'inventario' : hash === 'agenda-attivita' ? 'agenda' : hash;
        const attiva = viste.find(vista => vista.id === richiesta)?.id ?? 'home';
        const agenda = attiva === 'agenda' || attiva.startsWith('agenda-');
        if (agenda && prova) terminaProva();
        for (const vista of viste) vista.hidden = vista.id !== attiva;
        for (const link of document.querySelectorAll('.orto-nav a')) {
            if (link.hash === (agenda ? '#agenda' : '#' + attiva)) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        for (const link of document.querySelectorAll('.orto-lingue a')) link.hash = attiva === 'home' ? '' : attiva;
    }

    function leggi() {
        if (prova) return prova;
        const stato = JSON.parse(localStorage.getItem(key) ?? '{"scorte":[],"acquisti":[]}');
        if (!Array.isArray(stato?.scorte) || !Array.isArray(stato?.acquisti)) throw new Error(trad('Formato non valido'));
        return stato;
    }

    function aggiorna(mutazione, stato, messaggio) {
        try {
            const dati = leggi();
            mutazione(dati);
            if (!prova) localStorage.setItem(key, JSON.stringify(dati));
            mostra(dati);
            stato.textContent = messaggio;
            return true;
        } catch {
            stato.textContent = trad('Il browser non è riuscito a salvare i dati dell’orto.');
            return false;
        }
    }

    function annullaRicerca() {
        ricerca?.abort();
        esitoCodice.textContent = '';
    }

    async function cercaCodice() {
        annullaRicerca();
        const codice = cifre(codiceCampo.value).replace(/\s+/g, '');
        if (!/^\d{8,14}$/.test(codice)) {
            esitoCodice.textContent = trad('Inserisci un codice numerico da 8 a 14 cifre, mantenendo gli zeri iniziali.');
            return;
        }
        codiceCampo.value = codice;
        const controller = new AbortController();
        ricerca = controller;
        const nomeIniziale = scorta.elements.nome.value;
        esitoCodice.textContent = trad('Ricerca negli archivi Open Facts…');
        try {
            const risultato = await EatRicercaProdotti.cerca(codice, controller.signal);
            if (controller.signal.aborted || codiceCampo.value !== codice) return;
            const nome = risultato.scheda?.nome;
            if (nome && scorta.elements.nome.value === nomeIniziale && !nomeIniziale.trim()) {
                scorta.elements.nome.value = nome.slice(0, 100);
                esitoCodice.textContent = trad('Nome suggerito dal catalogo. Verifica che corrisponda alla confezione prima di salvare.');
            } else if (nome) {
                esitoCodice.textContent = trad('Nome trovato negli archivi: ') + nome + trad('. Il nome inserito è rimasto nel campo.');
            } else {
                esitoCodice.textContent = risultato.stato === 'non_trovato'
                    ? trad('Codice non trovato. Puoi registrare il prodotto a mano.')
                    : trad('Ricerca non disponibile. Puoi registrare il prodotto a mano.');
            }
        } catch {
            if (!controller.signal.aborted) esitoCodice.textContent = trad('Ricerca non disponibile. Puoi registrare il prodotto a mano.');
        }
    }

    async function fermaScanner() {
        if (!scanner?.isScanning) return;
        try { await scanner.stop(); } catch { /* Il browser può avere già chiuso la fotocamera. */ }
    }

    document.getElementById('orto-leggi-barcode').addEventListener('click', async () => {
        if (avvioScanner || dialogoScanner.open) return;
        if (typeof Html5Qrcode !== 'function') {
            esitoCodice.textContent = trad('Scanner non disponibile. Puoi digitare il codice a barre.');
            return;
        }
        avvioScanner = true;
        dialogoScanner.showModal();
        try {
            scanner ??= new Html5Qrcode('orto-scanner-camera');
            await scanner.start({facingMode: 'environment'}, {
                fps: 10,
                qrbox: (larghezza, altezza) => ({
                    width: Math.floor(larghezza * 0.9),
                    height: Math.floor(altezza * 0.45)
                })
            }, codice => {
                if (!dialogoScanner.open || !/^\d{8,14}$/.test(codice)) return;
                codiceCampo.value = codice;
                dialogoScanner.close();
                cercaCodice();
            }, () => {});
            if (!dialogoScanner.open) await fermaScanner();
        } catch {
            if (dialogoScanner.open) dialogoScanner.close();
            esitoCodice.textContent = trad('Fotocamera non disponibile. Puoi digitare il codice a barre.');
        } finally {
            avvioScanner = false;
        }
    });
    document.getElementById('orto-chiudi-scanner').addEventListener('click', () => dialogoScanner.close());
    dialogoScanner.addEventListener('close', fermaScanner);
    document.getElementById('orto-cerca-barcode').addEventListener('click', cercaCodice);
    codiceCampo.addEventListener('input', annullaRicerca);
    codiceCampo.addEventListener('keydown', evento => {
        if (evento.key !== 'Enter') return;
        evento.preventDefault();
        cercaCodice();
    });

    function noteProdotto(voce) {
        return [voce.note, voce.semina && trad('Destinazione di semina: ') + voce.semina].filter(Boolean).join('\n');
    }
    const haPezzi = voce => Number.isSafeInteger(voce?.pezziRimasti);
    const quantitaProdotto = voce => haPezzi(voce)
        ? voce.pezziRimasti + (voce.pezziRimasti === 1 ? trad(' pezzo') : trad(' pezzi')) +
            (voce.livelloPezzo != null ? trad(' · uno al ') + voce.livelloPezzo + '%' : '')
        : mostraQuantita(voce.quantita);

    function mostraQuantita(quantita) {
        if (!dizionario || !quantita) return quantita;
        const parole = ar ? {'mezza bustina': 'نصف كيس', 'mezza bottiglia': 'نصف زجاجة', 'una bustina': 'كيس واحد', 'una bottiglia': 'زجاجة واحدة'} :
            ja ? {'mezza bustina': '半袋', 'mezza bottiglia': '半ボトル', 'una bustina': '1袋', 'una bottiglia': '1本'} :
            de ? {'mezza bustina': 'Halbe Tüte', 'mezza bottiglia': 'Halbe Flasche', 'una bustina': 'Eine Tüte', 'una bottiglia': 'Eine Flasche'} :
            pt ? {'mezza bustina': 'Meio sachê', 'mezza bottiglia': 'Meia garrafa', 'una bustina': 'Um sachê', 'una bottiglia': 'Uma garrafa'} :
            es ? {'mezza bustina': 'Medio sobre', 'mezza bottiglia': 'Media botella', 'una bustina': 'Un sobre', 'una bottiglia': 'Una botella'} :
            fr ? {'mezza bustina': 'Demi-sachet', 'mezza bottiglia': 'Demi-bouteille', 'una bustina': 'Un sachet', 'una bottiglia': 'Une bouteille'} :
            {'mezza bustina': 'Half a packet', 'mezza bottiglia': 'Half a bottle', 'una bustina': 'One packet', 'una bottiglia': 'One bottle'};
        const testo = quantita.toLowerCase();
        if (parole[testo]) return parole[testo];
        const formato = testo.match(/^(\d+(?:[.,]\d+)?)\s+(bustin[ae]|bottigli[ae])$/);
        if (!formato) return quantita;
        const numero = Number(formato[1].replace(',', '.'));
        const pacchetto = formato[2].startsWith('bustin');
        if (ar) return new Intl.NumberFormat(lingua, {useGrouping: false}).format(numero) + (pacchetto ? ' كيس' : ' زجاجة');
        if (ja) return new Intl.NumberFormat(lingua, {useGrouping: false}).format(numero) + (pacchetto ? '袋' : '本');
        const unita = pacchetto ? (pt ? 'sachê' : es ? 'sobre' : fr ? 'sachet' : 'packet') :
            (pt ? 'garrafa' : es ? 'botella' : fr ? 'bouteille' : 'bottle');
        if (de) {
            const sostantivo = pacchetto ? 'Tüte' : 'Flasche';
            return new Intl.NumberFormat(lingua, {useGrouping: false}).format(numero) + ' ' + sostantivo + (numero === 1 ? '' : 'n');
        }
        return new Intl.NumberFormat(lingua, {useGrouping: false}).format(numero) + ' ' + unita + (numero === 1 ? '' : 's');
    }

    function pulsante(testo, azione) {
        const elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.textContent = testo;
        elemento.addEventListener('click', azione);
        return elemento;
    }

    function riga(voce, dettagli) {
        const li = document.createElement('li');
        const nome = document.createElement('strong');
        nome.textContent = voce.nome;
        li.append(nome);
        const p = document.createElement('p');
        p.textContent = dettagli.filter(Boolean).join(' · ');
        if (p.textContent) li.append(p);
        return li;
    }

    function aggiungiAcquisto(nome, quantita) {
        return aggiorna(dati => {
            dati.acquisti.push({id: crypto.randomUUID(), nome, quantita, comprato: false});
        }, statoAcquisto, trad('Aggiunto alla lista acquisti.'));
    }

    const nomeAcquisto = voce => voce.nome.trim().toLocaleLowerCase('it');

    function suggerisciRiacquisto(dati, voce) {
        const altraScorta = dati.some(altra => altra.id !== voce.id &&
            (!haPezzi(altra) || altra.pezziRimasti > 0) &&
            (voce.barcode && altra.barcode ? voce.barcode === altra.barcode : nomeAcquisto(voce) === nomeAcquisto(altra)));
        return !altraScorta;
    }

    function registraEsaurito(dati, voce, riacquisto) {
        const aggiungi = riacquisto && suggerisciRiacquisto(dati.scorte, voce);
        dati.scorte = dati.scorte.filter(item => item.id !== voce.id);
        if (!aggiungi) return;
        const presente = dati.acquisti.find(item => nomeAcquisto(item) === nomeAcquisto(voce) && !item.comprato)
            ?? dati.acquisti.find(item => nomeAcquisto(item) === nomeAcquisto(voce));
        if (presente) {
            presente.comprato = false;
            presente.esaurito = true;
        } else {
            dati.acquisti.push({id: crypto.randomUUID(), nome: voce.nome, quantita: '', comprato: false, esaurito: true});
        }
    }

    function confermaEsaurito(voce, riacquisto) {
        return confirm(trad('Scaricare l’ultima quantità di «') + voce.nome + trad('»?\n\nLista della spesa: ') +
            (riacquisto ? trad('da ricomprare.') : trad('restano altre scorte.')));
    }

    function mostraAcquisti(acquisti) {
        listaAcquisti.replaceChildren();
        if (!acquisti.length) {
            const vuota = document.createElement('li');
            vuota.textContent = trad('La lista della spesa è vuota.');
            listaAcquisti.append(vuota);
            return;
        }
        for (const voce of [...acquisti].sort((a, b) => Number(Boolean(a.comprato)) - Number(Boolean(b.comprato)))) {
            const li = document.createElement('li');
            li.dataset.comprato = Boolean(voce.comprato);
            const etichetta = document.createElement('label');
            const spunta = document.createElement('input');
            spunta.type = 'checkbox';
            spunta.checked = Boolean(voce.comprato);
            spunta.addEventListener('change', () => {
                if (aggiorna(dati => {
                    const item = dati.acquisti.find(v => v.id === voce.id);
                    if (item) item.comprato = spunta.checked;
                }, statoAcquisto, spunta.checked ? trad('Articolo spuntato.') : trad('Articolo da comprare.'))) {
                    [...listaAcquisti.querySelectorAll('input')].find(input => input.value === voce.id)?.focus();
                } else {
                    spunta.checked = Boolean(voce.comprato);
                }
            });
            spunta.value = voce.id;
            const testo = [voce.nome, voce.quantita, voce.esaurito && !voce.comprato && trad('Esaurito')].filter(Boolean).join(' · ');
            etichetta.append(spunta, testo);
            const rimuovi = pulsante('×', () => {
                aggiorna(dati => { dati.acquisti = dati.acquisti.filter(item => item.id !== voce.id); }, statoAcquisto, trad('Voce rimossa.'));
            });
            rimuovi.setAttribute('aria-label', trad('Rimuovi ') + voce.nome);
            li.append(etichetta, rimuovi);
            listaAcquisti.append(li);
        }
    }

    function mostraInventario() {
        const query = cerca.value.trim().toLocaleLowerCase('it');
        const visibili = scorte.filter(voce => [voce.nome, voce.barcode, mostraCategoria(voce.categoria), voce.ubicazione, noteProdotto(voce)]
            .some(valore => valore?.toLocaleLowerCase('it').includes(query)));
        listaScorte.replaceChildren(...visibili.map(voce => riga(voce, [
            mostraCategoria(voce.categoria), quantitaProdotto(voce),
            haPezzi(voce) && trad('Formato originale: ') + voce.confezioni + ' × ' + voce.pezziPerConfezione,
            voce.ubicazione && trad('Conservazione: ') + voce.ubicazione,
            voce.barcode && trad('Codice: ') + voce.barcode,
            voce.scadenza && trad('Scadenza: ') + voce.scadenza.split('-').reverse().join('/'),
            noteProdotto(voce) && trad('Note: ') + noteProdotto(voce)
        ])));
        if (!visibili.length) {
            const li = document.createElement('li');
            li.textContent = query ? trad('Nessun prodotto corrisponde alla ricerca.') : trad('Nessun prodotto registrato. Comincia dal Carico.');
            listaScorte.append(li);
        }
    }

    function bustine(voce) {
        const testo = voce.quantita?.trim().toLocaleLowerCase('it');
        if (testo === '半袋' || testo === 'نصف كيس') return 0.5;
        if (testo === 'كيس واحد') return 1;
        if (['mezza bustina', 'half a packet', 'demi-sachet', 'un demi-sachet', 'medio sobre', 'meio sachê', 'halbe tüte', 'eine halbe tüte'].includes(testo)) return 0.5;
        if (['una bustina', 'one packet', 'un sachet', 'un sobre', 'um sachê', 'eine tüte'].includes(testo)) return 1;
        const numero = testo && cifre(testo).match(/^(\d+(?:[.,]\d+)?)\s*(?:bustin[ae]|packets?|sachets?|sobres?|sachês?|tüten?|袋|كيس|أكياس)$/)?.[1];
        return numero === undefined ? null : Number(numero.replace(',', '.'));
    }

    function confezioneParziale(voce, tipoScelto) {
        if (!voce || voce.categoria === 'Piantine') return null;
        const descrizione = [voce.nome, voce.quantita].join(' ').toLocaleLowerCase('it');
        const tipo = voce.tipoConfezione || (/\b(?:bottigli[ae]|flacon[ei]|bottles?|bouteilles?|botellas?|garrafas?|flaschen?)\b|ボトル|زجاجة|زجاجات/.test(descrizione) ? 'bottiglia'
            : (voce.categoria === 'Semi' || /\b(?:bustin[ae]|packets?|sachets?|sobres?|tüten?)\b|\bsachê(?:s\b|(?=\s|$))|種の袋|كيس|أكياس/.test(descrizione)) ? 'bustina' : tipoScelto);
        if (!tipo) return null;
        const testo = voce.quantita?.trim().toLocaleLowerCase('it');
        const bottiglie = testo && cifre(testo).match(/^(\d+(?:[.,]\d+)?)\s*(?:bottigli[ae]|flacon[ei]|bottles?|bouteilles?|botellas?|garrafas?|flaschen?|本|ボトル|زجاجة|زجاجات)$/)?.[1];
        const totale = haPezzi(voce) ? voce.pezziRimasti : (tipo === 'bustina' ? bustine(voce) :
            ['mezza bottiglia', 'half a bottle', 'demi-bouteille', 'une demi-bouteille', 'media botella', 'meia garrafa', 'halbe flasche', 'eine halbe flasche', '半ボトル', 'نصف زجاجة'].includes(testo) ? 0.5 :
                ['una bottiglia', 'one bottle', 'une bouteille', 'una botella', 'uma garrafa', 'eine flasche', 'زجاجة واحدة'].includes(testo) ? 1 :
                bottiglie === undefined ? null : Number(bottiglie.replace(',', '.')));
        if (!totale || !Number.isFinite(totale)) return null;
        const livello = haPezzi(voce) ? (voce.livelloPezzo ?? 100) : Math.round((totale % 1 || 1) * 100);
        return {tipo, totale, livello};
    }

    function aggiornaLivello() {
        const valore = Number(cursore.value);
        forma.style.setProperty('--livello', valore + '%');
        rimanente.textContent = valore + '%';
        consumato.textContent = (100 - valore) + '%';
    }

    function configuraParziale(voce) {
        const perPezzi = haPezzi(voce);
        const soloInteri = voce?.categoria === 'Piantine';
        const riconosciuta = confezioneParziale(voce);
        tipoParziale.options.namedItem('orto-tipo-automatico').hidden = !riconosciuta;
        for (const opzione of tipoParziale.options) {
            if (opzione.value === 'bottiglia' || opzione.value === 'bustina') opzione.hidden = Boolean(riconosciuta);
        }
        if (riconosciuta && tipoParziale.selectedOptions[0]?.hidden) tipoParziale.value = 'livello';
        if (!riconosciuta && tipoParziale.value === 'livello') tipoParziale.value = 'pezzi';
        const tipo = tipoParziale.value;
        const confezione = riconosciuta || (perPezzi && tipo !== 'pezzi' && confezioneParziale(voce, tipo));
        const mostraLivello = Boolean(confezione && (!perPezzi || tipo !== 'pezzi'));
        bloccoTipo.hidden = !perPezzi || soloInteri;
        bloccoLivello.hidden = !mostraLivello;
        bloccoPostoParziale.hidden = !mostraLivello;
        pezziScarico.hidden = !perPezzi || mostraLivello;
        restoLibero.hidden = perPezzi || mostraLivello;
        mezza.hidden = !mostraLivello || confezione.tipo !== 'bustina' || confezione.livello < 50;
        usatiCampo.disabled = pezziScarico.hidden || parziale.hidden;
        scarico.elements.resto.disabled = !voce || restoLibero.hidden;
        if (mostraLivello) {
            cursore.max = confezione.livello;
            cursore.value = confezione.livello;
            forma.dataset.forma = confezione.tipo;
            oggettoLivello.textContent = dizionario ? trad(confezione.tipo === 'bottiglia' ? 'Contents of one bottle' : 'Contents of one packet') : 'Contenuto di una ' + confezione.tipo;
            aggiornaLivello();
        }
    }

    function opzioneScarico(pannello) {
        parziale.hidden = pannello !== parziale;
        cambioPosto.hidden = pannello !== cambioPosto;
        apriParziale.setAttribute('aria-expanded', String(!parziale.hidden));
        apriSposta.setAttribute('aria-expanded', String(!cambioPosto.hidden));
        salvaScarico.disabled = !pannello || !scarico.elements.id.value;
        usatiCampo.disabled = parziale.hidden || pezziScarico.hidden;
    }

    function selezionaScarico() {
        const voce = scorte.find(item => item.id === scarico.elements.id.value);
        const perPezzi = haPezzi(voce);
        quantitaAttuale.hidden = !voce;
        quantitaAttuale.textContent = voce
            ? trad('Quantità attuale: ') + (quantitaProdotto(voce) || trad('non indicata')) + (voce.ubicazione ? trad(' · Conservazione: ') + voce.ubicazione : '')
            : '';
        usatiCampo.max = perPezzi ? voce.pezziRimasti : '';
        configuraParziale(voce);
        postoScarico.disabled = !voce;
        salvaScarico.disabled = !voce || (parziale.hidden && cambioPosto.hidden);
        finito.disabled = !voce;
        apriParziale.disabled = !voce;
        apriSposta.disabled = !voce;
        if (!voce) opzioneScarico(null);
    }

    function mostra(dati) {
        scorte = dati.scorte;
        const ubicazioni = [...new Set(scorte.map(voce => voce.ubicazione).filter(Boolean))];
        posti.replaceChildren(...ubicazioni.sort((a, b) => a.localeCompare(b, 'it')).map(ubicazione => new Option(ubicazione, ubicazione)));
        mostraInventario();
        const selezione = scarico.elements.id.value;
        scarico.elements.id.replaceChildren(new Option(trad('Scegli un prodotto'), ''), ...scorte.map(voce => {
            const confezione = confezioneParziale(voce);
            const aperta = confezione?.livello < 100 ? trad(' · aperta, ') + confezione.livello + '%' : '';
            return new Option(voce.nome + (voce.ubicazione ? ' · ' + voce.ubicazione : '') + aperta, voce.id);
        }));
        if (scorte.some(voce => voce.id === selezione)) scarico.elements.id.value = selezione;
        selezionaScarico();
        mostraAcquisti(dati.acquisti);
    }

    const riepilogo = document.getElementById('orto-riepilogo');
    const statoRiepilogo = document.getElementById('orto-riepilogo-stato');
    let prodottoDaSalvare;

    scorta.addEventListener('submit', evento => {
        evento.preventDefault();
        const voce = Object.fromEntries(campiScorta.map(nome => [nome, campoScorta(nome).value.trim()]));
        if (!voce.nome) return;
        voce.barcode = cifre(voce.barcode).replace(/\s+/g, '');
        if (voce.barcode && !/^\d{8,14}$/.test(voce.barcode)) {
            statoScorta.textContent = trad('Controlla il codice a barre o lascia il campo vuoto.');
            codiceCampo.focus();
            return;
        }
        voce.id = crypto.randomUUID();
        const confezioni = scorta.elements.confezioni.valueAsNumber;
        const pezzi = scorta.elements.pezzi.valueAsNumber;
        if (Number.isFinite(confezioni) !== Number.isFinite(pezzi)) {
            statoScorta.textContent = trad('Per usare le confezioni, compila entrambi i campi.');
            return;
        }
        if (Number.isSafeInteger(confezioni) && Number.isSafeInteger(pezzi)) {
            voce.confezioni = confezioni;
            voce.pezziPerConfezione = pezzi;
            voce.pezziRimasti = confezioni * pezzi;
        }
        apriRiepilogo(voce);
    });
    function apriRiepilogo(voce) {
        prodottoDaSalvare = voce;
        const elenco = document.getElementById('orto-riepilogo-dati');
        elenco.replaceChildren();
        const dettagli = [
            [trad('Prodotto'), voce.nome], [trad('Codice a barre'), voce.barcode], [trad('Categoria'), mostraCategoria(voce.categoria)],
            [trad('Quantità'), quantitaProdotto(voce)], [trad('Ubicazione'), voce.ubicazione],
            [trad('Scadenza'), voce.scadenza], [trad('Note'), noteProdotto(voce)]
        ];
        for (const [titolo, valore] of dettagli) {
            const termine = document.createElement('dt');
            const descrizione = document.createElement('dd');
            termine.textContent = titolo;
            descrizione.textContent = valore || '—';
            elenco.append(termine, descrizione);
        }
        statoRiepilogo.textContent = '';
        riepilogo.showModal();
    }
    document.getElementById('orto-conferma-prodotto').addEventListener('click', () => {
        if (!riepilogo.open) return;
        if (aggiorna(dati => {
            dati.scorte.push(prodottoDaSalvare);
        }, statoRiepilogo, trad('Prodotto salvato.'))) {
            riepilogo.close();
            annullaRicerca();
            scorta.reset();
            statoScorta.textContent = trad('Prodotto salvato.');
        }
    });
    cerca.addEventListener('input', mostraInventario);
    scarico.elements.id.addEventListener('change', () => {
        scarico.elements.resto.value = '';
        usatiCampo.value = '';
        postoScarico.value = '';
        postoParziale.value = '';
        tipoParziale.value = 'livello';
        statoScarico.textContent = '';
        opzioneScarico(null);
        selezionaScarico();
    });
    apriParziale.addEventListener('click', () => {
        opzioneScarico(parziale);
        (!bloccoLivello.hidden ? cursore : pezziScarico.hidden ? scarico.elements.resto : usatiCampo).focus();
    });
    apriSposta.addEventListener('click', () => {
        opzioneScarico(cambioPosto);
        postoScarico.focus();
    });
    scarico.addEventListener('submit', evento => {
        evento.preventDefault();
        if (!cambioPosto.hidden) {
            salvaSpostamento();
            return;
        }
        if (parziale.hidden) return;
        const id = scarico.elements.id.value;
        const prodotto = scorte.find(item => item.id === id);
        if (!bloccoLivello.hidden) {
            salvaLivello(Number(cursore.value));
            return;
        }
        if (haPezzi(prodotto)) {
            const usati = usatiCampo.valueAsNumber;
            if (!Number.isSafeInteger(usati) || usati < 1 || usati > prodotto.pezziRimasti) {
                statoScarico.textContent = trad('Indica quanti pezzi hai usato, entro la quantità disponibile.');
                return;
            }
            const esaurito = usati === prodotto.pezziRimasti;
            const riacquisto = esaurito && suggerisciRiacquisto(scorte, prodotto);
            if (esaurito && !confermaEsaurito(prodotto, riacquisto)) return;
            if (aggiorna(dati => {
                const voce = dati.scorte.find(item => item.id === id);
                if (!haPezzi(voce) || voce.pezziRimasti < usati) throw new Error(trad('Quantità insufficiente'));
                voce.pezziRimasti -= usati;
                if (!voce.pezziRimasti) registraEsaurito(dati, voce, riacquisto);
            }, statoScarico, riacquisto ? trad('Prodotto esaurito. Da ricomprare nella Lista della spesa.') : trad('Quantità rimanente aggiornata.'))) usatiCampo.value = '';
            return;
        }
        const resto = scarico.elements.resto.value.trim();
        if (!resto) {
            statoScarico.textContent = trad('Indica la quantità rimasta oppure usa «Scarica tutto».');
            return;
        }
        if (aggiorna(dati => {
            const voce = dati.scorte.find(item => item.id === id);
            if (!voce) throw new Error(trad('Scorta non trovata'));
            voce.quantita = resto;
        }, statoScarico, trad('Quantità rimanente aggiornata.'))) scarico.elements.resto.value = '';
    });
    function salvaLivello(valore) {
        const id = scarico.elements.id.value;
        const prodotto = scorte.find(item => item.id === id);
        const esaurito = valore === 0 && confezioneParziale(prodotto, tipoParziale.value)?.totale <= 1;
        const riacquisto = esaurito && suggerisciRiacquisto(scorte, prodotto);
        if (esaurito && !confermaEsaurito(prodotto, riacquisto)) return;
        const posto = bloccoPostoParziale.hidden ? '' : postoParziale.value.trim();
        let selezione = id;
        if (aggiorna(dati => {
            const indice = dati.scorte.findIndex(item => item.id === id);
            const voce = dati.scorte[indice];
            const confezione = confezioneParziale(voce, tipoParziale.value);
            if (!confezione || valore < 0 || valore > confezione.livello) throw new Error(trad('Quantità non valida'));
            const perPezzi = haPezzi(voce);
            const intere = perPezzi ? confezione.totale - 1 : Math.round(confezione.totale - confezione.livello / 100);
            const impostaQuantita = (prodotto, interi, livello) => {
                if (perPezzi) {
                    prodotto.pezziRimasti = interi + Number(livello > 0);
                    delete prodotto.livelloPezzo;
                    if (livello > 0 && livello < 100) prodotto.livelloPezzo = livello;
                    return;
                }
                const totale = interi + livello / 100;
                const plurale = confezione.tipo === 'bottiglia' ? 'bottiglie' : 'bustine';
                prodotto.quantita = totale === 0.5 ? 'Mezza ' + confezione.tipo
                    : new Intl.NumberFormat('it-IT', {useGrouping: false}).format(totale) + ' ' + (totale === 1 ? confezione.tipo : plurale);
            };
            if (intere && valore > 0 && (valore < 100 || posto && posto !== voce.ubicazione)) {
                const aperta = {...voce, id: crypto.randomUUID(), ubicazione: posto || voce.ubicazione};
                if (perPezzi) {
                    aperta.confezioni = 1;
                    aperta.pezziPerConfezione = 1;
                    aperta.tipoConfezione = confezione.tipo;
                }
                impostaQuantita(aperta, 0, valore);
                impostaQuantita(voce, intere, 0);
                dati.scorte.splice(indice + 1, 0, aperta);
                selezione = aperta.id;
            } else if (!intere && valore === 0) {
                registraEsaurito(dati, voce, riacquisto);
                selezione = '';
            } else {
                impostaQuantita(voce, intere, valore);
                if (perPezzi) voce.tipoConfezione = confezione.tipo;
                if (posto && !intere) voce.ubicazione = posto;
            }
        }, statoScarico, riacquisto ? trad('Prodotto esaurito. Da ricomprare nella Lista della spesa.') : trad('Contenuto rimanente aggiornato.'))) {
            postoParziale.value = '';
            scarico.elements.id.value = selezione;
            selezionaScarico();
        }
    }
    cursore.addEventListener('input', aggiornaLivello);
    function indicaLivello(evento) {
        const rettangolo = forma.getBoundingClientRect();
        const percentuale = Math.round(100 * (rettangolo.bottom - evento.clientY) / rettangolo.height);
        cursore.value = Math.max(0, Math.min(Number(cursore.max), percentuale));
        aggiornaLivello();
    }
    forma.addEventListener('pointerdown', evento => {
        if (evento.button !== 0) return;
        forma.setPointerCapture(evento.pointerId);
        indicaLivello(evento);
    });
    forma.addEventListener('pointermove', evento => {
        if (forma.hasPointerCapture(evento.pointerId)) indicaLivello(evento);
    });
    tipoParziale.addEventListener('change', () => configuraParziale(scorte.find(item => item.id === scarico.elements.id.value)));
    mezza.addEventListener('click', () => {
        salvaLivello(Number(cursore.max) - 50);
    });
    finito.addEventListener('click', () => {
        const voce = scorte.find(item => item.id === scarico.elements.id.value);
        if (!voce) return;
        const riacquisto = suggerisciRiacquisto(scorte, voce);
        if (!confermaEsaurito(voce, riacquisto)) return;
        if (aggiorna(dati => {
            registraEsaurito(dati, voce, riacquisto);
        }, statoScarico, riacquisto ? trad('Prodotto esaurito. Da ricomprare nella Lista della spesa.') : trad('Scorta finita e rimossa dall’inventario.'))) {
            opzioneScarico(null);
            scarico.elements.resto.value = '';
            postoScarico.value = '';
        }
    });
    function salvaSpostamento() {
        const id = scarico.elements.id.value;
        const posto = postoScarico.value.trim();
        if (!posto) {
            statoScarico.textContent = trad('Scrivi il nuovo posto dove conservi la scorta.');
            postoScarico.focus();
            return;
        }
        if (aggiorna(dati => {
            const voce = dati.scorte.find(item => item.id === id);
            if (!voce) throw new Error(trad('Scorta non trovata'));
            voce.ubicazione = posto;
        }, statoScarico, trad('Posto di conservazione aggiornato.'))) postoScarico.value = '';
    }
    function iniziaProva() {
        prova = {scorte: [
            {id: 'vassoio-prova', nome: trad('Piantine di lattuga'), categoria: 'Piantine',
                confezioni: 1, pezziPerConfezione: 12, pezziRimasti: 12, ubicazione: trad('Serra')},
            {id: 'bottiglie-prova', nome: trad('Bottiglie di concime'), categoria: 'Terriccio e concimi',
                confezioni: 1, pezziPerConfezione: 3, pezziRimasti: 3, ubicazione: trad('Capanno')},
            {id: 'bustine-prova', nome: trad('Semi di basilico'), categoria: 'Semi',
                quantita: '2 bustine', ubicazione: trad('Scatola dei semi')}
        ], acquisti: []};
        avvisoProva.hidden = false;
        scarico.reset();
        opzioneScarico(null);
        mostra(prova);
        statoScarico.textContent = '';
    }
    document.getElementById('orto-inizia-prova').addEventListener('click', iniziaProva);
    function terminaProva() {
        prova = null;
        avvisoProva.hidden = true;
        scarico.reset();
        opzioneScarico(null);
        statoScarico.textContent = '';
        ricarica();
    }
    document.getElementById('orto-fine-prova').addEventListener('click', terminaProva);
    acquisto.addEventListener('submit', evento => {
        evento.preventDefault();
        const nome = acquisto.elements.nome.value.trim();
        if (nome && aggiungiAcquisto(nome, acquisto.elements.quantita.value.trim())) acquisto.reset();
    });

    function ricarica() {
        try {
            mostra(leggi());
        } catch {
            statoScorta.textContent = trad('I dati della dispensa e degli acquisti dell’orto non sono leggibili.');
        }
    }

    ricarica();
    cambiaVista();
    window.addEventListener('hashchange', cambiaVista);
    window.addEventListener('storage', evento => {
        if (evento.key === key || evento.key === null) ricarica();
    });
})();
