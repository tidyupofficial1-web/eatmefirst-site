const messaggiConfrontoBackup={"Il contenuto è uguale a quello presente. La sostituzione non è necessaria.": "El contenido es igual al actual. No es necesario sustituirlo.", "Questo browser non contiene prodotti o liste: puoi importare la dispensa del file.": "Este navegador no contiene productos ni listas: puedes importar la despensa del archivo.", "Non è possibile stabilire quale dispensa sia più recente: manca la data dell’ultima modifica di una delle due.": "No se puede saber qué despensa es más reciente: falta una fecha de última modificación.", "Le dispense hanno origini diverse. La sola data non garantisce che una contenga tutte le modifiche dell’altra.": "Estas despensas tienen orígenes diferentes. La fecha no garantiza que una contenga todos los cambios de la otra.", "Le dispense dichiarano la stessa versione ma hanno contenuti diversi. Scegli quale conservare.": "Las despensas indican la misma versión, pero su contenido es diferente. Elige la situación que quieras conservar.", "La dispensa nel file è più recente di quella presente. Puoi sostituire quella locale.": "La despensa del archivo es más reciente que la actual. Puedes sustituir la copia local.", "Il file contiene una versione successiva, ma le date non coincidono con questo ordine: controlla l’orologio dei dispositivi.": "El archivo contiene una versión posterior, pero las fechas no coinciden. Comprueba los relojes de los dispositivos.", "Il file contiene una versione precedente. Importandolo perderesti le modifiche più recenti presenti qui.": "El archivo contiene una versión anterior. Al importarlo sustituirías los cambios más recientes de este dispositivo.", "Le due dispense sono state modificate separatamente, oppure il loro collegamento è troppo vecchio per verificarlo. Importando il file sostituirai anche le modifiche presenti soltanto qui.": "Las dos despensas se han modificado por separado o su relación es demasiado antigua para comprobarla. Al importar sustituirás también los cambios presentes solo aquí."};
function traduciConfrontoBackup(t){return messaggiConfrontoBackup[t] || "Revisa la comparación de las despensas antes de continuar.";}
let importazioneInAttesa = null;
let letturaBackup = 0;
const dataBackup = v => v ? new Date(v).toLocaleString('es-ES') : 'no disponible para estos datos';
function testoRiepilogoBackup(file) {
    const r = EatBackup.riepilogo(file);
    return `${r.prodotti} filas en la despensa · ${r.catalogo} productos recordados · ${r.spesa} en la compra · ${r.coseDaFare} tareas · ${r.postIt} notas · ${r.operazioni} operaciones. Última modificación: ${dataBackup(r.ultimaModifica)}.`;
}
function aggiornaSituazioneBackup() {
    try {
        for (const key of ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1']) EatStorico.leggi(key);
        const file = EatBackup.daSituazione(EatStorico.situazione());
        document.getElementById('backupSituazione').textContent = testoRiepilogoBackup(file);
        document.getElementById('recuperaDispensa').disabled = !EatBackup.precedente();
    } catch (errore) { document.getElementById('backupEsito').textContent = EatErroriES(errore.message); }
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
        document.getElementById('backupEsito').textContent = 'Descarga iniciada. Comprueba que el archivo esté en Descargas antes de transferirlo.';
        aggiornaSituazioneBackup();
        return true;
    } catch (errore) { document.getElementById('backupEsito').textContent = 'Exportación no realizada. ' + EatErroriES(errore.message); }
}
function mostraAnteprimaBackup(file, nome, recupero = false) {
    const attesi = EatStorico.situazione();
    const locale = EatBackup.daSituazione(attesi);
    const confronto = EatBackup.confronta(file, attesi);
    importazioneInAttesa = {file, attesi, confronto, recupero};
    document.getElementById('titoloImportazione').textContent = recupero ? 'Recuperar la situación anterior' : 'Comprueba el archivo antes de sustituir los datos';
    document.getElementById('nomeImportazione').textContent = nome + ' · Archivo creado el ' + dataBackup(file.creato_il) + '. Para comparar cuenta la última modificación de los datos, no la creación del archivo.';
    window.EatBackupNome?.mostraAutore(file);
    document.getElementById('riepilogoLocale').textContent = testoRiepilogoBackup(locale);
    document.getElementById('riepilogoFile').textContent = testoRiepilogoBackup(file);
    document.getElementById('confrontoImportazione').textContent = traduciConfrontoBackup(confronto.testo);
    document.getElementById('consensoImportazioneLabel').hidden = !confronto.rischio;
    document.getElementById('consensoImportazione').checked = false;
    document.getElementById('confermaImportazione').textContent = recupero ? 'Confirmar recuperación' : 'Confirmar sustitución';
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
        document.getElementById('backupEsito').textContent = 'Archivo comprobado. Ningún dato sustituido: revisa la vista previa.';
    } catch (errore) {
        if (numero === letturaBackup) document.getElementById('backupEsito').textContent = EatErroriES(errore.message);
    } finally { input.value = ''; }
}
function aggiornaPulsanteImportazione() {
    document.getElementById('confermaImportazione').disabled = !importazioneInAttesa || (importazioneInAttesa.confronto.rischio && !document.getElementById('consensoImportazione').checked);
}
function annullaImportazione() {
    letturaBackup++;
    importazioneInAttesa = null;
    document.getElementById('anteprimaImportazione').hidden = true;
    document.getElementById('backupEsito').textContent = 'Situación actual conservada. No se han importado datos.';
}
function confermaImportazione() {
    if (!importazioneInAttesa) return;
    try {
        const p = importazioneInAttesa;
        EatBackup.importa(p.file, p.attesi, document.getElementById('consensoImportazione').checked);
        importazioneInAttesa = null;
        document.getElementById('anteprimaImportazione').hidden = true;
        document.getElementById('backupEsito').textContent = p.recupero ? 'Situación anterior recuperada.' : 'Despensa importada. Productos, listas, preferencias e historial transferidos.';
        aggiornaSituazioneBackup();
    } catch (errore) {
        importazioneInAttesa = null;
        aggiornaPulsanteImportazione();
        document.getElementById('backupEsito').textContent = EatErroriES(errore.message);
        aggiornaSituazioneBackup();
    }
}
function preparaRecupero() {
    try {
        letturaBackup++;
        const file = EatBackup.precedente();
        if (!file) throw Error('Non è presente una situazione precedente da recuperare.');
        mostraAnteprimaBackup(file, 'Copia local anterior a la última transferencia o reinicio', true);
    } catch (errore) { document.getElementById('backupEsito').textContent = EatErroriES(errore.message); }
}
document.addEventListener('DOMContentLoaded', aggiornaSituazioneBackup);
