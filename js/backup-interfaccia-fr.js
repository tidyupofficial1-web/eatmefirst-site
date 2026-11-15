const messaggiConfrontoBackup={"Il contenuto è uguale a quello presente. La sostituzione non è necessaria.": "Le contenu est identique à la situation actuelle. Le remplacement n’est pas nécessaire.", "Questo browser non contiene prodotti o liste: puoi importare la dispensa del file.": "Ce navigateur ne contient ni produits ni listes : tu peux importer l’inventaire du fichier.", "Non è possibile stabilire quale dispensa sia più recente: manca la data dell’ultima modifica di una delle due.": "Impossible de savoir quel inventaire est le plus récent : une date de dernière modification manque.", "Le dispense hanno origini diverse. La sola data non garantisce che una contenga tutte le modifiche dell’altra.": "Ces inventaires ont des origines différentes. La date seule ne garantit pas que l’un contienne toutes les modifications de l’autre.", "Le dispense dichiarano la stessa versione ma hanno contenuti diversi. Scegli quale conservare.": "Les inventaires indiquent la même version mais ont des contenus différents. Choisis lequel conserver.", "La dispensa nel file è più recente di quella presente. Puoi sostituire quella locale.": "L’inventaire du fichier est plus récent que la situation actuelle. Tu peux remplacer la copie locale.", "Il file contiene una versione successiva, ma le date non coincidono con questo ordine: controlla l’orologio dei dispositivi.": "Le fichier contient une version suivante, mais les dates ne suivent pas cet ordre : vérifie les horloges des appareils.", "Il file contiene una versione precedente. Importandolo perderesti le modifiche più recenti presenti qui.": "Le fichier contient une version précédente. L’importer remplacerait les modifications plus récentes présentes ici.", "Le due dispense sono state modificate separatamente, oppure il loro collegamento è troppo vecchio per verificarlo. Importando il file sostituirai anche le modifiche presenti soltanto qui.": "Les deux inventaires ont été modifiés séparément, ou leur lien est trop ancien pour être vérifié. Importer le fichier remplace aussi les modifications présentes uniquement ici."};
function traduciConfrontoBackup(t){return messaggiConfrontoBackup[t] || "Vérifie la comparaison des inventaires avant de continuer.";}
let importazioneInAttesa = null;
let letturaBackup = 0;
const dataBackup = v => v ? new Date(v).toLocaleString('fr-FR') : 'indisponible pour ces données';
function testoRiepilogoBackup(file) {
    const r = EatBackup.riepilogo(file);
    return `Lignes en stock : ${r.prodotti} · Produits mémorisés : ${r.catalogo} · Courses : ${r.spesa} · Tâches : ${r.coseDaFare} · Notes : ${r.postIt} · Opérations : ${r.operazioni}. Dernière modification : ${dataBackup(r.ultimaModifica)}.`;
}
function aggiornaSituazioneBackup() {
    try {
        for (const key of ['eat_dispensa_locale', 'eat_lista_spesa_v1', 'eat_spesa_locale', 'eat_cose_da_fare_v1', 'eat_bacheca_notes_v1']) EatStorico.leggi(key);
        const file = EatBackup.daSituazione(EatStorico.situazione());
        document.getElementById('backupSituazione').textContent = testoRiepilogoBackup(file);
        document.getElementById('recuperaDispensa').disabled = !EatBackup.precedente();
    } catch (errore) { document.getElementById('backupEsito').textContent = EatErroriFR(errore.message); }
}
function esportaDispensa() {
    try {
        const file = EatBackup.crea();
        const blob = new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = EatBackup.nomeFile(file);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        document.getElementById('backupEsito').textContent = 'Téléchargement lancé. Vérifie que le fichier est dans les téléchargements avant de le transférer.';
        aggiornaSituazioneBackup();
    } catch (errore) { document.getElementById('backupEsito').textContent = 'Échec de l’exportation. ' + EatErroriFR(errore.message); }
}
function mostraAnteprimaBackup(file, nome, recupero = false) {
    const attesi = EatStorico.situazione();
    const locale = EatBackup.daSituazione(attesi);
    const confronto = EatBackup.confronta(file, attesi);
    importazioneInAttesa = {file, attesi, confronto, recupero};
    document.getElementById('titoloImportazione').textContent = recupero ? 'Récupérer la situation précédente' : 'Vérifie le fichier avant de remplacer les données';
    document.getElementById('nomeImportazione').textContent = nome + ' · Fichier créé le ' + dataBackup(file.creato_il) + '. La comparaison utilise la dernière modification des données, pas la création du fichier.';
    document.getElementById('riepilogoLocale').textContent = testoRiepilogoBackup(locale);
    document.getElementById('riepilogoFile').textContent = testoRiepilogoBackup(file);
    document.getElementById('confrontoImportazione').textContent = traduciConfrontoBackup(confronto.testo);
    document.getElementById('consensoImportazioneLabel').hidden = !confronto.rischio;
    document.getElementById('consensoImportazione').checked = false;
    document.getElementById('confermaImportazione').textContent = recupero ? 'Confirmer la récupération' : 'Confirmer le remplacement';
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
        document.getElementById('backupEsito').textContent = 'Fichier vérifié. Aucune donnée remplacée : vérifie l’aperçu.';
    } catch (errore) {
        if (numero === letturaBackup) document.getElementById('backupEsito').textContent = EatErroriFR(errore.message);
    } finally { input.value = ''; }
}
function aggiornaPulsanteImportazione() {
    document.getElementById('confermaImportazione').disabled = !importazioneInAttesa || (importazioneInAttesa.confronto.rischio && !document.getElementById('consensoImportazione').checked);
}
function annullaImportazione() {
    letturaBackup++;
    importazioneInAttesa = null;
    document.getElementById('anteprimaImportazione').hidden = true;
    document.getElementById('backupEsito').textContent = 'Situation actuelle conservée. Aucune donnée importée.';
}
function confermaImportazione() {
    if (!importazioneInAttesa) return;
    try {
        const p = importazioneInAttesa;
        EatBackup.importa(p.file, p.attesi, document.getElementById('consensoImportazione').checked);
        importazioneInAttesa = null;
        document.getElementById('anteprimaImportazione').hidden = true;
        document.getElementById('backupEsito').textContent = p.recupero ? 'Situation précédente récupérée.' : 'Inventaire importé. Produits, listes, préférences et historique transférés.';
        aggiornaSituazioneBackup();
    } catch (errore) {
        importazioneInAttesa = null;
        aggiornaPulsanteImportazione();
        document.getElementById('backupEsito').textContent = EatErroriFR(errore.message);
        aggiornaSituazioneBackup();
    }
}
function preparaRecupero() {
    try {
        letturaBackup++;
        const file = EatBackup.precedente();
        if (!file) throw Error('Non è presente una situazione precedente da recuperare.');
        mostraAnteprimaBackup(file, 'Copie locale avant le dernier transfert ou la dernière réinitialisation', true);
    } catch (errore) { document.getElementById('backupEsito').textContent = EatErroriFR(errore.message); }
}
document.addEventListener('DOMContentLoaded', aggiornaSituazioneBackup);
