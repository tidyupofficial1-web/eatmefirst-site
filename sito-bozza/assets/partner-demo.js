"use strict";
(() => {
 const play = document.getElementById('play');
 let timer;
 if(play) play.addEventListener('click', () => {
  if(timer) return;
  document.body.classList.add('show-sponsor');
  document.querySelector('.intro-card').classList.add('playing');
  document.getElementById('status').textContent = 'Presentazione sponsor: dieci secondi, poi il menu.';
  timer = setTimeout(() => { window.location.href = 'menu-partner-demo.html'; },10000);
 });
 const shop = document.getElementById('shop');
 if(shop) shop.addEventListener('click', () => { document.getElementById('shop-result').textContent = 'Qui si aprirà il vostro sito. CasaLieve Market è un marchio inventato: questo è soltanto un esempio.'; });
 window.addEventListener('pagehide', () => { clearTimeout(timer); timer=null; document.body.classList.remove('show-sponsor'); document.querySelector('.intro-card')?.classList.remove('playing'); });
})();
