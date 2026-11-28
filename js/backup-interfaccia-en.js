const testiBackup = window.EatUtilitaTesti?.[document.documentElement.lang];
function testoBackup(originale) {
    return testiBackup?.labels[originale] ?? originale;
}
function riepilogoUtilita(chiave, valori) {
    return testiBackup?.[chiave]?.replace(/\{(\w+)\}/g, (_, nome) => valori[nome]);
}
function erroreBackup(errore) {
    return testiBackup?.error ?? EatErroriEN(errore.message);
}
const messaggiConfrontoBackup={"Il contenuto è uguale a quello presente. La sostituzione non è necessaria.": "The content matches the current situation. Replacement is unnecessary.", "Questo browser non contiene prodotti o liste: puoi importare la dispensa del file.": "This browser has no products or lists: you can import the inventory file.", "Non è possibile stabilire quale dispensa sia più recente: manca la data dell’ultima modifica di una delle due.": "Cannot tell which inventory is newer: one last-change date is missing.", "Le dispense hanno origini diverse. La sola data non garantisce che una contenga tutte le modifiche dell’altra.": "These inventories have different origins. The date alone does not prove one includes all changes from the other.", "Le dispense dichiarano la stessa versione ma hanno contenuti diversi. Scegli quale conservare.": "These inventories report the same version but have different content. Choose which to keep.", "La dispensa nel file è più recente di quella presente. Puoi sostituire quella locale.": "The inventory file is newer than the current situation. You can replace the local copy.", "Il file contiene una versione successiva, ma le date non coincidono con questo ordine: controlla l’orologio dei dispositivi.": "The file contains a later version, but its dates do not match that order: check the device clocks.", "Il file contiene una versione precedente. Importandolo perderesti le modifiche più recenti presenti qui.": "The file contains an earlier version. Importing it would replace the newer changes currently here.", "Le due dispense sono state modificate separatamente, oppure il loro collegamento è troppo vecchio per verificarlo. Importando il file sostituirai anche le modifiche presenti soltanto qui.": "The inventories were edited separately, or their link is too old to verify. Importing replaces changes that exist only here too."};
function traduciConfrontoBackup(t){const en = messaggiConfrontoBackup[t]; return testiBackup ? (Object.entries(testiBackup.comparison).find(([prefix]) => en?.startsWith(prefix))?.[1] ?? testiBackup.error) : en || "Check the inventory comparison before continuing.";}
let importazioneInAttesa = null;
let letturaBackup = 0;
const dataBackup = v => v ? new Date(v).toLocaleString(testiBackup ? document.documentElement.lang : 'en-GB') : testoBackup("unavailable for this data");
function testoRiepilogoBackup(file) {
    const r = EatBackup.riepilogo(file);
    return riepilogoUtilita("summary", {...r, date: dataBackup(r.ultimaModifica)}) ?? `Inventory entries: ${r.prodotti} · Remembered products: ${r.catalogo} · Shopping entries: ${r.spesa} · Errands: ${r.coseDaFare} · Notes: ${r.postIt} · History operations: ${r.operazioni}. Last change: ${dataBackup(r.ultimaModifica)}.`;
}
function aggiornaSituazioneBackup() {
    try {
        for (const key of ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1']) EatStorico.leggi(key);
        const file = EatBackup.daSituazione(EatStorico.situazione());
        document.getElementById('backupSituazione').textContent = testoRiepilogoBackup(file);
        document.getElementById('recuperaDispensa').disabled = !EatBackup.precedente();
    } catch (errore) { document.getElementById('backupEsito').textContent = erroreBackup(errore); }
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
        document.getElementById('backupEsito').textContent = testoBackup("Download started. Check the file is in your downloads before transferring it.");
        aggiornaSituazioneBackup();
        return true;
    } catch (errore) { document.getElementById('backupEsito').textContent = testoBackup("Export failed. ") + erroreBackup(errore); }
}
function mostraAnteprimaBackup(file, nome, recupero = false) {
    const attesi = EatStorico.situazione();
    const locale = EatBackup.daSituazione(attesi);
    const confronto = EatBackup.confronta(file, attesi);
    importazioneInAttesa = {file, attesi, confronto, recupero};
    document.getElementById('titoloImportazione').textContent = recupero ? testoBackup("Recover the previous situation") : testoBackup("Check the file before replacing data");
    document.getElementById('nomeImportazione').textContent = riepilogoUtilita('file', {name: nome, date: dataBackup(file.creato_il)}) ?? nome + ' · File created on '  + dataBackup(file.creato_il) + '. Comparison uses the last data change, not the time the file was created.';
    EatBackupNome.mostraAutore(file);
    document.getElementById('riepilogoLocale').textContent = testoRiepilogoBackup(locale);
    document.getElementById('riepilogoFile').textContent = testoRiepilogoBackup(file);
    document.getElementById('confrontoImportazione').textContent = traduciConfrontoBackup(confronto.testo);
    document.getElementById('consensoImportazioneLabel').hidden = !confronto.rischio;
    document.getElementById('consensoImportazione').checked = false;
    document.getElementById('confermaImportazione').textContent = recupero ? testoBackup("Confirm recovery") : testoBackup("Confirm replacement");
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
        document.getElementById('backupEsito').textContent = testoBackup("File checked. No data replaced: check the preview.");
    } catch (errore) {
        if (numero === letturaBackup) document.getElementById('backupEsito').textContent = erroreBackup(errore);
    } finally { input.value = ''; }
}
function aggiornaPulsanteImportazione() {
    document.getElementById('confermaImportazione').disabled = !importazioneInAttesa || (importazioneInAttesa.confronto.rischio && !document.getElementById('consensoImportazione').checked);
}
function annullaImportazione() {
    letturaBackup++;
    importazioneInAttesa = null;
    document.getElementById('anteprimaImportazione').hidden = true;
    document.getElementById('backupEsito').textContent = testoBackup("Current situation kept. No data imported.");
}
function confermaImportazione() {
    if (!importazioneInAttesa) return;
    try {
        const p = importazioneInAttesa;
        EatBackup.importa(p.file, p.attesi, document.getElementById('consensoImportazione').checked);
        importazioneInAttesa = null;
        document.getElementById('anteprimaImportazione').hidden = true;
        document.getElementById('backupEsito').textContent = p.recupero ? testoBackup("Previous situation recovered.") : testoBackup("Inventory imported. Products, lists, preferences and history transferred.");
        aggiornaSituazioneBackup();
    } catch (errore) {
        importazioneInAttesa = null;
        aggiornaPulsanteImportazione();
        document.getElementById('backupEsito').textContent = erroreBackup(errore);
        aggiornaSituazioneBackup();
    }
}
function preparaRecupero() {
    try {
        letturaBackup++;
        const file = EatBackup.precedente();
        if (!file) throw Error('Non è presente una situazione precedente da recuperare.');
        mostraAnteprimaBackup(file, testoBackup("Local copy before the last transfer or reset"), true);
    } catch (errore) { document.getElementById('backupEsito').textContent = erroreBackup(errore); }
}
document.addEventListener('DOMContentLoaded', aggiornaSituazioneBackup);
