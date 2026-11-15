/* Aiuto per creare un collegamento: nessun accesso ai dati della dispensa. */
(()=>{'use strict';
 function start(){
 const host=document.querySelector('.main-wrapper');if(!host)return;
 const box=document.createElement('details');box.style.cssText='margin:18px 0;padding:16px;background:#202b30;border:1px solid #79c0ff;border-radius:12px;color:#fff';
 const title=document.createElement('summary');title.textContent='📱 Vuoi l’icona di EatMeFirst sul telefono o sul PC?';title.style.cursor='pointer';
 const text=document.createElement('p');text.textContent='Con l’icona riapri l’app senza passare ogni volta dal sito. Creala usando lo stesso programma con cui stai usando la dispensa: passando, per esempio, da Brave a Chrome i dati non vengono trasferiti da soli.';
 const steps=document.createElement('p');const ua=navigator.userAgent;
 steps.textContent=/Android/i.test(ua)?'Su Android: apri il menu del browser (di solito i tre puntini), scegli “Aggiungi a schermata Home” oppure “Installa app” e conferma. Il nome del comando può variare.':/iPhone|iPad/i.test(ua)?'Su iPhone o iPad: apri l’app in Safari, premi Condividi, poi “Aggiungi alla schermata Home” e conferma.':'Sul PC: dal menu del browser cerca “Installa”, “App” oppure “Crea collegamento”. Se l’opzione manca, salva questa pagina nei Preferiti per ritrovarla facilmente. La posizione dell’icona dipende dal browser e dal sistema.';
 const tip=document.createElement('p');tip.textContent='L’icona è una scorciatoia per aprire l’app: non è una copia di sicurezza della dispensa. Per quella usa Esporta dispensa e conserva il file su un altro dispositivo.';
 box.append(title,text,steps,tip);host.prepend(box);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
