(() => {
    'use strict';

    const key = 'eat_dispensa_orto_it_v1';
    const scorta = document.getElementById('orto-scorta');
    const acquisto = document.getElementById('orto-acquisto');
    const scarico = document.getElementById('orto-scarico');
    const cerca = document.getElementById('orto-cerca');
    const mezza = document.getElementById('orto-mezza');
    const finito = document.getElementById('orto-finito');
    const sposta = document.getElementById('orto-sposta');
    const quantitaAttuale = document.getElementById('orto-quantita-attuale');
    const listaScorte = document.getElementById('orto-scorte');
    const listaAcquisti = document.getElementById('orto-acquisti');
    const statoScorta = document.getElementById('orto-stato-scorta');
    const statoAcquisto = document.getElementById('orto-stato-acquisto');
    const statoInventario = document.getElementById('orto-stato-inventario');
    const statoScarico = document.getElementById('orto-stato-scarico');
    const salvaScorta = document.getElementById('orto-salva-scorta');
    const annullaScorta = document.getElementById('orto-annulla-scorta');
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
    let scorte = [];

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
        for (const vista of viste) vista.hidden = vista.id !== attiva;
        for (const link of document.querySelectorAll('.orto-nav a')) {
            if (link.hash === '#' + attiva) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
    }

    function leggi() {
        const stato = JSON.parse(localStorage.getItem(key) ?? '{"scorte":[],"acquisti":[]}');
        if (!Array.isArray(stato?.scorte) || !Array.isArray(stato?.acquisti)) throw new Error('Formato non valido');
        return stato;
    }

    function aggiorna(mutazione, stato, messaggio) {
        try {
            const dati = leggi();
            mutazione(dati);
            localStorage.setItem(key, JSON.stringify(dati));
            mostra(dati);
            stato.textContent = messaggio;
            return true;
        } catch {
            stato.textContent = 'Il browser non è riuscito a salvare i dati dell’orto.';
            return false;
        }
    }

    function fineModifica() {
        annullaRicerca();
        modifica = null;
        scorta.reset();
        salvaScorta.textContent = 'Salva prodotto';
        annullaScorta.hidden = true;
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

    function pulsante(testo, azione) {
        const elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.textContent = testo;
        elemento.addEventListener('click', azione);
        return elemento;
    }

    function riga(voce, dettagli, ...pulsanti) {
        const li = document.createElement('li');
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
            voce.categoria, voce.quantita,
            voce.ubicazione && 'Conservazione: ' + voce.ubicazione,
            voce.barcode && 'Codice: ' + voce.barcode,
            voce.scadenza && 'Scadenza: ' + voce.scadenza.split('-').reverse().join('/'),
            noteProdotto(voce) && 'Note: ' + noteProdotto(voce)
        ],
        pulsante('Modifica', () => {
            annullaRicerca();
            modifica = voce.id;
            for (const campo of campiScorta) campoScorta(campo).value = voce[campo] ?? '';
            scorta.elements.note.value = noteProdotto(voce);
            salvaScorta.textContent = 'Salva modifiche';
            annullaScorta.hidden = false;
            location.hash = 'carico';
            cambiaVista();
            scorta.elements.nome.focus();
        }),
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
        if (voce?.categoria !== 'Semi') return null;
        const testo = voce.quantita?.trim().toLocaleLowerCase('it');
        if (testo === 'mezza bustina') return 0.5;
        if (testo === 'una bustina') return 1;
        const numero = testo?.match(/^(\d+(?:[.,]\d+)?)\s*bustin[ae]$/)?.[1];
        return numero === undefined ? null : Number(numero.replace(',', '.'));
    }

    function selezionaScarico() {
        const voce = scorte.find(item => item.id === scarico.elements.id.value);
        const numero = bustine(voce);
        mezza.hidden = numero === null || numero < 0.5;
        quantitaAttuale.textContent = voce
            ? 'Quantità attuale: ' + (voce.quantita || 'non indicata') + (voce.ubicazione ? ' · Conservazione: ' + voce.ubicazione : '')
            : 'Registra prima una scorta nel Carico.';
        scarico.elements.resto.disabled = !voce;
        postoScarico.disabled = !voce;
        scarico.querySelector('[type="submit"]').disabled = !voce;
        finito.disabled = !voce;
        sposta.disabled = !voce;
    }

    function mostra(dati) {
        scorte = dati.scorte;
        const ubicazioni = [...new Set(scorte.map(voce => voce.ubicazione).filter(Boolean))];
        posti.replaceChildren(...ubicazioni.sort((a, b) => a.localeCompare(b, 'it')).map(ubicazione => new Option(ubicazione, ubicazione)));
        mostraInventario();
        const selezione = scarico.elements.id.value;
        scarico.elements.id.replaceChildren(...scorte.map(voce => new Option(voce.nome + (voce.ubicazione ? ' · ' + voce.ubicazione : ''), voce.id)));
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
        voce.id = modifica ?? crypto.randomUUID();
        if (aggiorna(dati => {
            const indice = dati.scorte.findIndex(item => item.id === voce.id);
            if (indice < 0) dati.scorte.push(voce);
            else dati.scorte[indice] = voce;
        }, statoScorta, 'Prodotto salvato.')) fineModifica();
    });
    annullaScorta.addEventListener('click', fineModifica);
    cerca.addEventListener('input', mostraInventario);
    scarico.elements.id.addEventListener('change', () => {
        scarico.elements.resto.value = '';
        postoScarico.value = '';
        statoScarico.textContent = '';
        selezionaScarico();
    });
    scarico.addEventListener('submit', evento => {
        evento.preventDefault();
        const id = scarico.elements.id.value;
        const resto = scarico.elements.resto.value.trim();
        if (!resto) {
            statoScarico.textContent = 'Indica quanto resta oppure usa «Segna come finita».';
            return;
        }
        if (aggiorna(dati => {
            const voce = dati.scorte.find(item => item.id === id);
            if (!voce) throw new Error('Scorta non trovata');
            voce.quantita = resto;
        }, statoScarico, 'Quantità rimanente aggiornata.')) scarico.elements.resto.value = '';
    });
    mezza.addEventListener('click', () => {
        const id = scarico.elements.id.value;
        aggiorna(dati => {
            const voce = dati.scorte.find(item => item.id === id);
            const numero = bustine(voce);
            if (numero === null || numero < 0.5) throw new Error('Scorta insufficiente');
            const resto = Math.round((numero - 0.5) * 1000) / 1000;
            const quantita = new Intl.NumberFormat('it-IT').format(resto);
            voce.quantita = resto === 0.5 ? 'Mezza bustina' : quantita + (resto === 1 ? ' bustina' : ' bustine');
        }, statoScarico, 'Mezza bustina scalata dalla scorta.');
    });
    finito.addEventListener('click', () => {
        const voce = scorte.find(item => item.id === scarico.elements.id.value);
        if (!voce || !confirm('Togliere «' + voce.nome + '» dall’inventario perché è finita?')) return;
        if (aggiorna(dati => {
            dati.scorte = dati.scorte.filter(item => item.id !== voce.id);
        }, statoScarico, 'Scorta finita e rimossa dall’inventario.')) {
            scarico.elements.resto.value = '';
            postoScarico.value = '';
            if (modifica === voce.id) fineModifica();
        }
    });
    sposta.addEventListener('click', () => {
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
    });
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
