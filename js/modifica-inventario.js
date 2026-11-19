(function () {
    const translations = {
        it: ['Come modificare i dati del prodotto','Puoi correggere un prodotto già salvato. Tocca Modifica per cambiare il nome, correggere il numero di pezzi dopo averli contati o aggiornare la data e la spunta Articolo Tassativo. Se avevi stimato la data, puoi sostituirla con quella sulla confezione.','Chiudi','Chiudi sempre','Modifica','Nome','Pezzi disponibili','Scadenza','Articolo Tassativo','Annulla','Salva','Modifica prodotto','Riapri la scheda e riprova. La dispensa è cambiata.','Indica una data per un articolo tassativo.','Correzione quantità'],
        en: ['How to edit product details','You can correct a saved product. Select Edit to change its name, correct the number of items after counting them, or update its date and the Strict expiry checkbox. You can replace an estimated date with the date printed on the pack.','Close','Always close','Edit','Name','Items available','Expiry date','Strict expiry','Cancel','Save','Edit product','Reopen the product and try again. Your inventory has changed.','Enter a date for a product with a strict expiry.','Quantity correction'],
        fr: ['Comment modifier les données du produit','Vous pouvez corriger un produit déjà enregistré. Choisissez Modifier pour changer son nom, corriger le nombre de pièces après les avoir comptées ou mettre à jour la date et la case Date impérative. Vous pouvez remplacer une date estimée par celle de l’emballage.','Fermer','Ne plus afficher','Modifier','Nom','Pièces disponibles','Date de péremption','Date impérative','Annuler','Enregistrer','Modification du produit','Rouvrez la fiche et réessayez. Votre inventaire a changé.','Indiquez une date pour un produit à date impérative.','Correction de quantité'],
        de: ['So ändern Sie die Produktdaten','Sie können gespeicherte Produkte korrigieren. Wählen Sie Bearbeiten, um den Namen zu ändern, die Stückzahl nach dem Zählen zu berichtigen oder das Datum und die Einstellung Verbindliches Datum zu aktualisieren. Ein geschätztes Datum können Sie durch das Datum auf der Verpackung ersetzen.','Schließen','Nicht mehr anzeigen','Bearbeiten','Name','Verfügbare Stückzahl','Ablaufdatum','Verbindliches Datum','Abbrechen','Speichern','Produkt bearbeitet','Öffnen Sie das Produkt erneut. Ihr Vorrat hat sich geändert.','Geben Sie ein Datum für ein Produkt mit verbindlichem Datum ein.','Mengenkorrektur'],
        es: ['Cómo modificar los datos del producto','Puedes corregir un producto ya guardado. Pulsa Editar para cambiar el nombre, corregir el número de unidades después de contarlas o actualizar la fecha y la casilla Fecha obligatoria. Puedes sustituir una fecha estimada por la que figura en el envase.','Cerrar','No volver a mostrar','Editar','Nombre','Unidades disponibles','Fecha de caducidad','Fecha obligatoria','Cancelar','Guardar','Edición de producto','Vuelve a abrir la ficha e inténtalo de nuevo. Tu inventario ha cambiado.','Introduce una fecha para un producto con fecha obligatoria.','Corrección de cantidad']
    };
    const [title, explanation, close, always, edit, name, quantity, expiry, strict, cancel, save, editType, stale, dateRequired, quantityType] =
        translations[document.documentElement.lang.slice(0, 2)] || translations.it;
    const storageKey = 'eat_dispensa_locale';
    const helpKey = 'emf_inventario_modifica_guida_v1';

    function showHelp() {
        const guide = document.getElementById('emf-edit-help');
        guide.hidden = false;
        document.getElementById('emf-edit-help-link').setAttribute('aria-expanded', 'true');
    }

    function prepareHelp(openedByUser) {
        const content = document.getElementById('contenutoDettaglioProdotto');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<aside id="emf-edit-help" hidden style="margin-bottom:8px;padding:12px;border:1px solid var(--border-color);border-radius:8px;background:var(--light-bg)">
            <strong>${title}</strong><p style="margin:8px 0">${explanation}</p>
            <button type="button" class="btn-action" data-close>${close}</button>
            <button type="button" class="btn-action" data-always>${always}</button>
        </aside>
        <button type="button" id="emf-edit-help-link" aria-controls="emf-edit-help" aria-expanded="false" style="margin:0 0 12px;padding:0;border:0;background:none;color:var(--accent-color);text-decoration:underline;cursor:pointer;font:inherit">${title}</button>`;
        content.prepend(wrapper);
        const link = wrapper.querySelector('#emf-edit-help-link');
        const hide = () => {
            wrapper.querySelector('aside').hidden = true;
            link.setAttribute('aria-expanded','false');
            link.focus();
        };
        link.addEventListener('click', showHelp);
        wrapper.querySelector('[data-close]').addEventListener('click', hide);
        wrapper.querySelector('[data-always]').addEventListener('click', () => {
            localStorage.setItem(helpKey, '3');
            hide();
        });
        const seen = Number(localStorage.getItem(helpKey)) || 0;
        if (openedByUser && seen < 3) {
            localStorage.setItem(helpKey, String(seen + 1));
            showHelp();
        }
    }

    function prepare(index, openedByUser) {
        const panel = document.querySelector('#modalDettaglio .modal-content');
        panel.style.maxHeight = 'calc(100dvh - 40px)';
        panel.style.overflowY = 'auto';
        panel.scrollTop = 0;
        const old = document.getElementById('emf-edit-product-button');
        if (old) old.remove();
        prepareHelp(openedByUser);
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'emf-edit-product-button';
        button.className = 'btn-action';
        button.style.marginRight = '8px';
        button.textContent = edit;
        button.addEventListener('click', () => openEditor(index));
        document.querySelector('#modalDettaglio .modal-content > div:last-child').prepend(button);
    }

    function openEditor(index) {
        const product = dispensaGlobale[index];
        if (!product || document.getElementById('emf-product-editor')) return;
        const defaultPieces = product.pezzi_rimanenti ?? (Number(product.quantita ?? 1) * Number(product.pezzi_per_confezione ?? 1));
        const numericPieces = Number(defaultPieces);
        const originalPieces = Number.isSafeInteger(numericPieces) && numericPieces >= 0 ? numericPieces : 1;
        const originalDate = EatScadenze.descrivi(product).data || '';
        const form = document.createElement('form');
        form.id = 'emf-product-editor';
        form.style.cssText = 'display:grid;gap:10px;margin:12px 0;padding:12px;border:1px solid var(--border-color);border-radius:8px';
        form.innerHTML = `<label>${name}<input name="productName" class="search-input" required></label>
            <label>${quantity}<input name="pieces" type="number" class="search-input" min="0" step="1" required></label>
            <label>${expiry}<input name="date" type="date" class="search-input"></label>
            <label><input name="strict" type="checkbox"> ${strict}</label>
            <p role="alert" hidden></p>
            <div><button type="submit" class="btn-action">${save}</button> <button type="button" class="btn-action">${cancel}</button></div>`;
        const {productName, pieces, date, strict: isStrict} = form.elements;
        productName.value = product.nome || '';
        pieces.value = originalPieces;
        date.value = originalDate;
        isStrict.checked = product.tassativo === true;
        const editButton = document.getElementById('emf-edit-product-button');
        editButton.disabled = true;
        const error = form.querySelector('[role=alert]');
        const fail = message => { error.textContent = message; error.hidden = false; };
        function dismiss() {
            form.remove();
            editButton.disabled = false;
            editButton.focus();
        }
        form.querySelector('[type=button]').addEventListener('click', dismiss);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!productName.value.trim()) { productName.value = ''; productName.reportValidity(); return; }
            if (isStrict.checked && !date.value) { fail(dateRequired); return; }
            const count = pieces.valueAsNumber;
            if (!Number.isSafeInteger(count) || count < 0) return;
            const modified = {...product, nome: productName.value.trim()};
            const quantityChanged = count !== originalPieces;
            const expiryChanged = date.value !== originalDate || isStrict.checked !== (product.tassativo === true);
            if (quantityChanged) modified.pezzi_rimanenti = count;
            if (expiryChanged) {
                if (date.value !== originalDate) {
                    const valid = EatScadenze.calcola(date.value ? 'esatta' : 'nessuna',date.value);
                    if (!valid.valida) { fail(valid.messaggio); return; }
                    modified.tipo_scadenza = date.value ? 'esatta' : 'nessuna';
                    modified.valore_scadenza = date.value || null;
                    modified.data_scadenza = valid.data;
                    if (valid.data && EatScadenze.provieneDaStima(product)) {
                        modified.scadenza_da_stima = true;
                        modified.data_scadenza_iniziale = product.data_scadenza_iniziale || originalDate || valid.data;
                    } else {
                        delete modified.scadenza_da_stima;
                        modified.data_scadenza_iniziale = valid.data;
                    }
                }
                if (date.value && EatScadenze.provieneDaStima(product)) modified.scadenza_da_stima = true;
                modified.tassativo = isStrict.checked;
            }
            if (!quantityChanged && !expiryChanged && modified.nome === product.nome) { dismiss(); return; }
            try {
                if (JSON.stringify(dispensaGlobale[index]) !== JSON.stringify(product) || !EatStorico.coerente(storageKey,dispensaGlobale)) throw Error(stale);
                const snapshot = localStorage.getItem(storageKey);
                const updated = [...dispensaGlobale];
                updated[index] = modified;
                const detail = quantityChanged ? `${modified.nome}: ${originalPieces} → ${count}` : modified.nome;
                EatStorico.registra(quantityChanged ? quantityType : editType,detail,{[storageKey]:updated},{[storageKey]:snapshot});
            } catch (e) { fail(e.message); return; }
            await caricaDispensaDalServer();
            apriDettaglioProdotto(index,false);
            document.getElementById('emf-edit-product-button').focus();
        });
        document.getElementById('contenutoDettaglioProdotto').prepend(form);
        productName.focus();
    }
    window.EatModificaInventario = {prepare};
})();
