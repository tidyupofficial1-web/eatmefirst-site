/* Avviso dell'Inventario, condiviso da tutte le lingue. */
(function () {
    const testi = {
        it: ['Scorte da usare prima della data', 'Stima basata sul ritmo di consumo registrato, dando priorità alle date più vicine.', 'Prodotto',
            (nome, data, n, singolare) => `${nome} · Alla data del ${data} ${singolare ? "potrebbe restare 1 pezzo equivalente" : "potrebbero restare " + n + " pezzi equivalenti"}.`],
        en: ['Stock to use before its date', 'Based on recorded usage, with the nearest dates used first.', 'Product',
            (name, date, n, singular) => `${name} · Estimated stock remaining on ${date}: ${n} equivalent ${singular ? "unit" : "units"}.`],
        fr: ['Stocks à utiliser avant la date', 'Estimation fondée sur la consommation enregistrée, en commençant par les dates les plus proches.', 'Produit',
            (nom, date, n) => `${nom} · Reste estimé au ${date} : ${n} en unités équivalentes.`],
        de: ['Vorräte vor dem Datum aufbrauchen', 'Schätzung anhand des erfassten Verbrauchs. Vorräte mit dem nächsten Datum werden zuerst berücksichtigt.', 'Produkt',
            (name, datum, n) => `${name} · Geschätzter Restbestand am ${datum}: ${n} Stück (auf ganze Stücke umgerechnet).`],
        es: ['Existencias que conviene usar antes de su fecha', 'Estimación basada en el consumo registrado, dando prioridad a las fechas más próximas.', 'Producto',
            (nombre, fecha, n, singular) => `${nombre} · Existencias estimadas para el ${fecha}: ${n} ${singular ? "unidad equivalente" : "unidades equivalentes"}.`],
        ja: ['期限が近い在庫の使い切り目安', '記録した消費ペースをもとに、期限が近いものから使うと仮定した目安です。', '商品',
            (name, date, n) => `${name} · ${date}時点で約${n}個分が残る見込みです。`],
        pt: ['Produtos para usar antes da data', 'Estimativa com base no consumo registrado, usando primeiro os produtos com as datas mais próximas.', 'Produto',
            (nome, data, n, singular) => `${nome} · Saldo estimado em ${data}: ${n} ${singular ? "unidade equivalente" : "unidades equivalentes"}.`],
        ar: ['مخزون يُفضّل استخدامه قبل تاريخه', 'تقدير مبني على وتيرة الاستهلاك المسجّلة، مع إعطاء الأولوية للأصناف ذات التواريخ الأقرب.', 'صنف',
            (name, date, n) => `${name} · الكمية المتوقّع بقاؤها في ${date}: ${n} وحدة مكافئة.`]
    };

    document.addEventListener('DOMContentLoaded', () => {
        const lingua = document.documentElement.lang || 'it';
        const [titolo, descrizione, prodotto, messaggio] = testi[lingua.split('-')[0]] || testi.en;
        const risultati = document.getElementById('listaRisultati');
        if (!risultati) return;
        const date = new Intl.DateTimeFormat(lingua, {dateStyle: 'short', timeZone: 'UTC'});
        const quantita = new Intl.NumberFormat(lingua, {maximumFractionDigits: 2});
        const box = document.createElement('section');
        box.id = 'previsioneScadenze';
        box.hidden = true;
        const heading = document.createElement('h2');
        heading.id = 'titoloPrevisioneScadenze';
        heading.textContent = titolo;
        box.setAttribute('aria-labelledby', heading.id);
        const nota = document.createElement('p');
        nota.textContent = descrizione;
        const lista = document.createElement('ul');
        lista.id = 'listaPrevisioneScadenze';
        box.append(heading, nota, lista);
        risultati.before(box);

        function aggiorna() {
            let avvisi;
            try {
                const storico = JSON.parse(localStorage.getItem(EatStorico.chiaveConsumi));
                avvisi = EatPrevisioni.eccedenze(storico, EatStorico.leggi('eat_dispensa_locale'));
            } catch {
                avvisi = [];
            }
            lista.replaceChildren(...avvisi.map(avviso => {
                const riga = document.createElement('li');
                riga.textContent = messaggio(avviso.nome || prodotto, date.format(new Date(avviso.data)), quantita.format(avviso.avanzo), avviso.avanzo === 1);
                return riga;
            }));
            box.hidden = !lista.childElementCount;
        }

        aggiorna();
        EatScadenze.osserva(aggiorna);
        window.addEventListener('pageshow', aggiorna);
        window.addEventListener('storage', evento => {
            if (evento.key === EatStorico.chiaveConsumi) aggiorna();
        });
    });
})();
