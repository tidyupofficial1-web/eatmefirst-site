const messaggiConfrontoBackup={"Il contenuto è uguale a quello presente. La sostituzione non è necessaria.": "Der Inhalt entspricht dem aktuellen Stand. Ersetzen ist nicht nötig.", "Questo browser non contiene prodotti o liste: puoi importare la dispensa del file.": "Dieser Browser enthält keine Produkte oder Listen: Du kannst den Bestand aus der Datei importieren.", "Non è possibile stabilire quale dispensa sia più recente: manca la data dell’ultima modifica di una delle due.": "Welcher Bestand neuer ist, lässt sich nicht feststellen: Ein Datum der letzten Änderung fehlt.", "Le dispense hanno origini diverse. La sola data non garantisce che una contenga tutte le modifiche dell’altra.": "Diese Bestände haben unterschiedliche Ursprünge. Das Datum allein garantiert nicht, dass einer alle Änderungen des anderen enthält.", "Le dispense dichiarano la stessa versione ma hanno contenuti diversi. Scegli quale conservare.": "Die Bestände zeigen dieselbe Version, haben aber unterschiedliche Inhalte. Wähle den gewünschten Stand.", "La dispensa nel file è più recente di quella presente. Puoi sostituire quella locale.": "Der Bestand in der Datei ist neuer als der aktuelle Stand. Du kannst die lokale Kopie ersetzen.", "Il file contiene una versione successiva, ma le date non coincidono con questo ordine: controlla l’orologio dei dispositivi.": "Die Datei enthält eine folgende Version, aber die Zeitangaben passen nicht dazu. Prüfe die Geräteuhren.", "Il file contiene una versione precedente. Importandolo perderesti le modifiche più recenti presenti qui.": "Die Datei enthält eine ältere Version. Ein Import würde neuere Änderungen auf diesem Gerät ersetzen.", "Le due dispense sono state modificate separatamente, oppure il loro collegamento è troppo vecchio per verificarlo. Importando il file sostituirai anche le modifiche presenti soltanto qui.": "Beide Bestände wurden getrennt geändert oder ihre Verbindung ist zum Prüfen zu alt. Ein Import ersetzt auch Änderungen, die nur hier vorhanden sind."};
function traduciConfrontoBackup(t){return messaggiConfrontoBackup[t] || "Prüfe den Vergleich der Bestände, bevor du fortfährst.";}
let importazioneInAttesa = null;
let letturaBackup = 0;
const dataBackup = v => v ? new Date(v).toLocaleString('de-DE') : 'für diese Daten nicht verfügbar';
function testoRiepilogoBackup(file) {
    const r = EatBackup.riepilogo(file);
    return `Bestandszeilen: ${r.prodotti} · Gemerkte Produkte: ${r.catalogo} · Einkaufsliste: ${r.spesa} · Aufgaben: ${r.coseDaFare} · Notizen: ${r.postIt} · Vorgänge: ${r.operazioni}. Letzte Änderung: ${dataBackup(r.ultimaModifica)}.`;
}
function aggiornaSituazioneBackup() {
    try {
        for (const key of ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1']) EatStorico.leggi(key);
        const file = EatBackup.daSituazione(EatStorico.situazione());
        document.getElementById('backupSituazione').textContent = testoRiepilogoBackup(file);
        document.getElementById('recuperaDispensa').disabled = !EatBackup.precedente();
    } catch (errore) { document.getElementById('backupEsito').textContent = EatErroriDE(errore.message); }
}
function esportaDispensa(firma) {
    try {
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
        document.getElementById('backupEsito').textContent = 'Download gestartet. Prüfe vor der Übertragung, ob die Datei unter Downloads liegt.';
        aggiornaSituazioneBackup();
        return true;
    } catch (errore) { document.getElementById('backupEsito').textContent = 'Export fehlgeschlagen. ' + EatErroriDE(errore.message); }
}
function mostraAnteprimaBackup(file, nome, recupero = false) {
    const attesi = EatStorico.situazione();
    const locale = EatBackup.daSituazione(attesi);
    const confronto = EatBackup.confronta(file, attesi);
    importazioneInAttesa = {file, attesi, confronto, recupero};
    document.getElementById('titoloImportazione').textContent = recupero ? 'Vorherigen Stand wiederherstellen' : 'Prüfe die Datei vor dem Ersetzen der Daten';
    document.getElementById('nomeImportazione').textContent = nome + ' · Datei erstellt am ' + dataBackup(file.creato_il) + '. Für den Vergleich zählt die letzte Datenänderung, nicht das Erstellen der Datei.';
    window.EatBackupNome?.mostraAutore(file);
    document.getElementById('riepilogoLocale').textContent = testoRiepilogoBackup(locale);
    document.getElementById('riepilogoFile').textContent = testoRiepilogoBackup(file);
    document.getElementById('confrontoImportazione').textContent = traduciConfrontoBackup(confronto.testo);
    document.getElementById('consensoImportazioneLabel').hidden = !confronto.rischio;
    document.getElementById('consensoImportazione').checked = false;
    document.getElementById('confermaImportazione').textContent = recupero ? 'Wiederherstellung bestätigen' : 'Ersetzen bestätigen';
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
        document.getElementById('backupEsito').textContent = 'Datei geprüft. Keine Daten ersetzt: Prüfe die Vorschau.';
    } catch (errore) {
        if (numero === letturaBackup) document.getElementById('backupEsito').textContent = EatErroriDE(errore.message);
    } finally { input.value = ''; }
}
function aggiornaPulsanteImportazione() {
    document.getElementById('confermaImportazione').disabled = !importazioneInAttesa || (importazioneInAttesa.confronto.rischio && !document.getElementById('consensoImportazione').checked);
}
function annullaImportazione() {
    letturaBackup++;
    importazioneInAttesa = null;
    document.getElementById('anteprimaImportazione').hidden = true;
    document.getElementById('backupEsito').textContent = 'Aktueller Stand behalten. Keine Daten importiert.';
}
function confermaImportazione() {
    if (!importazioneInAttesa) return;
    try {
        const p = importazioneInAttesa;
        EatBackup.importa(p.file, p.attesi, document.getElementById('consensoImportazione').checked);
        importazioneInAttesa = null;
        document.getElementById('anteprimaImportazione').hidden = true;
        document.getElementById('backupEsito').textContent = p.recupero ? 'Vorheriger Stand wiederhergestellt.' : 'Bestand importiert. Produkte, Listen, Einstellungen und Verlauf übertragen.';
        aggiornaSituazioneBackup();
    } catch (errore) {
        importazioneInAttesa = null;
        aggiornaPulsanteImportazione();
        document.getElementById('backupEsito').textContent = EatErroriDE(errore.message);
        aggiornaSituazioneBackup();
    }
}
function preparaRecupero() {
    try {
        letturaBackup++;
        const file = EatBackup.precedente();
        if (!file) throw Error('Non è presente una situazione precedente da recuperare.');
        mostraAnteprimaBackup(file, 'Lokale Kopie vor der letzten Übertragung oder dem letzten Zurücksetzen', true);
    } catch (errore) { document.getElementById('backupEsito').textContent = EatErroriDE(errore.message); }
}
document.addEventListener('DOMContentLoaded', aggiornaSituazioneBackup);
