/* Elenco locale condiviso da Carico e Scarico italiani. */
(function () {
    const KEY = 'eat_ubicazioni_personalizzate_v1';
    const pulisci = valore => typeof valore === 'string' ? valore.trim().replace(/\s+/g, ' ') : '';
    const identita = valore => pulisci(valore).toLocaleLowerCase('it');

    function leggiArray(key) {
        const valore = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(valore)) throw new Error('Elenco locale non valido: ' + key);
        return valore;
    }

    function elenco(prodotti = []) {
        const nomi = leggiArray(KEY);
        for (const key of ['eat_dispensa_locale', 'emf_dispensa']) {
            nomi.push(...leggiArray(key).map(p => p.ubicazione));
        }
        nomi.push(localStorage.getItem('eat_ultima_ubicazione'));
        nomi.push(...prodotti.map(p => p.ubicazione));
        const unici = new Map();
        nomi.forEach(nome => {
            const pulito = pulisci(nome);
            if (pulito && !unici.has(identita(pulito))) unici.set(identita(pulito), pulito);
        });
        return [...unici.values()];
    }

    function canonica(nome, prodotti = []) {
        return elenco(prodotti).find(n => identita(n) === identita(nome)) || pulisci(nome);
    }

    function ricorda(nomi = [], prodotti = []) {
        try {
            const tutti = elenco([...prodotti, ...nomi.map(ubicazione => ({ ubicazione }))]);
            localStorage.setItem(KEY, JSON.stringify(tutti));
            return true;
        } catch (errore) {
            console.error('Memorizzazione ubicazioni non riuscita', errore);
            alert('Impossible de mémoriser les emplacements. Opération interrompue : vérifie l’espace et les données du navigateur.');
            return false;
        }
    }

    function suggerisci(id, prodotti = []) {
        const lista = document.getElementById(id);
        lista.replaceChildren();
        elenco(prodotti).forEach(nome => lista.appendChild(new Option(nome, nome)));
    }

    function popolaSelect(select, attuale, prefisso, prodotti) {
        select.replaceChildren(new Option(prefisso + (attuale || 'Non indiqué'), attuale || ''));
        elenco(prodotti).forEach(nome => {
            if (identita(nome) !== identita(attuale)) select.appendChild(new Option(nome, nome));
        });
        select.appendChild(new Option('+ Saisir un nouvel emplacement…', 'ALTRO'));
    }

    window.EatUbicazioni = { elenco, canonica, ricorda, suggerisci, popolaSelect };
})();
