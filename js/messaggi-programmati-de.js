/* Messaggi interni italiani: funzionano anche da file locale, senza richieste di rete. */
(function () {
    const SESSIONE = 'eat_messaggio_sessione_it_v1';
    const dataLocale = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const giorno = d => Date.parse(dataLocale(d) + 'T00:00:00Z') / 86400000;
    function seleziona(leggi, adesso = new Date()) {
        if (leggi('eatmefirst_consent') !== 'accepted') return null;
        const raw = leggi('eatmefirst_consent_date');
        if (!raw) return null;
        const inizio = new Date(raw);
        if (!Number.isFinite(inizio.getTime()) || inizio > adesso) return null;
        const trascorsi = giorno(adesso)-giorno(inizio);
        // Launch: historical acceptance date schedules advice, never an expiry.
        const disponibili = window.EatMessaggiTestiDE.filter(m => trascorsi >= m.giorno && leggi(`eatmefirst_msg_${m.giorno}_visto`) !== 'true');
        return disponibili.length ? {...disponibili[0]} : null;
    }
    let aperto = false;
    function controlla() {
        if (aperto) return;
        try {
            if (sessionStorage.getItem(SESSIONE)) return;
            if (document.querySelector('dialog[open]')) return;
            for (const id of ['modalScadenze','modalPromemoria']) {
                const v=document.getElementById(id);
                if (v && getComputedStyle(v).display !== 'none') return;
            }
            const m=seleziona(k=>localStorage.getItem(k));
            if (!m) return;
            const precedente=document.activeElement;
            const dialog=document.createElement('dialog'); dialog.className='messaggio-programmato'; dialog.setAttribute('aria-labelledby','titolo-messaggio-programmato');
            const header=document.createElement('div');header.className='messaggio-intestazione';
            const img=document.createElement('img');img.src='../IMG/'+m.avatar;img.alt='';img.addEventListener('error',()=>img.hidden=true);
            const titolo=document.createElement('h2');titolo.id='titolo-messaggio-programmato';titolo.textContent=m.mittente;
            header.append(img,titolo);
            const testo=document.createElement('p');testo.textContent=m.testo;
            const stato=document.createElement('p');stato.setAttribute('role','status');
            const chiudi=document.createElement('button');chiudi.type='button';chiudi.textContent='Gelesen, danke!';
            function conferma() {
                try {localStorage.setItem(`eatmefirst_msg_${m.giorno}_visto`,'true');}
                catch (_) {stato.textContent='Lesebestätigung konnte nicht gespeichert werden. Schließe mit Esc; die Nachricht kann wieder erscheinen.';return;}
                dialog.close();
            }
            chiudi.addEventListener('click',conferma);
            dialog.addEventListener('close',()=>{aperto=false;dialog.remove();precedente?.focus();});
            dialog.append(header,testo,stato,chiudi);
            if (m.giorno === 20) {
                const link=document.createElement('a');link.href='https://tidyupofficial1-web.github.io/eatmefirst-site/';link.textContent="EatMeFirst-Website öffnen";
                link.style.cssText='display:block;margin-top:16px;color:#79c0ff';dialog.append(link);
            }
            document.body.appendChild(dialog);
            dialog.showModal();aperto=true;
            try {sessionStorage.setItem(SESSIONE,'true');} catch (_) { /* Il messaggio resta leggibile anche senza memoria di sessione. */ }
            chiudi.focus();
        } catch (errore) {console.error('Messaggi programmati non disponibili:',errore);}
    }
    window.EatMessaggiDE={seleziona,controlla};
    document.addEventListener('DOMContentLoaded',controlla);
    window.addEventListener('focus',controlla);
})();
