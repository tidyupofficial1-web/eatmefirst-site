/* Palestra isolata: nessun localStorage, rete, download o accesso alla dispensa reale. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 let step = 0, stock = [], moved = false, partial = false, note = false;
 let removed = false, checked = false, copy = '', broken = false, recovered = false;
 const names = () => stock.map(p => p.name);
 const commands = ['Carico','Scarico','Inventario','Lista della spesa','Utilità'];
 const missions = [
  {who:'Max', q:'Sei tornato dalla spesa. Da dove cominci?', hint:'Cominciamo dal codice a barre, poi proviamo anche un prodotto senza etichetta.', choices:commands, right:'Carico'},
  {form:0, who:'Max'}, {form:1, who:'Eva'}, {form:2, who:'Leo'},
  {who:'Eva', q:() => `Mettiamo 2 pezzi di ${names()[0]} in frigorifero. Quale funzione apri?`,hint:'Spostare cambia il posto, non il numero totale di pezzi.',choices:commands,right:'Scarico'},
  {who:'Leo',q:'Quale comando usi per trasferire i 2 pezzi?',hint:'Il prodotto deve restare disponibile, in un altro posto.',choices:['Scarica pezzi','Sposta pezzi','Parziale'],right:'Sposta pezzi',editor:'move'},
  {who:'Eva',q:()=>`Hai usato una parte di un pezzo di ${names()[0]} in frigorifero. Cosa scegli?`,hint:'Quel pezzo non è finito: ne resta una parte.',choices:['Scarica pezzi','Parziale','Carico'],right:'Parziale'},
  {who:'Leo',q:'Quanto contenuto rimane in quel pezzo?',hint:'Nell’app c’è un cursore: lo sposti per indicare il contenuto rimasto, non quello consumato. Non sei limitato a metà o un quarto: puoi scegliere 22%, 31%, 78% o un’altra percentuale. Provalo qui sotto.',slider:true},
  {who:'Max',q:()=>`${names()[1]} serve per domenica. Dove scrivi “Riservato per domenica”?`,hint:'Nello Scarico c’è il comando per gli appunti sul prodotto.',choices:['Note e promemoria','Scarica pezzi','Lista della spesa'],right:'Note e promemoria',editor:'note'},
  {who:'Eva',q:'Dove puoi ritrovare e leggere il dettaglio del prodotto con la nota?',hint:'È la schermata per consultare ciò che hai in casa.',choices:commands,right:'Inventario'},
  {who:'Leo',q:()=>`È finito tutto ${names()[2]}. Quale comando registra che non ne resta più?`,hint:'Qui immaginiamo di aver terminato tutti i pezzi di quel prodotto.',choices:['Sposta pezzi','Scarica pezzi','Note e promemoria'],right:'Scarica pezzi',act:()=>{removed=true;}},
  {who:'Max',q:'Ops, era una prova sbagliata! Dove puoi annullare lo scarico appena fatto?',hint:'Le operazioni recenti possono essere annullate, quando non ci sono movimenti successivi che lo impediscono.',choices:['Ultime 15 operazioni','Carico','Parziale'],right:'Ultime 15 operazioni',act:()=>{removed=false;}},
  {who:'Eva',q:'Ora terminiamo davvero quel prodotto. Confermi lo scarico di tutti i suoi pezzi?',hint:'Nell’app controlli il riepilogo prima di salvare. In questa prova il prodotto esaurito viene aggiunto alla lista.',choices:['Conferma e salva scarico','Sposta pezzi'],right:'Conferma e salva scarico',act:()=>{removed=true;}},
  {who:'Leo',q:'Dove ritrovi il prodotto esaurito?',hint:'È un promemoria per il prossimo acquisto.',choices:commands,right:'Lista della spesa'},
  {who:'Eva',q:'Al supermercato hai preso quello che ti serviva. Cosa fai sulla lista?',hint:'La spunta oscura e barra la voce. Il nuovo acquisto si registra poi nel Carico.',choices:['Metti la spunta','Sposta pezzi','Importa dispensa'],right:'Metti la spunta',act:()=>{checked=true;}},
  {who:'Max',q:'Prepariamo una copia completa della situazione. Quale comando scegli in Utilità?',hint:'Il salvataggio automatico resta nel dispositivo. Qui prepariamo una copia da conservare altrove.',choices:['Esporta dispensa','Importa dispensa','Riparti da zero'],right:'Esporta dispensa'},
  {who:'Leo',q:'Dove conservi la copia? Scegli e vediamo che cosa succede.',hint:'Questa volta puoi provare qualunque scelta: il gioco ne mostra la conseguenza.',choices:['Su un altro dispositivo','Solo nello stesso telefono','Non preparo una copia'],branch:true,act:label=>{copy=label;}},
  {who:'Eva',q:'Immaginiamo che, un giorno, il telefono blu si guasti e tu ne compri uno nuovo. Come ricominci?',hint:'Il guasto è una situazione inventata: non è causato dal salvataggio! Sul telefono verde apri EatMeFirst. Se è il primo accesso, ritrovi la presentazione e devi leggere e accettare le condizioni. Dal Menu apri Utilità, scegli Importa dispensa e seleziona la copia che avevi conservato su un altro dispositivo. Controlla il riepilogo e conferma. Qui simuliamo il recupero con il pulsante sotto.',choices:['Prova a recuperare la dispensa'],right:'Prova a recuperare la dispensa',act:()=>{recovered=copy==='Su un altro dispositivo';}},
  {who:'Leo', ending:true}
 ];
 function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function feedback(text,ok){$('game-feedback').textContent=text;$('game-feedback').className=ok?'correct':'wrong';}
 function button(text,action){const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;}
 function display(){
  const device=$('game-device');device.replaceChildren();const row=el('div',undefined,'game-device-row');
  if(broken){row.append(el('div','Blu: fuori uso', 'game-phone dead'),el('span','→'),el('div','Verde: nuovo','game-phone new'));}
  else row.append(el('div','Telefono blu','game-phone'));
  device.append(row);const panel=$('game-stock');panel.replaceChildren();
  if(broken&&!recovered){panel.append(el('p','Il telefono nuovo ha la dispensa vuota.'));return;}
  stock.forEach((p,i)=>{
   if(i===2&&removed)return;
   const qty=i===0&&moved?p.qty-2:p.qty;
   const item=el('div',undefined,'game-row');if(p.image){const img=el('img');img.src=p.image;img.alt=p.name;img.width=48;img.height=48;item.append(img);}item.append(el('span',`${p.name}: ${qty} ${qty===1?'pezzo':'pezzi'} · ${p.place}${i===1&&note?` · 📌 ${note}`:''}`));panel.append(item);
   if(i===0&&moved){panel.append(el('div',`${p.name}: ${partial?`1 pezzo intero e 1 al ${partial}%`:'2 pezzi interi'} · frigorifero`,'game-row'));}
  });
  if(!stock.length)panel.append(el('p','Cominciamo con una dispensa vuota.'));
  if(removed)panel.append(el('div',`${checked?'☑':'☐'} Lista della spesa: ${names()[2]}`,'game-row spesa'+(checked?' checked':'')));
  if(copy)panel.append(el('p',`Copia simulata: ${copy}.`,'game-copy'));
  if(recovered)panel.append(el('p','Situazione recuperata dall’ultima copia esterna.','game-copy'));
 }
 function productForm(index){
  const catalogue = [
   {code:'2000000000015',name:'Acqua della prova',category:'Bevande',image:'../assets/gioco-bottiglia-acqua.png',pieces:6},
   {code:'2000000000022',name:'Latte della prova',category:'Alimentari',image:'../assets/gioco-cartone-latte.png',pieces:1}
  ];
  const product=catalogue[index];
  $('game-question').textContent=product?`Carico ${index+1} di 3: proviamo il codice a barre`:'Carico 3 di 3: un prodotto senza codice';
  $('game-hint').textContent=product?'Nell’app vera, dopo aver inquadrato il codice, il numero compare automaticamente nella casella. Qui lo scrivi tu: simuliamo la lettura e il risultato, senza fotocamera o internet.':'Eva: «Ho comprato del pane sfuso, senza codice. Non lo lasciamo mica fuori dalla dispensa!» Scrivi il nome, la categoria, le quantità e il posto dove lo conservi.';
  const form=el('form');form.className='game-form';let recognised=!product,saved=false;
  const field=(label,key,type='text',min)=>{const id=`practice-${index}-${key}`;const l=el('label',label);l.htmlFor=id;const input=el('input');input.id=id;input.type=type;input.required=true;input.maxLength=70;if(min!==undefined){input.min=min;input.max=999;input.step=1;}form.append(l,input);return input;};
  let barcode;
  if(product){
   const scan=button('📷 Scansiona codice a barre (simulazione)',()=>{instruction.hidden=false;barcode.focus();});
   form.append(scan);
   const instruction=el('p',`Immagina di aver inquadrato la confezione. Per questa prova scrivi o incolla il codice ${product.code}. È un codice inventato per il gioco.`, 'game-scan-instruction');instruction.hidden=true;form.append(instruction);
   barcode=field('Codice a barre','barcode');barcode.inputMode='numeric';barcode.maxLength=13;barcode.autocomplete='off';
  } else form.append(el('p','Nessun codice a barre? Puoi inserire comunque il prodotto a mano. In questa prova non occorre una fotografia.','game-scan-instruction'));
  const result=el('p');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  const preview=el('img');preview.className='game-product-image';preview.hidden=true;preview.width=160;preview.height=160;
  form.append(result,preview);
  const name=field('Descrizione / Nome prodotto','name');const category=field('Categoria prodotto','category');
  if(product){name.readOnly=true;category.readOnly=true;}
  const packs=field('Confezioni acquistate','packs','number',1);
  const pieces=field('Pezzi per confezione','pieces','number',1);
  const place=field('Ubicazione (dove lo metti)','place');
  if(product){
   barcode.addEventListener('input',()=>{
    if(saved)return;
    const code=barcode.value.replace(/\s/g,'');recognised=code===product.code;
    name.value=recognised?product.name:'';category.value=recognised?product.category:'';
    preview.hidden=!recognised;
    if(recognised){preview.src=product.image;preview.alt=product.name+' illustrato a pastello';pieces.value=String(product.pieces);result.textContent='Prodotto riconosciuto nella simulazione: nome, immagine e categoria sono compilati. Controlla i pezzi per confezione, poi indica quante confezioni hai comprato e dove le metti.';}
    else {pieces.value='';result.textContent=code.length>=13?'Questo non è il codice previsto per la prova. Premi il pulsante di scansione simulata per rileggere quello giusto.':'Scrivi il codice della prova: il risultato comparirà quando sarà completo.';}
   });
   form.append(el('p','Nell’app vera i dati possono mancare: nome, immagine, categoria e pezzi vanno sempre controllati. I pezzi per confezione non vengono sempre trovati.','small'));
  }
  form.append(button('Salva prodotto di prova',()=>{}));form.lastChild.type='submit';
  form.addEventListener('submit',event=>{
   event.preventDefault();if(saved)return;
   if(!recognised){feedback('Prima completa il codice indicato nella scansione simulata.',false);return;}
   const packCount=Number(packs.value),pieceCount=Number(pieces.value),count=packCount*pieceCount;
   if(!name.value.trim()||!category.value.trim()||!place.value.trim()||!Number.isInteger(packCount)||!Number.isInteger(pieceCount)||packCount<1||pieceCount<1||packCount>999||pieceCount>999||(index===0&&count<3)){feedback(index===0?'Per le prossime prove servono almeno 3 pezzi di acqua. Controlla confezioni e pezzi per confezione.':'Controlla nome, categoria, quantità intere e ubicazione.',false);return;}
   saved=true;stock.push({name:name.value.trim(),category:category.value.trim(),qty:count,place:place.value.trim(),image:product?product.image:'',barcode:product?product.code:''});
   form.querySelectorAll('input,button').forEach(n=>n.disabled=true);feedback(`Salvato nella prova: ${packCount} confezioni × ${pieceCount} pezzi = ${count} pezzi disponibili. Bene, procediamo!`,true);$('game-next').hidden=false;display();
  });
  $('game-controls').append(form);
 }
 function editControl(kind){
  const form=el('form');form.className='game-form';let saved=false;
  const label=el('label',kind==='move'?'Pezzi da spostare':'Nota per il prodotto');
  const input=el('input');input.id='practice-edit';label.htmlFor=input.id;
  input.type=kind==='move'?'number':'text';input.required=true;
  if(kind==='move'){input.min='1';input.max=String(stock[0].qty);input.step='1';}
  else input.maxLength=180;
  form.append(el('h3',kind==='move'?'Sposta pezzi':'Note e promemoria'),el('p',kind==='move'?`Prodotto: ${stock[0].name}. Disponibili: ${stock[0].qty} pezzi. Per questa esercitazione spostane 2 in frigorifero.`:`Prodotto: ${stock[1].name}. Scrivi “Riservato per domenica”, oppure una tua nota.`),label,input);
  let destination;
  if(kind==='move'){
   const destLabel=el('label','Nuova ubicazione');destination=el('select');destination.id='practice-destination';destLabel.htmlFor=destination.id;destination.required=true;
   ['', 'frigorifero', 'congelatore', 'ripostiglio'].forEach(value=>{const option=el('option',value||'Scegli dove spostare');option.value=value;destination.append(option);});
   form.append(destLabel,destination);
  }
  const submit=button(kind==='move'?'Conferma spostamento':'Salva nota',()=>{});submit.type='submit';form.append(submit);
  form.addEventListener('submit',event=>{
   event.preventDefault();if(saved)return;
   if(kind==='move'){
    if(Number(input.value)!==2||destination.value!=='frigorifero'){feedback('Per seguire questa prova, indica 2 pezzi e scegli frigorifero. Nulla è stato spostato.',false);return;}
    moved=true;
   }else{if(!input.value.trim()){feedback('Scrivi la nota prima di salvarla.',false);return;}note=input.value.trim();}
   saved=true;form.querySelectorAll('input,select,button').forEach(n=>n.disabled=true);
   feedback(kind==='move'?'Spostamento confermato: 2 pezzi in frigorifero.':'Nota salvata nella dispensa della prova.',true);
   $('game-next').hidden=false;display();
  });
  $('game-controls').replaceChildren(form);$('game-feedback').textContent='';input.focus();
 }
 function partialControl(){
  const form=el('form');form.className='game-form';
  const label=el('label','Contenuto rimasto');label.htmlFor='practice-remaining';
  const range=el('input');range.type='range';range.id='practice-remaining';range.min='0';range.max='100';range.step='1';range.value='50';
  const output=el('output','50% rimasto');output.htmlFor=range.id;
  range.addEventListener('input',()=>{output.textContent=range.value+'% rimasto';range.setAttribute('aria-valuetext',range.value+' per cento rimasto');});
  form.append(label,range,output,el('p','0% = finito · 50% = metà · 100% = intero. Per questa prova lascia una parte del contenuto: scegli un valore da 1% a 99%.','small'));
  form.append(button('Conferma consumo parziale',()=>{}));form.lastChild.type='submit';
  form.addEventListener('submit',event=>{event.preventDefault();const value=Number(range.value);if(!Number.isInteger(value)||value<1||value>99){feedback('Qui proviamo un pezzo usato solo in parte: scegli tra 1% e 99%.',false);return;}partial=value;form.querySelectorAll('input,button').forEach(n=>n.disabled=true);feedback(`Bene! Rimane il ${value}% del contenuto di quel pezzo.`,true);$('game-next').hidden=false;display();});
  $('game-controls').append(form);
 }
 function ending(){
  $('game-question').textContent=recovered?'La copia esterna ci ha salvato la dispensa!':'La copia non era al sicuro.';
  $('game-hint').textContent=recovered?'Nel gioco hai aperto EatMeFirst sul telefono nuovo e recuperato prodotti, quantità e nota dalla copia esterna. Nella realtà, trasferisci prima il file sul nuovo dispositivo, poi vai in Menu → Utilità → Importa dispensa: scegli il file, controlla il riepilogo e conferma. Le operazioni fatte dopo quella copia vanno reinserite.':'In questo esempio i dati del telefono blu non sono recuperabili. Senza una copia fuori da quel telefono, dobbiamo reinserire tutto. Una copia nello stesso telefono non ci avrebbe aiutato.';
  const conclusion=el('div',undefined,'game-conclusion');
  conclusion.append(el('h3',recovered?'Hai superato la prova!':'La prova è finita: ora sai perché serve una copia esterna.'),el('p',recovered?'Ora puoi iniziare a inserire davvero i tuoi prodotti nell’app. All’inizio potresti sentirti un po’ spaesato: è normale! Con un po’ di pratica farai le cose con più rapidità e sicurezza. Max, Eva e Leo ti accompagneranno con le guide che trovi nelle varie pagine.':'Prima di cominciare con i tuoi prodotti, ricorda: conserva la copia su un altro dispositivo. Puoi riprovare questo ultimo passaggio senza ricominciare tutto il gioco.'));
  const home=el('a','Torna al sito','button');home.href='index.html';conclusion.append(home);
  $('game-controls').append(conclusion,button('Riprova solo i salvataggi',()=>{step=16;broken=false;recovered=false;copy='';render(true);}),button('Ricomincia tutto il gioco',reset));
 }
 function render(focus=false){
  const m=missions[step];if(step===17)broken=true;
  $('game-progress').textContent=m.ending?'Prova conclusa':`Passaggio ${step+1} di ${missions.length-1}`;
  $('game-speaker').textContent=m.who;$('game-question').textContent=typeof m.q==='function'?m.q():m.q||'';$('game-hint').textContent=m.hint||'';
  $('game-controls').replaceChildren();$('game-feedback').textContent='';$('game-next').hidden=true;
  if(m.form!==undefined)productForm(m.form);else if(m.slider)partialControl();else if(m.ending)ending();else m.choices.forEach(label=>$('game-controls').append(button(label,()=>{
   if(!m.branch&&label!==m.right){feedback('Quasi! '+m.hint+' Riprova: non hai perso i progressi.',false);return;}
   if(m.editor){editControl(m.editor);return;}
   if(m.act)m.act(label);
   $('game-controls').querySelectorAll('button').forEach(n=>n.disabled=true);
   feedback(m.branch?'Scelta registrata. Ora immaginiamo un guasto futuro, indipendente dal salvataggio, e proviamo a ripartire su un telefono nuovo.':step===17?(recovered?'Abbiamo la copia su un altro dispositivo: nel nuovo telefono usiamo Importa dispensa.':'Non c’è una copia esterna accessibile: sul telefono nuovo non ritroviamo i dati.'):'Giusto! Puoi procedere.',true);
   $('game-next').hidden=false;display();
  })));
  display();if(focus)$('game-question').focus();
 }
 function reset(){step=0;stock=[];moved=false;partial=false;note=false;removed=false;checked=false;copy='';broken=false;recovered=false;render(true);}
 $('game-next').addEventListener('click',()=>{step++;render(true);});$('game-restart').addEventListener('click',()=>{if(window.confirm('Vuoi ricominciare? Perderai soltanto i progressi di questo gioco.'))reset();});
 if(window.location && window.location.hash==='#prova-salvataggi'){
  stock=[{name:'Acqua della prova',qty:6,place:'dispensa',image:'../assets/gioco-bottiglia-acqua.png'},{name:'Latte della prova',qty:1,place:'frigorifero',image:'../assets/gioco-cartone-latte.png'},{name:'Pane della prova',qty:1,place:'dispensa',image:''}];
  moved=true;partial=31;note='Riservato per domenica';removed=true;checked=true;step=15;
 }
 render();
})();
