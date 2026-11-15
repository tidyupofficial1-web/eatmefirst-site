window.EatErroriFR = function(message){
 const messages={
"Il file supera la dimensione massima di 25 MB.":"Le fichier dépasse la limite de 25 Mo.","Non è presente una situazione precedente da recuperare.":"Aucune situation précédente à récupérer.","Leggi l’avviso e conferma esplicitamente quale dispensa vuoi conservare.":"Lis l’avertissement et confirme quel inventaire tu veux conserver.","I dati sono cambiati dopo l’anteprima. Seleziona di nuovo il file.":"Les données ont changé après l’aperçu. Sélectionne à nouveau le fichier.","Tipo di azzeramento non valido.":"Type de réinitialisation invalide.","Prepara di nuovo l’azzeramento.":"Prépare à nouveau la réinitialisation.","Scegli un backup EatMeFirst creato con questa funzione. Il formato non è riconosciuto.":"Choisis une sauvegarde EatMeFirst créée avec cette fonction. Format non reconnu.","Il backup è incompleto o danneggiato.":"La sauvegarde est incomplète ou endommagée.","Il file è troppo grande o non è leggibile.":"Le fichier est trop volumineux ou illisible.","Dati da trasferire non validi.":"Les données à transférer sont invalides.","Non c’è spazio per conservare la copia di recupero. Nessun dato è stato sostituito. Esporta la situazione presente prima di liberare spazio.":"Espace insuffisant pour garder la copie de récupération. Aucune donnée remplacée. Exporte la situation actuelle avant de libérer de l’espace.","Trasferimento interrotto. Non fare altre modifiche; attendi 30 secondi e ricarica per recuperare i dati.":"Transfert interrompu. Ne fais pas d’autres modifications ; attends 30 secondes puis recharge pour récupérer les données.","Importazione non eseguita. I dati precedenti sono stati conservati. Controlla lo spazio disponibile nel browser.":"Importation non effectuée. Les données précédentes sont conservées. Vérifie l’espace disponible dans le navigateur.","Trasferimento in corso o interrotto. Attendi 30 secondi e ricarica la pagina.":"Transfert en cours ou interrompu. Attends 30 secondes puis recharge la page.","Copia di recupero non valida: chiedi assistenza.":"Copie de récupération invalide : demande de l’aide.",
 "Questa immagine è ancora troppo pesante. Prova un ritaglio più piccolo.": "Cette image est encore trop volumineuse. Essaie de la recadrer davantage.",
 "Immagine non disponibile per il download.": "Image indisponible au téléchargement.",
 'Seleziona una data precisa valida.':'Choisis une date précise valide.',
 'Scegli come indicare la scadenza.':'Choisis comment indiquer la date du produit.',
 'Data di carico mancante o non valida: scadenza non calcolabile.':'Date d’entrée absente ou invalide : date du produit impossible à calculer.',
 'La dispensa è cambiata. Ricarica la pagina prima di continuare.':'L’inventaire a changé. Recharge la page avant de continuer.',
 'La dispensa è cambiata: ricarica la pagina.':'L’inventaire a changé : recharge la page.',
 'I dati sono cambiati in un’altra pagina. Ricarica prima di riprovare.':'Les données ont changé dans une autre page. Recharge avant de réessayer.',
 'Operazione non salvata: controlla lo spazio disponibile nel browser.':'Opération non enregistrée : vérifie l’espace disponible dans le navigateur.',
 'Spazio del browser insufficiente per la copia di sicurezza dell’operazione. Nessuna modifica effettuata. Conserva una copia esterna prima di chiedere assistenza; non cancellare i dati del browser.':'Espace insuffisant pour la copie de sécurité de l’opération. Aucune modification effectuée. Conserve une copie externe avant de demander de l’aide ; ne supprime pas les données du navigateur.',
 'Salvataggio interrotto: non fare altre modifiche. Attendi 30 secondi, poi ricarica per il recupero.':'Enregistrement interrompu : ne fais pas d’autres modifications. Attends 30 secondes puis recharge pour récupérer les données.',
 'Un salvataggio è in corso o è stato interrotto. Attendi 30 secondi e ricarica la pagina.':'Un enregistrement est en cours ou a été interrompu. Attends 30 secondes et recharge la page.',
 'I dati di questa operazione sono stati modificati: non è possibile annullarla in sicurezza.':'Les données de cette opération ont changé : elle ne peut pas être annulée en toute sécurité.'
 };
 if(messages[message])return messages[message];
 const n=String(message).match(/^Inserisci un numero intero da 1 a (\d+) nel campo (giorni|mesi)\.$/);
 if(n)return `Saisis un nombre entier de 1 à ${n[1]} dans le champ ${n[2]==='giorni'?'jours':'mois'}.`;
 if(message === 'Operazione già annullata.') return 'Opération déjà annulée.';
 const prefix='Annulla prima l’operazione successiva: ';
 if(String(message).startsWith(prefix)) return 'Annule d’abord l’opération suivante : '+message.slice(prefix.length);
 return 'Impossible de terminer l’opération. Vérifie les données locales et l’espace du navigateur. Ne supprime pas les données du navigateur ; demande de l’aide.';
};
