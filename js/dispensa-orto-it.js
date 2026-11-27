(() => {
    'use strict';

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
    const statoInventario = document.getElementById('orto-stato-inventario');
    const statoScarico = document.getElementById('orto-stato-scarico');
    const annullaScorta = document.getElementById('orto-annulla-scorta');
    const dialogoModifica = document.getElementById('orto-modifica');
    const campiModifica = document.getElementById('orto-modifica-campi');
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
    let modifica = null;
    let prodottoInModifica = null;
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
        if (attiva === 'agenda' && prova) terminaProva();
        for (const vista of viste) vista.hidden = vista.id !== attiva;
        for (const link of document.querySelectorAll('.orto-nav a')) {
            if (link.hash === '#' + attiva) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
    }

    function leggi() {
        if (prova) return prova;
        const stato = JSON.parse(localStorage.getItem(key) ?? '{"scorte":[],"acquisti":[]}');
        if (!Array.isArray(stato?.scorte) || !Array.isArray(stato?.acquisti)) throw new Error('Formato non valido');
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
            stato.textContent = 'Il browser non è riuscito a salvare i dati dell’orto.';
            return false;
        }
    }

    function fineModifica() {
        const id = modifica;
        modifica = null;
        prodottoInModifica = null;
        if (id) {
            if (dialogoModifica.open) dialogoModifica.close();
            const riga = [...listaScorte.children].find(elemento => elemento.dataset.prodotto === id);
            (riga?.querySelector('button') ?? cerca).focus();
        }
    }

    function annullaRicerca() {
        ricerca?.abort();
        esitoCodice.textContent = '';
    }

    async function cercaCodice() {
        annullaRicerca();
        const codice = codiceCampo.value.replace(/\s+/g, '');
        if (!/^\d{8,14}$/.test(codice)) {
            esitoCodice.textContent = 'Inserisci un codice numerico da 8 a 14 cifre, mantenendo gli zeri iniziali.';
            return;
        }
        codiceCampo.value = codice;
        const controller = new AbortController();
        ricerca = controller;
        const nomeIniziale = scorta.elements.nome.value;
        esitoCodice.textContent = 'Ricerca negli archivi Open Facts…';
        try {
            const risultato = await EatRicercaProdotti.cerca(codice, controller.signal);
            if (controller.signal.aborted || codiceCampo.value !== codice) return;
            const nome = risultato.scheda?.nome;
            if (nome && scorta.elements.nome.value === nomeIniziale && !nomeIniziale.trim()) {
                scorta.elements.nome.value = nome.slice(0, 100);
                esitoCodice.textContent = 'Nome trovato. Controllalo prima di salvare.';
            } else if (nome) {
                esitoCodice.textContent = 'Nome trovato negli archivi: ' + nome + '. Il nome inserito è rimasto nel campo.';
            } else {
                esitoCodice.textContent = risultato.stato === 'non_trovato'
                    ? 'Codice non trovato. Puoi registrare il prodotto a mano.'
                    : 'Ricerca non disponibile. Puoi registrare il prodotto a mano.';
            }
        } catch {
            if (!controller.signal.aborted) esitoCodice.textContent = 'Ricerca non disponibile. Puoi registrare il prodotto a mano.';
        }
    }

    async function fermaScanner() {
        if (!scanner?.isScanning) return;
        try { await scanner.stop(); } catch { /* Il browser può avere già chiuso la fotocamera. */ }
    }

    document.getElementById('orto-leggi-barcode').addEventListener('click', async () => {
        if (avvioScanner || dialogoScanner.open) return;
        if (typeof Html5Qrcode !== 'function') {
            esitoCodice.textContent = 'Scanner non disponibile. Puoi digitare il codice a barre.';
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
            esitoCodice.textContent = 'Fotocamera non disponibile. Puoi digitare il codice a barre.';
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
        return [voce.note, voce.semina && 'Destinazione di semina: ' + voce.semina].filter(Boolean).join('\n');
    }
    const haPezzi = voce => Number.isSafeInteger(voce?.pezziRimasti);
    const quantitaProdotto = voce => haPezzi(voce)
        ? voce.pezziRimasti + (voce.pezziRimasti === 1 ? ' pezzo' : ' pezzi') +
            (voce.livelloPezzo != null ? ' · uno al ' + voce.livelloPezzo + '%' : '')
        : voce.quantita;

    function pulsante(testo, azione) {
        const elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.textContent = testo;
        elemento.addEventListener('click', azione);
        return elemento;
    }

    function riga(voce, dettagli, ...pulsanti) {
        const li = document.createElement('li');
        li.dataset.prodotto = voce.id;
        const nome = document.createElement('strong');
        nome.textContent = voce.nome;
        li.append(nome);
        const p = document.createElement('p');
        p.textContent = dettagli.filter(Boolean).join(' · ');
        if (p.textContent) li.append(p);
        const azioni = document.createElement('div');
        azioni.className = 'actions';
        azioni.append(...pulsanti);
        li.append(azioni);
        return li;
    }

    function aggiungiAcquisto(nome, quantita) {
        return aggiorna(dati => {
            dati.acquisti.push({id: crypto.randomUUID(), nome, quantita, comprato: false});
        }, statoAcquisto, 'Aggiunto alla lista acquisti.');
    }

    function mostraInventario() {
        const query = cerca.value.trim().toLocaleLowerCase('it');
        const visibili = scorte.filter(voce => [voce.nome, voce.barcode, voce.categoria, voce.ubicazione, noteProdotto(voce)]
            .some(valore => valore?.toLocaleLowerCase('it').includes(query)));
        listaScorte.replaceChildren(...visibili.map(voce => riga(voce, [
            voce.categoria, quantitaProdotto(voce),
            haPezzi(voce) && 'Formato originale: ' + voce.confezioni + ' × ' + voce.pezziPerConfezione,
            voce.ubicazione && 'Conservazione: ' + voce.ubicazione,
            voce.barcode && 'Codice: ' + voce.barcode,
            voce.scadenza && 'Scadenza: ' + voce.scadenza.split('-').reverse().join('/'),
            noteProdotto(voce) && 'Note: ' + noteProdotto(voce)
        ],
        pulsante('Modifica', () => {
            modifica = voce.id;
            prodottoInModifica = {...voce};
            const perPezzi = haPezzi(voce);
            document.getElementById('orto-modifica-quantita').hidden = perPezzi;
            document.getElementById('orto-modifica-pezzi').hidden = !perPezzi;
            campiModifica.elements.quantita.disabled = perPezzi;
            campiModifica.elements.pezzi.disabled = !perPezzi;
            campiModifica.elements.pezzi.required = perPezzi;
            for (const campo of ['nome', 'quantita', 'scadenza']) {
                campiModifica.elements[campo].value = voce[campo] ?? '';
            }
            campiModifica.elements.note.value = noteProdotto(voce);
            campiModifica.elements.pezzi.value = voce.pezziRimasti ?? '';
            dialogoModifica.showModal();
            campiModifica.elements.nome.focus();
        }),
        ...(confezioneParziale(voce) || haPezzi(voce) && voce.pezziRimasti > 0 ? [pulsante('Parziale', () => {
            scarico.elements.id.value = voce.id;
            scarico.elements.id.dispatchEvent(new Event('change'));
            location.hash = 'scarico';
            cambiaVista();
            apriParziale.click();
        })] : []),
        pulsante('Metti in lista acquisti', () => {
            if (aggiungiAcquisto(voce.nome, '')) statoInventario.textContent = 'Aggiunto alla lista acquisti.';
            else statoInventario.textContent = statoAcquisto.textContent;
        }),
        pulsante('Rimuovi', () => {
            if (confirm('Rimuovere «' + voce.nome + '» dalla dispensa dell’orto?') &&
                aggiorna(stato => { stato.scorte = stato.scorte.filter(item => item.id !== voce.id); }, statoInventario, 'Scorta rimossa.') &&
                modifica === voce.id) fineModifica();
        }))));
        if (!visibili.length) {
            const li = document.createElement('li');
            li.textContent = query ? 'Nessun prodotto corrisponde alla ricerca.' : 'Nessun prodotto registrato. Comincia dal Carico.';
            listaScorte.append(li);
        }
    }

    function bustine(voce) {
        const testo = voce.quantita?.trim().toLocaleLowerCase('it');
        if (testo === 'mezza bustina') return 0.5;
        if (testo === 'una bustina') return 1;
        const numero = testo?.match(/^(\d+(?:[.,]\d+)?)\s*bustin[ae]$/)?.[1];
        return numero === undefined ? null : Number(numero.replace(',', '.'));
    }

    function confezioneParziale(voce, tipoScelto) {
        if (!voce) return null;
        const descrizione = [voce.nome, voce.quantita].join(' ').toLocaleLowerCase('it');
        const tipo = voce.tipoConfezione || (/\b(?:bottigli[ae]|flacon[ei])\b/.test(descrizione) ? 'bottiglia'
            : (voce.categoria === 'Semi' || /\bbustin[ae]\b/.test(descrizione)) ? 'bustina' : tipoScelto);
        if (!tipo) return null;
        const testo = voce.quantita?.trim().toLocaleLowerCase('it');
        const bottiglie = testo?.match(/^(\d+(?:[.,]\d+)?)\s*(?:bottigli[ae]|flacon[ei])$/)?.[1];
        const totale = haPezzi(voce) ? voce.pezziRimasti : (tipo === 'bustina' ? bustine(voce) :
            testo === 'mezza bottiglia' ? 0.5 : testo === 'una bottiglia' ? 1 :
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
        bloccoTipo.hidden = !perPezzi;
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
            oggettoLivello.textContent = 'Contenuto di una ' + confezione.tipo;
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
            ? 'Quantità attuale: ' + (quantitaProdotto(voce) || 'non indicata') + (voce.ubicazione ? ' · Conservazione: ' + voce.ubicazione : '')
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
        scarico.elements.id.replaceChildren(...scorte.map(voce => {
            const confezione = confezioneParziale(voce);
            const aperta = confezione?.livello < 100 ? ' · aperta, ' + confezione.livello + '%' : '';
            return new Option(voce.nome + (voce.ubicazione ? ' · ' + voce.ubicazione : '') + aperta, voce.id);
        }));
        if (scorte.some(voce => voce.id === selezione)) scarico.elements.id.value = selezione;
        selezionaScarico();
        listaAcquisti.replaceChildren(...dati.acquisti.map(voce => {
            const li = riga(voce, [voce.quantita],
                pulsante(voce.comprato ? 'Segna da comprare' : 'Segna comprato', () => {
                    aggiorna(stato => {
                        const item = stato.acquisti.find(v => v.id === voce.id);
                        if (item) item.comprato = !item.comprato;
                    }, statoAcquisto, 'Lista aggiornata.');
                }),
                pulsante('Rimuovi', () => {
                    aggiorna(stato => { stato.acquisti = stato.acquisti.filter(item => item.id !== voce.id); }, statoAcquisto, 'Voce rimossa.');
                }));
            li.dataset.comprato = voce.comprato;
            return li;
        }));
    }

    const riepilogo = document.getElementById('orto-riepilogo');
    const statoRiepilogo = document.getElementById('orto-riepilogo-stato');
    let prodottoDaSalvare;

    scorta.addEventListener('submit', evento => {
        evento.preventDefault();
        const voce = Object.fromEntries(campiScorta.map(nome => [nome, campoScorta(nome).value.trim()]));
        if (!voce.nome) return;
        voce.barcode = voce.barcode.replace(/\s+/g, '');
        if (voce.barcode && !/^\d{8,14}$/.test(voce.barcode)) {
            statoScorta.textContent = 'Controlla il codice a barre o lascia il campo vuoto.';
            codiceCampo.focus();
            return;
        }
        voce.id = crypto.randomUUID();
        const confezioni = scorta.elements.confezioni.valueAsNumber;
        const pezzi = scorta.elements.pezzi.valueAsNumber;
        if (Number.isFinite(confezioni) !== Number.isFinite(pezzi)) {
            statoScorta.textContent = 'Per usare le confezioni, compila entrambi i campi.';
            return;
        }
        if (Number.isSafeInteger(confezioni) && Number.isSafeInteger(pezzi)) {
            voce.confezioni = confezioni;
            voce.pezziPerConfezione = pezzi;
            voce.pezziRimasti = confezioni * pezzi;
        }
        apriRiepilogo(voce);
    });
    campiModifica.addEventListener('submit', evento => {
        evento.preventDefault();
        if (!prodottoInModifica) return;
        const campi = campiModifica.elements;
        const voce = {...prodottoInModifica};
        for (const campo of ['nome', 'scadenza', 'note']) voce[campo] = campi[campo].value.trim();
        if (!voce.nome) return;
        delete voce.semina;
        if (haPezzi(voce)) {
            if (voce.pezziRimasti !== campi.pezzi.valueAsNumber) delete voce.livelloPezzo;
            voce.pezziRimasti = campi.pezzi.valueAsNumber;
        } else {
            voce.quantita = campi.quantita.value.trim();
        }
        apriRiepilogo(voce, prodottoInModifica);
    });
    function apriRiepilogo(voce, precedente) {
        prodottoDaSalvare = {voce, precedente};
        document.getElementById('orto-riepilogo-titolo').textContent = precedente ? 'Riepilogo modifiche' : 'Riepilogo nuovo prodotto';
        const elenco = document.getElementById('orto-riepilogo-dati');
        elenco.replaceChildren();
        const dettagli = [
            ['Prodotto', voce.nome], ['Codice a barre', voce.barcode], ['Categoria', voce.categoria],
            ['Quantità', quantitaProdotto(voce)], ['Ubicazione', voce.ubicazione],
            ['Scadenza', voce.scadenza], ['Note', noteProdotto(voce)]
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
        const {voce, precedente} = prodottoDaSalvare;
        if (aggiorna(dati => {
            if (!precedente) {
                dati.scorte.push(voce);
                return;
            }
            const indice = dati.scorte.findIndex(item => item.id === voce.id);
            if (indice < 0 || JSON.stringify(dati.scorte[indice]) !== JSON.stringify(precedente)) {
                throw new Error('Prodotto modificato');
            }
            dati.scorte[indice] = voce;
        }, statoRiepilogo, 'Prodotto salvato.')) {
            riepilogo.close();
            if (precedente) {
                statoInventario.textContent = 'Modifiche salvate.';
                fineModifica();
            } else {
                annullaRicerca();
                scorta.reset();
                statoScorta.textContent = 'Prodotto salvato.';
            }
        }
    });
    annullaScorta.addEventListener('click', fineModifica);
    dialogoModifica.addEventListener('close', () => {
        if (modifica) fineModifica();
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
                statoScarico.textContent = 'Indica quanti pezzi hai usato, entro la quantità disponibile.';
                return;
            }
            if (aggiorna(dati => {
                const voce = dati.scorte.find(item => item.id === id);
                if (!haPezzi(voce) || voce.pezziRimasti < usati) throw new Error('Quantità insufficiente');
                voce.pezziRimasti -= usati;
                if (!voce.pezziRimasti) delete voce.livelloPezzo;
            }, statoScarico, 'Quantità rimanente aggiornata.')) usatiCampo.value = '';
            return;
        }
        const resto = scarico.elements.resto.value.trim();
        if (!resto) {
            statoScarico.textContent = 'Indica la quantità rimasta oppure usa «Scarica tutto».';
            return;
        }
        if (aggiorna(dati => {
            const voce = dati.scorte.find(item => item.id === id);
            if (!voce) throw new Error('Scorta non trovata');
            voce.quantita = resto;
        }, statoScarico, 'Quantità rimanente aggiornata.')) scarico.elements.resto.value = '';
    });
    function salvaLivello(valore) {
        const id = scarico.elements.id.value;
        const posto = bloccoPostoParziale.hidden ? '' : postoParziale.value.trim();
        let selezione = id;
        if (aggiorna(dati => {
            const indice = dati.scorte.findIndex(item => item.id === id);
            const voce = dati.scorte[indice];
            const confezione = confezioneParziale(voce, tipoParziale.value);
            if (!confezione || valore < 0 || valore > confezione.livello) throw new Error('Quantità non valida');
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
                dati.scorte.splice(indice, 1);
                selezione = '';
            } else {
                impostaQuantita(voce, intere, valore);
                if (perPezzi) voce.tipoConfezione = confezione.tipo;
                if (posto && !intere) voce.ubicazione = posto;
            }
        }, statoScarico, 'Contenuto rimanente aggiornato.')) {
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
        if (!voce || !confirm('Togliere «' + voce.nome + '» dall’inventario perché è finita?')) return;
        if (aggiorna(dati => {
            dati.scorte = dati.scorte.filter(item => item.id !== voce.id);
        }, statoScarico, 'Scorta finita e rimossa dall’inventario.')) {
            opzioneScarico(null);
            scarico.elements.resto.value = '';
            postoScarico.value = '';
            if (modifica === voce.id) fineModifica();
        }
    });
    function salvaSpostamento() {
        const id = scarico.elements.id.value;
        const posto = postoScarico.value.trim();
        if (!posto) {
            statoScarico.textContent = 'Scrivi il nuovo posto dove conservi la scorta.';
            postoScarico.focus();
            return;
        }
        if (aggiorna(dati => {
            const voce = dati.scorte.find(item => item.id === id);
            if (!voce) throw new Error('Scorta non trovata');
            voce.ubicazione = posto;
        }, statoScarico, 'Posto di conservazione aggiornato.')) postoScarico.value = '';
    }
    function iniziaProva() {
        fineModifica();
        prova = {scorte: [{id: 'vassoio-prova', nome: 'Piantine di lattuga', categoria: 'Piantine',
            confezioni: 1, pezziPerConfezione: 12, pezziRimasti: 12, ubicazione: 'Serra'}], acquisti: []};
        avvisoProva.hidden = false;
        scarico.reset();
        opzioneScarico(null);
        mostra(prova);
        statoScarico.textContent = '';
    }
    document.getElementById('orto-inizia-prova').addEventListener('click', iniziaProva);
    document.getElementById('orto-prova-inventario').addEventListener('click', iniziaProva);
    function terminaProva() {
        prova = null;
        avvisoProva.hidden = true;
        fineModifica();
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
            statoScorta.textContent = 'I dati della dispensa e degli acquisti dell’orto non sono leggibili.';
        }
    }

    ricarica();
    cambiaVista();
    window.addEventListener('hashchange', cambiaVista);
    window.addEventListener('storage', evento => {
        if (evento.key === key || evento.key === null) ricarica();
    });
})();
