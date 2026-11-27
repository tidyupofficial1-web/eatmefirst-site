(() => {
    'use strict';

    const get = id => document.getElementById(id);
    const dateKey = date => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
    const dateFromKey = key => new Date(key + 'T12:00:00');
    const addDays = (date, days) => {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
    };
    const language = document.documentElement.lang || 'it';
    const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'full' });
    const texts = window.EatAgendaTexts?.[language] ?? window.EatAgendaTexts?.[language.toLowerCase().split('-')[0]];
    const form = get('event-form');
    const garden = form?.dataset.agenda === 'orto';
    const gardenTexts = garden ? {
        newTitle: 'Nuova attività',
        editTitle: 'Modifica attività',
        stored: 'Le attività dell’orto vengono salvate in questo browser.',
        emptyUpcoming: 'Nessuna attività in programma.',
        emptyPast: 'Nessuna attività passata.',
        titleRequired: 'Scrivi il nome dell’attività.',
        saved: 'Attività salvata.',
        deleted: 'Attività eliminata.',
        deleteBefore: 'Eliminare l’attività «'
    } : null;
    const t = (key, fallback) => gardenTexts?.[key] ?? texts?.[key] ?? fallback;
    const storageKey = garden ? 'eat_agenda_orto_it_v1' : 'eat_agenda_personale_it_v1';
    const reminder = get('agenda-reminder');
    const categories = new Map(
        Array.from(get('event-form')?.querySelector('select[name="category"]')?.options || [])
            .filter(option => option.value)
            .map(option => [option.value, option.textContent.trim()])
    );

    function readPersonal(now) {
        try {
            const events = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!Array.isArray(events) || events.some(event =>
                !event || typeof event.day !== 'string' || typeof event.time !== 'string')) return null;
            if (garden) return events;
            const cutoff = addDays(now, -7);
            const remaining = events.filter(event => event.weekly || categories.has(event.category) || !(eventEnd(event) <= cutoff));
            if (remaining.length !== events.length) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(remaining));
                } catch {
                    return events;
                }
            }
            return remaining;
        } catch {
            return null;
        }
    }

    function eventEnd(event) {
        if (event.time) return new Date(event.day + 'T' + event.time);
        const end = dateFromKey(event.day);
        end.setHours(0, 0, 0, 0);
        return addDays(end, 1);
    }

    function imminent(event, now) {
        const today = dateKey(now);
        const day = nextDay(event, today);
        if (!event.time) return day === today;
        let time = new Date(day + 'T' + event.time);
        if (event.weekly && time < now) time = addDays(time, 7);
        const milliseconds = time - now;
        return milliseconds >= 0 && milliseconds <= 12 * 60 * 60 * 1000;
    }

    if (reminder) {
        function updateReminder() {
            const now = new Date();
            reminder.hidden = !(readPersonal(now) || []).some(event => imminent(event, now));
        }
        updateReminder();
        window.addEventListener('pageshow', updateReminder);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) updateReminder();
        });
        window.addEventListener('storage', event => {
            if (event.key === storageKey || event.key === null) updateReminder();
        });
        window.setInterval(updateReminder, 60000);
    }

    if (!form) return;
    const fields = form.elements;
    const deadlines = get('deadlines');
    let mode = new URLSearchParams(location.search).get('prova') === '1' ? 'example' : 'personal';
    let editing = null;
    let personal = readPersonal(new Date());
    let example = samples();

    function samples() {
        const now = new Date();
        if (garden) {
            return [
                {id: 'semine', title: 'Controllare le bustine dei semi', day: dateKey(addDays(now, 1)), time: '', note: 'Annotare le varietà già disponibili prima di comprarne altre.', weekly: false, category: 'semine'},
                {id: 'trapianti', title: 'Rinvasare il basilico', day: dateKey(addDays(now, 3)), time: '', note: 'Preparare due vasi e il terriccio.', weekly: false, category: 'trapianti'},
                {id: 'cura', title: 'Controllare il terriccio dei vasi', day: dateKey(addDays(now, 4)), time: '', note: 'Verificare l’umidità prima di decidere se bagnare.', weekly: true, category: 'cura'},
                {id: 'raccolta', title: 'Annotare il primo raccolto', day: dateKey(addDays(now, 6)), time: '', note: 'Scrivere quantità e varietà per il confronto con la prossima stagione.', weekly: false, category: 'raccolta'}
            ];
        }
        const friday = addDays(now, (5 - now.getDay() + 7) % 7 || 7);
        const events = [
            { id: 'judo', title: t('judo', 'Accompagnare Gianni a judo'), day: dateKey(friday), time: '17:30', note: t('belt', 'Mettere la cintura nella borsa.'), weekly: true },
            { id: 'danza', title: t('dance', 'Maria va a danza'), day: dateKey(friday), time: '18:00', note: t('shoes', 'Ricordare le scarpette.'), weekly: true },
            { id: 'parrucchiera', title: t('hair', 'Andare dalla parrucchiera'), day: dateKey(addDays(friday, 1)), time: '10:30', note: '', weekly: false },
            { id: 'merenda', title: t('snack', 'Merenda con i compagni di Gianni'), day: dateKey(addDays(friday, 1)), time: '16:00', note: t('snackNote', 'Controllare biscotti, bibite e tovaglioli prima della spesa.'), weekly: false },
            { id: 'zaino', title: t('bag', 'Controllare lo zaino per lunedì'), day: dateKey(addDays(friday, 2)), time: '', note: t('bagNote', 'Mettere la cartellina nello zaino.'), weekly: false }
        ];
        if (deadlines) events.push(
            { id: 'patente', title: t('licence', 'Rinnovare la patente'), day: dateKey(addDays(now, 15)), time: '', note: '', weekly: false, category: 'documents' },
            { id: 'revisione', title: t('inspection', 'Revisione dell’auto'), day: dateKey(addDays(now, 23)), time: '', note: t('booking', 'Prenotare il controllo.'), weekly: false, category: 'vehicles' },
            { id: 'abbonamento', title: t('pass', 'Rinnovare l’abbonamento ai mezzi'), day: dateKey(addDays(now, 30)), time: '', note: '', weekly: false, category: 'subscriptions' }
        );
        return events;
    }

    function setEvents(events, message) {
        if (mode === 'example') {
            example = events;
        } else {
            try {
                localStorage.setItem(storageKey, JSON.stringify(events));
                personal = events;
            } catch {
                get('status').textContent = t('saveFailed', 'Il browser non è riuscito a salvare. Riprova.');
                return;
            }
        }
        resetForm();
        render();
        get('status').textContent = message;
    }

    function resetForm() {
        editing = null;
        form.reset();
        fields.day.value = dateKey(new Date());
        get('form-heading').textContent = t('newTitle', 'Nuovo impegno');
        get('cancel-edit').hidden = true;
    }

    function button(label, action) {
        const element = document.createElement('button');
        element.type = 'button';
        element.textContent = label;
        element.addEventListener('click', action);
        return element;
    }

    function append(list, event, day) {
        const item = document.createElement('li');
        const title = document.createElement('h3');
        const when = document.createElement('p');
        const note = document.createElement('p');
        const actions = document.createElement('div');
        actions.className = 'actions';
        title.textContent = event.title;
        when.textContent = formatter.format(dateFromKey(day)) +
            (event.time ? ' · ' + event.time : '') + (event.weekly ? ' · ' + t('weekly', 'Ogni settimana') : '');
        if (list === deadlines || (garden && categories.has(event.category))) when.textContent = categories.get(event.category) + ' · ' + when.textContent;
        note.textContent = event.note;
        actions.append(
            button(t('edit', 'Modifica'), () => {
                editing = event.id;
                for (const name of ['title', 'day', 'time', 'note']) fields[name].value = event[name];
                fields.weekly.checked = event.weekly;
                if (fields.category) fields.category.value = categories.has(event.category) ? event.category : '';
                get('form-heading').textContent = t('editTitle', 'Modifica impegno');
                get('cancel-edit').hidden = false;
                fields.title.focus();
            }),
            button(t('delete', 'Elimina'), () => {
                const events = mode === 'example' ? example : readPersonal(new Date());
                if (events && window.confirm(t('deleteBefore', 'Eliminare l’impegno «') + event.title + t('deleteAfter', '»?'))) {
                    setEvents(events.filter(candidate => candidate.id !== event.id), t('deleted', 'Impegno eliminato.'));
                }
            })
        );
        item.append(title, when);
        if (event.note) item.append(note);
        item.append(actions);
        list.append(item);
    }

    function nextDay(event, today) {
        if (!event.weekly || event.day >= today) return event.day;
        const start = dateFromKey(event.day);
        const current = dateFromKey(today);
        const days = Math.round((current - start) / 86400000);
        return dateKey(addDays(start, Math.ceil(days / 7) * 7));
    }

    function render() {
        const sampleMode = mode === 'example';
        const events = sampleMode ? example : personal;
        get('example').setAttribute('aria-pressed', String(sampleMode));
        get('personal').setAttribute('aria-pressed', String(!sampleMode));
        get('sample-controls').hidden = !sampleMode;
        form.hidden = events === null;
        get('mode').textContent = sampleMode ? t('demo', 'Stai usando gli esempi. Le modifiche di prova durano fino alla chiusura della pagina.') :
            events === null ? t('unreadable', 'L’agenda salvata non è leggibile in questo browser.') : t('stored', 'Gli impegni personali vengono salvati in questo browser.');
        const now = new Date();
        const today = dateKey(now);
        const upcoming = get('upcoming');
        const past = get('past');
        upcoming.replaceChildren();
        past.replaceChildren();
        deadlines?.replaceChildren();
        const dated = (events || []).map(event => {
            let day = nextDay(event, today);
            if (event.weekly && event.time && new Date(day + 'T' + event.time) < now) {
                day = dateKey(addDays(dateFromKey(day), 7));
            }
            return { event, day, passed: event.time ? new Date(day + 'T' + event.time) < now : day < today };
        });
        const compare = (a, b) => a.day.localeCompare(b.day) || a.event.time.localeCompare(b.event.time);
        const regular = deadlines ? dated.filter(({ event }) => !categories.has(event.category)) : dated;
        regular.filter(item => !item.passed).sort(compare).forEach(({ event, day }) => append(upcoming, event, day));
        regular.filter(item => item.passed).sort((a, b) => compare(b, a)).forEach(({ event, day }) => append(past, event, day));
        if (deadlines) dated.filter(({ event }) => categories.has(event.category))
            .sort((a, b) => Number(a.passed) - Number(b.passed) || compare(a, b))
            .forEach(({ event, day }) => append(deadlines, event, day));
        for (const list of [upcoming, past]) {
            if (list.children.length) continue;
            const item = document.createElement('li');
            item.textContent = list === upcoming ? t('emptyUpcoming', 'Nessun impegno in programma.') : t('emptyPast', 'Nessun impegno passato.');
            list.append(item);
        }
        if (deadlines && !deadlines.children.length) {
            const item = document.createElement('li');
            item.textContent = t('emptyDeadlines', 'Nessuna scadenza o manutenzione registrata.');
            deadlines.append(item);
        }
    }

    function switchMode(next) {
        mode = next;
        if (next === 'personal') personal = readPersonal(new Date());
        resetForm();
        render();
        get('status').textContent = '';
    }

    get('example').addEventListener('click', () => switchMode('example'));
    get('personal').addEventListener('click', () => switchMode('personal'));
    get('clear-example').addEventListener('click', () => setEvents([], t('cleared', 'Agenda di prova azzerata.')));
    get('load-example').addEventListener('click', () => setEvents(samples(), t('reloaded', 'Esempi ripristinati.')));
    get('cancel-edit').addEventListener('click', resetForm);
    form.addEventListener('submit', event => {
        event.preventDefault();
        const title = fields.title.value.trim();
        if (!title) {
            get('status').textContent = t('titleRequired', 'Scrivi il titolo dell’impegno.');
            fields.title.focus();
            return;
        }
        const events = mode === 'example' ? example : readPersonal(new Date());
        if (!events) return;
        const item = { id: editing || String(Date.now()) + '-' + Math.random().toString(36).slice(2), title,
            day: fields.day.value, time: fields.time.value, note: fields.note.value.trim(), weekly: fields.weekly.checked };
        const category = fields.category ? fields.category.value : events.find(entry => entry.id === editing)?.category;
        if (categories.has(category)) item.category = category;
        setEvents(editing ? events.map(entry => entry.id === editing ? item : entry) : [...events, item], t('saved', 'Impegno salvato.'));
    });
    resetForm();
    render();
})();
