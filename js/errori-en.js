/* Presentazione degli errori condivisi: nessuna modifica ai dati o alle regole. */
(function(){
 const messages={
"Il file supera la dimensione massima di 25 MB.":"The file exceeds the 25 MB limit.",
"Non è presente una situazione precedente da recuperare.":"No previous situation is available to recover.",
"Leggi l’avviso e conferma esplicitamente quale dispensa vuoi conservare.":"Read the warning and explicitly confirm which inventory to keep.",
"I dati sono cambiati dopo l’anteprima. Seleziona di nuovo il file.":"Data changed after the preview. Select the file again.",
"Tipo di azzeramento non valido.":"Invalid reset type.",
"Prepara di nuovo l’azzeramento.":"Prepare the reset again.",
"Scegli un backup EatMeFirst creato con questa funzione. Il formato non è riconosciuto.":"Choose an EatMeFirst backup created with this function. Unrecognised format.",
"Il backup è incompleto o danneggiato.":"The backup is incomplete or damaged.",
"Il file è troppo grande o non è leggibile.":"The file is too large or cannot be read.",

 'Questa immagine è ancora troppo pesante. Prova un ritaglio più piccolo.':'This image is still too large. Try a smaller crop.',
 'Immagine non disponibile per il download.':'Image unavailable for download.',
 'La dispensa è cambiata. Ricarica la pagina prima di continuare.':'The inventory changed. Reload before continuing.',
 'La dispensa è cambiata: ricarica la pagina.':'The inventory changed: reload the page.',
 'Operazione non preparata: ricarica la pagina.':'The operation is not ready: reload the page.',
 'Operazione non preparata.':'The operation is not ready.' ,
 'Memoria dei consumi non leggibile.':'Usage records cannot be read.',
 'Copia temporanea non leggibile: chiedi assistenza.':'The temporary recovery copy cannot be read. Please ask for help.',
 'Copia temporanea non valida.':'Invalid temporary recovery copy.',
 'Riferimento foto non valido.':'Invalid photo reference.',
 'Foto di recupero non disponibile: non fare altre modifiche e chiedi assistenza.':'The recovery photo is unavailable. Do not make further changes; please ask for help.',
 'Trasferimento in corso o interrotto. Attendi 30 secondi e ricarica la pagina.':'A transfer is running or was interrupted. Wait 30 seconds and reload the page.',
 'Copia di recupero non valida: chiedi assistenza.':'Invalid recovery copy. Please ask for help.',
 'Salvataggio interrotto non leggibile: chiedi assistenza.':'The interrupted save cannot be read. Please ask for help.',
 'Un salvataggio è in corso o è stato interrotto. Attendi 30 secondi e ricarica la pagina.':'A save is running or was interrupted. Wait 30 seconds and reload the page.',
 'Salvataggio interrotto non valido.':'Invalid interrupted save.',
 'Valori di recupero non validi.':'Invalid recovery values.',
 'I dati sono cambiati in un’altra pagina. Ricarica prima di riprovare.':'The data changed in another page. Reload before trying again.',
 'Spazio del browser insufficiente per la copia di sicurezza dell’operazione. Nessuna modifica effettuata. Conserva una copia esterna prima di chiedere assistenza; non cancellare i dati del browser.':'There is not enough browser space for the operation’s safety copy. Nothing was changed. Keep an external backup before asking for help; do not clear browser data.',
 'Salvataggio interrotto: non fare altre modifiche. Attendi 30 secondi, poi ricarica per il recupero.':'Save interrupted. Do not make further changes. Wait 30 seconds, then reload to recover.',
 'Operazione non salvata: controlla lo spazio disponibile nel browser.':'Operation not saved: check the space available in your browser.',
 'Elenco non supportato.':'Unsupported list.',
 'Storico non leggibile: chiedi assistenza prima di modificarlo.':'History cannot be read. Ask for help before changing it.',
 'Data e versione dei dati non leggibili.':'The data date and version cannot be read.',
 'Dati da trasferire non validi.':'Invalid transfer data.',
 'I dati sono cambiati dopo l’anteprima. Seleziona di nuovo il file.':'The data changed after the preview. Select the file again.',
 'Non c’è spazio per conservare la copia di recupero. Nessun dato è stato sostituito. Esporta la situazione presente prima di liberare spazio.':'There is not enough space for the recovery copy. No data was replaced. Export the current data before freeing space.',
 'Trasferimento interrotto. Non fare altre modifiche; attendi 30 secondi e ricarica per recuperare i dati.':'Transfer interrupted. Do not make further changes. Wait 30 seconds and reload to recover the data.',
 'Importazione non eseguita. I dati precedenti sono stati conservati. Controlla lo spazio disponibile nel browser.':'Import not completed. Previous data was kept. Check the space available in your browser.',
 'Elenco da salvare non valido.':'Invalid list to save.',
 'Due righe hanno lo stesso identificativo. Ricarica la pagina.':'Two entries have the same identifier. Reload the page.',
 'Operazione già annullata.':'Operation already undone.',
 'I dati di questa operazione sono stati modificati: non è possibile annullarla in sicurezza.':'The data for this operation has changed: it cannot be safely undone.',
 'I dati sono cambiati durante il controllo. Ricarica la pagina.':'The data changed during the check. Reload the page.',
 'Tipo di operazione non riconosciuto.':'Unrecognised operation type.',
 'La bacheca è cambiata. Ricarica prima di riprovare.':'The noticeboard changed. Reload before trying again.',
 'Bacheca non leggibile.':'The noticeboard cannot be read.',
 'Post-it con foto non individuato in modo univoco.':'The photo note could not be uniquely identified.',
 'Seleziona una data precisa valida.':'Choose a valid exact date.',
 'Scegli come indicare la scadenza.':'Choose how to enter the product date.',
 'Data di carico mancante o non valida: scadenza non calcolabile.':'Missing or invalid entry date: the product date cannot be calculated.'
 };
 window.EatErroriEN=function(message){
  if(messages[message])return messages[message];
  const number=String(message).match(/^Inserisci un numero intero da 1 a (\d+) nel campo (giorni|mesi)\.$/);
  if(number)return `Enter a whole number from 1 to ${number[1]} in the ${number[2]==='giorni'?'days':'months'} field.`;
  for(const [prefix,translated] of [['Annulla prima l’operazione successiva: ','First undo the later operation: '],['Dati locali non validi: ','Invalid local data: ']]){
   if(String(message).startsWith(prefix))return translated+message.slice(prefix.length);
  }
  return 'Unable to complete the operation. Check your local data and browser space before trying again. Do not clear browser data.';
 };
})();
