let resetUtilitaInAttesa = null;

function apriResetUtilita(tipo) {
    try {
        resetUtilitaInAttesa = EatReset.prepara(tipo);
        document.getElementById('riepilogoReset').textContent = tipo === 'nuovo_inizio' ? testiBackup.fresh : testiBackup.full;
        document.getElementById('consensoReset').checked = false;
        document.getElementById('resetUtilita').showModal();
    } catch (errore) {
        document.getElementById('backupEsito').textContent = erroreBackup(errore);
    }
}

function confermaResetUtilita() {
    if (!resetUtilitaInAttesa || !document.getElementById('consensoReset').checked) return;
    const esito = document.getElementById('backupEsito');
    try {
        EatReset.esegui(resetUtilitaInAttesa);
        annullaImportazione();
        aggiornaSituazioneBackup();
        esito.textContent = testiBackup.done;
    } catch (errore) {
        esito.textContent = erroreBackup(errore);
    } finally {
        resetUtilitaInAttesa = null;
        document.getElementById('resetUtilita').close();
    }
}
