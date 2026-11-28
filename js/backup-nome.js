/* Device labels for the translated Utilities pages. */
(() => {
    const preference = 'eat_backup_spiegazione_nascosta_it_v1';
    const dialog = document.getElementById('backupNomeDialogo');
    const label = document.getElementById('backupNomeFirma');
    const skip = document.getElementById('backupNomeSalta');
    const feedback = document.getElementById('backupNomeEsito');
    const status = document.getElementById('backupEsito');

    function readPreference() {
        try { return localStorage.getItem(preference); }
        catch (_) { return null; }
    }

    function apri() {
        if (typeof dialog.showModal !== 'function') return false;
        label.value = EatBackup.leggiFirma();
        skip.checked = readPreference() !== '0';
        feedback.textContent = '';
        if (!dialog.open) dialog.showModal();
        return true;
    }

    function esporta() {
        if (readPreference() !== '1' && apri()) return;
        esportaDispensa(EatBackup.leggiFirma());
    }

    document.getElementById('backupNomeModulo').addEventListener('submit', event => {
        event.preventDefault();
        if (!esportaDispensa(label.value)) {
            feedback.textContent = status.textContent;
            return;
        }
        try {
            EatBackup.salvaFirma(label.value);
            localStorage.setItem(preference, skip.checked ? '1' : '0');
        } catch (_) {
            status.textContent += ' ' + dialog.dataset.storageError;
        }
        dialog.close();
    });

    function mostraAutore(file) {
        const preview = document.getElementById('nomeImportazione');
        preview.textContent += ' · ' + dialog.dataset.author + ': ' + (file.salvato_da || dialog.dataset.unknown);
    }

    window.EatBackupNome = { apri, esporta, mostraAutore, chiudi: () => dialog.close() };
})();
