/* Stock display, filtering and product details use the same stored inventory in every language. */
const inventoryLocale = document.documentElement.lang;
const inventoryMessages = window.EatInventarioTesti?.[inventoryLocale]?.inventory;
const inventoryText = value => inventoryMessages?.[value] ?? value;
        let dispensaGlobale = [];
        function quantitaInventario(p) {
            const intero = valore => valore !== null && valore !== '' && Number.isSafeInteger(Number(valore)) && Number(valore) >= 0;
            const formato = intero(p.pezzi_per_confezione) && Number(p.pezzi_per_confezione) > 0 ? Number(p.pezzi_per_confezione) : 1;
            const confezioni = intero(p.quantita) ? Number(p.quantita) : 1;
            const pezzi = intero(p.pezzi_rimanenti) ? Number(p.pezzi_rimanenti) : confezioni * formato;
            const valore = p.percentuale === null || p.percentuale === undefined || p.percentuale === '' ? 100 : Number(p.percentuale);
            const percentuale = Number.isFinite(valore) ? Math.max(0, Math.min(100, valore)) : 100;
            const quantita = pezzi === 1 ? (percentuale === 100 ? inventoryText("1 whole item") : inventoryText("1 item")) : inventoryText('{n} items available').replace('{n}', pezzi);
            const contenuto = `${percentuale}%${pezzi > 1 ? inventoryText(" per item") : ''}`;
            return {quantita, contenuto, formato: formato > 1 ? inventoryText('Original pack size: {n} items per pack').replace('{n}', formato) : ''};
        }

        function riepilogoQuantitaInventario(p) {
            const q = quantitaInventario(p);
            return `<strong>${q.quantita}</strong><br><small>${inventoryText("Remaining: ")}${q.contenuto}</small>${q.formato ? `<br><small>${q.formato}</small>` : ''}`;
        }
        function nascondiPresentazione() {
            const box = document.getElementById('sezionePresentazioneInventario');
            if (box) { box.style.display = 'none'; localStorage.emf_nascondi_intro_inventario = 'true'; }
        }
        window.addEventListener('DOMContentLoaded', async () => {
            if (localStorage.emf_nascondi_intro_inventario === 'true') {
                const box = document.getElementById('sezionePresentazioneInventario');
                if (box) box.style.display = 'none';
            }
            await caricaDispensaDalServer();
            EatScadenze.osserva(caricaDispensaDalServer);
        });

        /* Stessa dispensa locale usata da Carico, Scarico e storico. */
        async function caricaDispensaDalServer() {
            try {
                dispensaGlobale = EatStorico.leggi('eat_dispensa_locale');
                popolaFiltriSelect();
                filtraInventario();
            } catch (errore) {
                document.getElementById('listaRisultati').textContent = inventoryText("Could not read inventory. ") + (inventoryMessages?.readError ?? EatErroriEN(errore.message));
            }
        }
        window.addEventListener('pageshow', caricaDispensaDalServer);

        function popolaFiltriSelect() {
            const ubicazioni = [...new Set(dispensaGlobale.map(p => p.ubicazione).filter(Boolean))];
            const selUb = document.getElementById('filtroUbicazione');
            if (selUb) {
                selUb.replaceChildren(new Option(inventoryText("All locations"), ''));
                ubicazioni.forEach(u => selUb.appendChild(new Option(u, u)));
            }
            EatCategorie.filtri(dispensaGlobale, true);
        }

        function filtraInventario() {
            const queryNome = document.getElementById('filtroNome') ? document.getElementById('filtroNome').value.trim().toLowerCase() : '';
            const filtroUb = document.getElementById('filtroUbicazione') ? document.getElementById('filtroUbicazione').value : '';
            const filtroCat = document.getElementById('filtroCategoria') ? document.getElementById('filtroCategoria').value : '';
            const container = document.getElementById('listaRisultati');
            if (!container) return;
            if (dispensaGlobale.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding: 25px;"><p style="color: var(--text-muted); font-style: italic;">${inventoryText("Your inventory is currently empty.")}</p></div>`;
                return;
            }
            const filtrati = dispensaGlobale.filter(p => {
                const matchNome = (p.nome || '').toLowerCase().includes(queryNome);
                const matchUb = filtroUb === "" || p.ubicazione === filtroUb;
                const matchCat = filtroCat === "" || p.categoria === filtroCat;
                return matchNome && matchUb && matchCat && (!document.getElementById('filtroSottocategoria').value || p.sottocategoria === document.getElementById('filtroSottocategoria').value);
            });
            if (filtrati.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted); text-align:center; padding: 20px;">${inventoryText("No products match these filters.")}</p>`;
                return;
            }
            container.innerHTML = filtrati.sort(EatScadenze.confronta).map((p) => `
                <div class="product-item${EatScadenze.classeAllerta(p)}" onclick="apriDettaglioProdotto(${dispensaGlobale.indexOf(p)})">
                    <div class="product-info-left">
                        <img src="${EatCategorie.foto(p.immagine)}" alt="${inventoryText("Preview")}" class="product-thumb">
                        <div>
                            <h4 style="font-size: 15px; color: var(--text-color); margin-bottom: 2px;">${EatCategorie.escape(p.nome || inventoryText("Unnamed product"))}</h4>
                            <span style="font-size: 12px; color: var(--text-muted);">📍 ${EatCategorie.escape(p.ubicazione || inventoryText("Unassigned"))} &bull; 📂 ${EatCategorie.escape(p.categoria || inventoryText("Other"))}${p.sottocategoria ? ' → ' + EatCategorie.escape(p.sottocategoria) : ''}</span>
                            ${EatPromemoria.html(p)}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 15px;">
                        <span>${EatScadenze.html(p)}</span>
                        <span style="color: var(--accent-color); font-size: 14px; text-align: right;">${riepilogoQuantitaInventario(p)}</span>
                    </div>
                </div>
            `).join('');
        }

        function apriDettaglioProdotto(index, openedByUser = true) {
            const p = dispensaGlobale[index];
            if (!p) return;
            document.getElementById('contenutoDettaglioProdotto').innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; background: var(--light-bg); padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <img src="${EatCategorie.foto(p.immagine)}" alt="${inventoryText("Product")}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div>
                        <h4 style="color: var(--accent-color); font-size: 18px; margin-bottom: 4px;">${EatCategorie.escape(p.nome || inventoryText("Unnamed product"))}</h4>
                        <p style="color: var(--text-muted); font-size: 13px;">${inventoryText("Location: ")}${EatCategorie.escape(p.ubicazione || inventoryText("Unassigned"))}</p>
                        <p style="color: var(--text-muted); font-size: 13px;">${inventoryText("Category: ")}${EatCategorie.escape(p.categoria || inventoryText("Other"))}${p.sottocategoria ? ' → ' + EatCategorie.escape(p.sottocategoria) : ''}</p>
                    </div>
                </div>
                <div style="font-size: 14px; color: var(--text-color); display: flex; flex-direction: column; gap: 8px; background: #0d1117; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div>${riepilogoQuantitaInventario(p)}</div>
                    <div><strong>${inventoryText("Product date:")}</strong><br>${EatScadenze.html(p)}</div>
                    <p><strong>${inventoryText("Strict date:")}</strong> ${p.tassativo ? inventoryText("Yes 🔒") : inventoryText("No")}</p>
                    ${EatPromemoria.html(p)}
                    <p><strong>${inventoryText("Barcode:")}</strong> ${EatCategorie.escape(p.barcode || inventoryText("Not entered"))}</p>
                </div>
            `;
            const dettagli = p.dettagli_tecnici || {};
            const sezione = document.createElement('div');
            sezione.style.cssText = 'margin-top:16px;display:flex;flex-direction:column;gap:8px;font-size:14px';
            const titolo = document.createElement('h4');
            titolo.textContent = inventoryText("Product information");
            sezione.appendChild(titolo);
            const campi = [['marca', inventoryText("Brand")], ['ingredienti', dettagli.lingua_ingredienti === 'en' ? inventoryText("Ingredients") : inventoryText("Ingredients (original catalogue text)")], ['allergeni', inventoryText("Reported allergens (original catalogue terms)")], ['tracce', inventoryText("Possible traces (original catalogue terms)")], ['calorie', inventoryText("Energy")], ['categorie_origine', inventoryText("Original catalogue categories")]];
            campi.forEach(([key, etichetta]) => {
                if (!dettagli[key] && key !== 'allergeni') return;
                const riga = document.createElement('p');
                riga.textContent = etichetta + ': ' + (dettagli[key] || inventoryText("Information unavailable: this does not mean there are no allergens."));
                const fonte = dettagli.fonti_campi?.[key];
                if (fonte?.nome) riga.textContent += inventoryText(" (Source: ") + fonte.nome + ')';
                sezione.appendChild(riga);
            });
            if (dettagli.recuperato_il) {
                const data = document.createElement('p');
                data.textContent = inventoryText("Last retrieved: ") + new Date(dettagli.recuperato_il).toLocaleString(inventoryLocale === 'en' ? 'en-GB' : inventoryLocale);
                sezione.appendChild(data);
            }
            (Array.isArray(dettagli.fonti) ? dettagli.fonti : []).forEach(fonte => {
                if (!/^https:\/\/world\.open(?:food|petfood|beauty|products)facts\.org\/product\/\d+$/.test(fonte.url || '')) return;
                const link = document.createElement('a');
                link.href = fonte.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = inventoryText("View source: ") + fonte.nome;
                sezione.appendChild(link);
            });
            if (Array.isArray(dettagli.fonti) && dettagli.fonti.some(fonte => /^https:\/\/world\.open(?:food|petfood|beauty|products)facts\.org\/product\/\d+$/.test(fonte.url || ''))) {
                const crediti = document.createElement('p');
                crediti.textContent = inventoryText("Information from the listed catalogues and their contributors. The original page provides the source details.");
                sezione.appendChild(crediti);
                const licenze = document.createElement('a');
                licenze.href = 'https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/';
                licenze.target = '_blank';
                licenze.rel = 'noopener noreferrer';
                licenze.textContent = inventoryText("Data sources and licences");
                sezione.appendChild(licenze);
            }
            const avviso = document.createElement('p');
            avviso.textContent = inventoryText("Information may be incomplete or change: check the packaging label.");
            sezione.appendChild(avviso);
            document.getElementById('contenutoDettaglioProdotto').appendChild(sezione);
            EatModificaInventario.prepare(index, openedByUser);
            document.getElementById('modalDettaglio').style.display = 'flex';
        }
        function chiudiModalDettaglio() { document.getElementById('modalDettaglio').style.display = 'none'; }
