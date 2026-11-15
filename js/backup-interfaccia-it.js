let importazioneInAttesa = null;
let letturaBackup = 0;
let esportazioneInCorso = false;
let richiestaEsportazione = 0;
function annullaRichiestaEsportazione() { richiestaEsportazione++; }
const NASCONDI_SPIEGAZIONE_BACKUP = 'eat_backup_spiegazione_nascosta_it_v1';
function spiegazioneBackupNascosta() {
    try { return localStorage.getItem(NASCONDI_SPIEGAZIONE_BACKUP) === '1'; }
    catch (_) { return false; }
}
function apriImpostazioniEsportazione() {
    const dialogo = document.getElementById('dialogoEsportazione');
    if (!dialogo || typeof dialogo.showModal !== 'function') return false;
    document.getElementById('backupFirma').value = EatBackup.leggiFirma();
    const esito = document.getElementById('esitoDialogoEsportazione');
    if (esito) esito.textContent = '';
    const preferenza = (() => { try { return localStorage.getItem(NASCONDI_SPIEGAZIONE_BACKUP); } catch (_) { return null; } })();
    document.getElementById('backupNonMostrare').checked = preferenza !== '0';
    if (!dialogo.open) dialogo.showModal();
    return true;
}
const dataBackup = v => v ? new Date(v).toLocaleString('it-IT') : 'non disponibile per questi dati';
function testoRiepilogoBackup(file) {
    const r = EatBackup.riepilogo(file);
    return `${r.prodotti} righe in dispensa · ${r.catalogo} prodotti nel catalogo ricordato · ${r.spesa} voci nella spesa · ${r.coseDaFare} cose da fare · ${r.postIt} post-it · ${r.operazioni} operazioni nello storico. Ultima modifica: ${dataBackup(r.ultimaModifica)}.`;
}
function aggiornaSituazioneBackup() {
    try {
        for (const key of ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1']) EatStorico.leggi(key);
        const file = EatBackup.daSituazione(EatStorico.situazione());
        document.getElementById('backupSituazione').textContent = testoRiepilogoBackup(file);
        document.getElementById('recuperaDispensa').disabled = !EatBackup.precedente();
    } catch (errore) { document.getElementById('backupEsito').textContent = errore.message; }
}
async function esportaDispensa() {
    if (esportazioneInCorso) return false;
    if (!spiegazioneBackupNascosta() && apriImpostazioniEsportazione()) return;
    const campo = document.getElementById('backupFirma');
    if (spiegazioneBackupNascosta() && campo) campo.value = EatBackup.leggiFirma();
    return avviaEsportazioneDispensa();
}
async function confermaEsportazioneDispensa(evento) {
    evento.preventDefault();
    if (!await avviaEsportazioneDispensa()) return;
    try { localStorage.setItem(NASCONDI_SPIEGAZIONE_BACKUP, document.getElementById('backupNonMostrare').checked ? '1' : '0'); }
    catch (_) { document.getElementById('backupEsito').textContent += ' Il browser non ha ricordato la scelta sulla spiegazione.'; }
    document.getElementById('dialogoEsportazione').close();
}
async function avviaEsportazioneDispensa() {
    if (esportazioneInCorso) return false;
    esportazioneInCorso = true;
    const richiesta = ++richiestaEsportazione;
    const pulsanti = ['esportaDispensaBtn','confermaEsportaDispensa'].map(id=>document.getElementById(id)).filter(Boolean);
    pulsanti.forEach(b=>b.disabled=true);
    try {
        document.getElementById('backupEsito').textContent = window.EatLancioGratuitoIT ? 'Preparazione della copia…' : 'Controllo del periodo disponibile per esportare…';
        const servizio = window.EatServizioEsportazioneIT;
        if (!servizio || typeof servizio.autorizza !== 'function') throw Error('Il controllo del servizio non è stato caricato. Ricarica la pagina; la dispensa resta disponibile.');
        try {
            const diritto = await servizio.autorizza();
            if (diritto?.consentita !== true) throw Error('Il diritto all’esportazione non è stato confermato.');
        }
        catch (errore) {
            if (richiesta !== richiestaEsportazione) return false;
            const dialogo = document.getElementById('dialogoEsportazione');
            if (dialogo?.open && typeof dialogo.close === 'function') dialogo.close();
            window.EatInterfacciaServizioIT?.apriCodici();
            throw errore;
        }
        if (richiesta !== richiestaEsportazione) return false;
        const campoFirma = document.getElementById('backupFirma');
        const firma = campoFirma ? campoFirma.value : EatBackup.leggiFirma();
        let notaFirma = '';
        try { EatBackup.salvaFirma(firma); }
        catch (_) { notaFirma = ' Il nome sarà scritto in questa copia, ma il browser non è riuscito a ricordarlo per la prossima volta.'; }
        const file = EatBackup.crea(firma);
        const blob = new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = EatBackup.nomeFile(file);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        document.getElementById('backupEsito').textContent = 'Download avviato' + (file.salvato_da ? ' da ' + file.salvato_da : '') + ' il ' + dataBackup(file.creato_il) + '. Controlla che il file sia presente tra i download prima di trasferirlo. Per la copia di famiglia, metti questo file nel posto concordato e avvisa chi lo userà dopo di te.' + notaFirma;
        aggiornaSituazioneBackup();
        // Il browser ha generato il file e avviato il download; non certifica
        // che l'utente lo abbia conservato. La telemetria non blocca l'export.
        try { window.EatStatistiche?.registra('esportazione_avviata'); } catch (_) {}
        return true;
    } catch (errore) {
        document.getElementById('backupEsito').textContent = 'Esportazione non riuscita. ' + errore.message;
        const esitoDialogo = document.getElementById('esitoDialogoEsportazione');
        if (esitoDialogo) esitoDialogo.textContent = errore.message;
        return false;
    } finally {
        esportazioneInCorso = false;
        pulsanti.forEach(b=>b.disabled=false);
    }
}
function mostraAnteprimaBackup(file, nome, recupero = false) {
    const attesi = EatStorico.situazione();
    const locale = EatBackup.daSituazione(attesi);
    const confronto = EatBackup.confronta(file, attesi);
    importazioneInAttesa = {file, attesi, confronto, recupero};
    document.getElementById('titoloImportazione').textContent = recupero ? 'Recupera la situazione precedente' : 'Controlla il file prima di sostituire i dati';
    const autore = file.salvato_da ? ' · Copia esportata da: ' + file.salvato_da : ' · Chi ha esportato: non indicato (file precedente o nome non compilato)';
    document.getElementById('nomeImportazione').textContent = nome + autore + ' · File creato il ' + dataBackup(file.creato_il) + '. Il nome aiuta a riconoscere la copia; per il confronto contano le modifiche e la loro successione, non soltanto chi ha esportato o la data del download.';
    document.getElementById('riepilogoLocale').textContent = testoRiepilogoBackup(locale);
    document.getElementById('riepilogoFile').textContent = testoRiepilogoBackup(file);
    document.getElementById('confrontoImportazione').textContent = confronto.testo;
    document.getElementById('consensoImportazioneLabel').hidden = !confronto.rischio;
    document.getElementById('consensoImportazione').checked = false;
    document.getElementById('confermaImportazione').textContent = recupero ? 'Conferma ripristino' : 'Conferma sostituzione';
    document.getElementById('anteprimaImportazione').hidden = false;
    aggiornaPulsanteImportazione();
    document.getElementById('anteprimaImportazione').scrollIntoView({behavior: 'auto', block: 'start'});
}
async function preparaImportazione(evento) {
    const numero = ++letturaBackup;
    importazioneInAttesa = null;
    document.getElementById('anteprimaImportazione').hidden = true;
    const input = evento.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
        if (file.size > 25000000) throw Error('Il file supera la dimensione massima di 25 MB.');
        const dati = EatBackup.leggi(await file.text());
        if (numero !== letturaBackup) return;
        mostraAnteprimaBackup(dati, file.name);
        document.getElementById('backupEsito').textContent = 'File controllato. Nessun dato è stato sostituito: verifica l’anteprima.';
    } catch (errore) {
        if (numero === letturaBackup) document.getElementById('backupEsito').textContent = errore.message;
    } finally { input.value = ''; }
}
function aggiornaPulsanteImportazione() {
    document.getElementById('confermaImportazione').disabled = !importazioneInAttesa || (importazioneInAttesa.confronto.rischio && !document.getElementById('consensoImportazione').checked);
}
function annullaImportazione() {
    letturaBackup++;
    importazioneInAttesa = null;
    document.getElementById('anteprimaImportazione').hidden = true;
    document.getElementById('backupEsito').textContent = 'Situazione presente mantenuta. Nessun dato importato.';
}
function confermaImportazione() {
    if (!importazioneInAttesa) return;
    try {
        const p = importazioneInAttesa;
        EatBackup.importa(p.file, p.attesi, document.getElementById('consensoImportazione').checked);
        importazioneInAttesa = null;
        document.getElementById('anteprimaImportazione').hidden = true;
        document.getElementById('backupEsito').textContent = p.recupero ? 'Situazione precedente recuperata.' : 'Dispensa importata. Prodotti, liste, preferenze e storico sono stati trasferiti.';
        aggiornaSituazioneBackup();
    } catch (errore) {
        importazioneInAttesa = null;
        aggiornaPulsanteImportazione();
        document.getElementById('backupEsito').textContent = errore.message;
        aggiornaSituazioneBackup();
    }
}
function preparaRecupero() {
    try {
        letturaBackup++;
        const file = EatBackup.precedente();
        if (!file) throw Error('Non è presente una situazione precedente da recuperare.');
        mostraAnteprimaBackup(file, 'Copia locale precedente all’ultimo trasferimento o azzeramento', true);
    } catch (errore) { document.getElementById('backupEsito').textContent = errore.message; }
}
document.addEventListener('DOMContentLoaded', function () {
    const campo = document.getElementById('backupFirma');
    if (campo) campo.value = EatBackup.leggiFirma();
    aggiornaSituazioneBackup();
});
