/* Gioco isolato: solo memoria della pagina; nessuna rete, archivio reale o file. */
(() => {
 'use strict';
 const d=window.EAT_PRACTICE, $=id=>document.getElementById(id);
 if(!d)return;
 let step=0, stock=[], moved=false, rest=100, note='', removed=false, ticked=false, copy=-1, broken=false, restored=false;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const message=(text,ok)=>{$('game-feedback').textContent=text;$('game-feedback').className=ok?'correct':'wrong';};
 const btn=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 const advance=()=>{$('game-next').hidden=false;display();};
 const fmt=(text,...values)=>text.replace(/\{(\d+)\}/g,(_,i)=>values[Number(i)]??'');
 function display(){
  const row=el('div',undefined,'game-device-row');
  if(broken)row.append(el('div',d.dead,'game-phone dead'),el('span','→'),el('div',d.newPhone,'game-phone new'));
  else row.append(el('div',d.phone,'game-phone'));
  $('game-device').replaceChildren(row);const panel=$('game-stock');panel.replaceChildren();
  if(broken&&!restored){panel.append(el('p',d.emptyNew));return;}
  stock.forEach((p,i)=>{if(i===2&&removed)return;const item=el('div',undefined,'game-row');if(p.img){const im=el('img');im.src=p.img;im.alt=p.name;im.width=48;im.height=48;item.append(im);}item.append(el('span',fmt(d.row,p.name,i===0&&moved?p.qty-2:p.qty,p.place)+(i===1&&note?' · 📌 '+note:'')));panel.append(item);if(i===0&&moved)panel.append(el('div',fmt(d.fridgeRow,p.name,rest),'game-row'));});
  if(!stock.length)panel.append(el('p',d.empty));
  if(removed)panel.append(el('div',(ticked?'☑ ':'☐ ')+d.commands[3]+': '+stock[2].name,'game-row spesa'+(ticked?' checked':'')));
  if(copy>=0)panel.append(el('p',d.copyLabel+': '+d.copyOptions[copy],'game-copy'));
 }
 function field(form,label,type='text',value=''){
  const n=el('input'),l=el('label',label);n.id='practice-field-'+form.querySelectorAll('input,select').length;n.type=type;n.required=true;n.value=value;l.htmlFor=n.id;if(type==='number'){n.min=1;n.max=999;n.step=1;}else n.maxLength=180;form.append(l,n);return n;
 }
 function submit(form,label,fn){const b=el('button',label);b.type='submit';form.append(b);let saved=false;form.addEventListener('submit',ev=>{ev.preventDefault();if(saved||!form.reportValidity())return;if(fn()===false)return;saved=true;form.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);message(d.correct,true);advance();});}
 function product(index){
  const form=el('form',undefined,'game-form'),p=index<2?d.products[index]:null;let code,recognised=!p;
  if(p){form.append(el('p',fmt(d.scanHelp,p.code)));code=field(form,d.barcode);code.inputMode='numeric';code.maxLength=13;form.prepend(btn(d.scan,()=>code.focus()));}
  else form.append(el('p',d.manualHelp));
  const image=el('img',undefined,'game-product-image');image.hidden=true;image.width=160;image.height=160;form.append(image);
  const name=field(form,d.name),category=field(form,d.category),packs=field(form,d.packs,'number'),pieces=field(form,d.pieces,'number'),place=field(form,d.place);
  if(p){name.readOnly=true;category.readOnly=true;code.addEventListener('input',()=>{recognised=code.value.trim()===p.code;name.value=recognised?p.name:'';category.value=recognised?p.category:'';pieces.value=recognised?p.pieces:'';image.hidden=!recognised;if(recognised){image.src=p.img;image.alt=p.name;}message(recognised?d.found:d.codeHint,recognised);});}
  submit(form,d.saveProduct,()=>{const n=Number(packs.value)*Number(pieces.value);if(!recognised){message(d.codeHint,false);return false;}if(!name.value.trim()||!category.value.trim()||!place.value.trim()||!Number.isInteger(Number(packs.value))||!Number.isInteger(Number(pieces.value))||n<1||(index===0&&n<3)){message(d.quantityHint,false);return false;}stock.push({name:name.value.trim(),qty:n,place:place.value.trim(),img:p?p.img:''});});
  $('game-controls').append(form);
 }
 function editor(kind){
  $('game-controls').replaceChildren();const form=el('form',undefined,'game-form');
  if(kind==='move'){
   form.append(el('p',d.moveHelp));const number=field(form,d.moveCount,'number');const label=el('label',d.destination),select=el('select');select.id='practice-destination';label.htmlFor=select.id;select.required=true;['',...d.locations].forEach((s,i)=>{const o=el('option',i?s:d.choose);o.value=String(i);select.append(o);});select.firstChild.value='';form.append(label,select);
   submit(form,d.confirmMove,()=>{if(Number(number.value)!==2||select.value!=='1'){message(d.moveHelp,false);return false;}moved=true;});
  }else if(kind==='partial'){
   const label=el('label',d.remaining),range=el('input'),out=el('output','50%');range.id='practice-remaining';label.htmlFor=range.id;range.type='range';range.min=0;range.max=100;range.step=1;range.value=50;out.htmlFor=range.id;range.addEventListener('input',()=>{out.textContent=range.value+'%';range.setAttribute('aria-valuetext',range.value+'%');});form.append(label,range,out,el('p',d.partialHelp));submit(form,d.confirmPartial,()=>{const n=Number(range.value);if(n<1||n>99){message(d.partialHelp,false);return false;}rest=n;});
  }else{form.append(el('p',d.noteHelp));const input=field(form,d.note);submit(form,d.saveNote,()=>{if(!input.value.trim()){message(d.noteHelp,false);return false;}note=input.value.trim();});}
  $('game-controls').append(form);
 }
 const choices={0:[0,1,2,3,4],4:[0,1,2,3,4],5:[5,6,7],6:[5,7,0],8:[8,5,3],9:[0,1,2,3,4],10:[6,5,8],11:[9,0,7],12:[10,6],13:[0,1,2,3,4],14:[11,6,13],15:[12,13,14],17:[15]};
 const answers={0:0,4:1,5:6,6:7,8:8,9:2,10:5,11:9,12:10,13:3,14:11,15:12,17:15};
 function ending(){
  $('game-question').textContent=restored?d.win:d.loss;
  $('game-hint').textContent=restored?d.recoverHelp:d.lossHelp;
  const box=el('div',undefined,'game-conclusion');box.append(el('h3',restored?d.passed:d.finished),el('p',restored?d.passedHelp:d.retryHelp));const a=el('a',d.home,'button');a.href='index.html';box.append(a);$('game-controls').append(box,btn(d.retryCopy,()=>{step=16;broken=false;restored=false;copy=-1;render();}),btn(d.restart,reset));
 }
 function render(){
  if(step===17)broken=true;
  $('game-progress').textContent=step===18?d.finished:fmt(d.progress,step+1,18);
  const speakers=d.speakers||['Max','Eva','Leo'];
  $('game-speaker').textContent=speakers[[0,0,1,2,1,2,1,2,0,1,2,0,1,2,1,0,2,1,2][step]];
  $('game-question').textContent=d.questions[step]||'';$('game-hint').textContent=d.hints[step]||'';
  $('game-controls').replaceChildren();$('game-feedback').textContent='';$('game-next').hidden=true;
  if(step>=1&&step<=3)product(step-1);
  else if(step===7)editor('partial');
  else if(step===18)ending();
  else if(step===16)d.copyOptions.forEach((s,i)=>$('game-controls').append(btn(s,()=>{copy=i;$('game-controls').querySelectorAll('button').forEach(b=>b.disabled=true);message(d.copyHelp,true);advance();})));
  else choices[step].forEach(i=>$('game-controls').append(btn(d.commands[i],()=>{
   if(i!==answers[step]){message(d.tryAgain,false);return;}
   if(step===5){editor('move');return;}if(step===8){editor('note');return;}
   if(step===10||step===12)removed=true;if(step===11)removed=false;if(step===14)ticked=true;if(step===17)restored=copy===0;
   $('game-controls').querySelectorAll('button').forEach(b=>b.disabled=true);message(d.correct,true);advance();
  })));
  display();$('game-question').focus();
 }
 function reset(){step=0;stock=[];moved=false;rest=100;note='';removed=false;ticked=false;copy=-1;broken=false;restored=false;render();}
 $('game-next').addEventListener('click',()=>{step++;render();});$('game-restart').addEventListener('click',()=>{if(window.confirm(d.restartConfirm))reset();});
 if(window.location.hash==='#prova-salvataggi'){stock=[{name:d.products[0].name,qty:6,place:d.pantry,img:d.products[0].img},{name:d.products[1].name,qty:1,place:d.locations[0],img:d.products[1].img},{name:d.bread,qty:1,place:d.pantry,img:''}];moved=true;rest=31;note=d.sunday;removed=true;ticked=true;step=15;}
 render();
})();
