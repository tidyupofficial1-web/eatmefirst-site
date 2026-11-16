(function () {
  'use strict';
  const KEY = 'eatmefirst_menu_spots_v1';
  function dayKey(now) {
    const d = new Date(now);
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function eligible(state, config, now) {
    if (!state || !Number.isInteger(state.count) || state.count < 0 || !Number.isFinite(state.last) || state.last < 0) return false;
    const limit = Math.min(5, Math.max(0, Number(config.dailyLimit) || 0));
    const interval = Math.max(30, Number(config.minIntervalMinutes) || 30) * 60000;
    return (state.day !== dayKey(now) || state.count < limit) && (!state.last || now - state.last >= interval);
  }
  function choose(config, lang, now, lastId, random = Math.random) {
    if (!config.enabled) return null;
    const active = (config.campaigns || []).filter(c => c.enabled && c.languages?.includes(lang) && c.videos?.[lang]
      && Number.isFinite(Date.parse(c.startsAt)) && Number.isFinite(Date.parse(c.endsAt))
      && Date.parse(c.startsAt) <= now && now < Date.parse(c.endsAt));
    // Ambiguous overlapping bookings do not select an arbitrary sponsor.
    if (active.length === 1) return { item: active[0], sponsor: true };
    let own = (config.ownContent || []).filter(c => c.enabled && c.videos?.[lang]);
    if (own.length > 1) own = own.filter(c => c.id !== lastId);
    return own.length ? { item: own[Math.min(own.length-1, Math.floor(random()*own.length))], sponsor: false } : null;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {dayKey, eligible, choose}; return; }
  const config = window.EatMenuSpacesConfig;
  if (!config || !config.enabled) return;
  const root = new URL('../', document.currentScript.src);
  const lang = document.documentElement.lang.toUpperCase();
  const copy = {
    IT:['Un momento con EatMeFirst','Avvia video','Continua alla funzione'],
    EN:['A moment with EatMeFirst','Play video','Continue to your feature'],
    FR:['Un instant avec EatMeFirst','Lire la vidéo','Continuer vers la fonction'],
    DE:['Ein Moment mit EatMeFirst','Video starten','Weiter zur Funktion'],
    ES:['Un momento con EatMeFirst','Reproducir vídeo','Continuar a la función']
  }[lang] || ['EatMeFirst','Play video','Continue'];
  const empty = () => ({day:dayKey(Date.now()), count:0, last:0, lastId:null});
  function read() {
    try { const raw=localStorage.getItem(KEY); return raw ? JSON.parse(raw) : empty(); } catch (_) { return null; }
  }
  function asset(value) {
    try { const u=new URL(value,root);return u.origin===root.origin && u.protocol===root.protocol && u.pathname.startsWith(root.pathname) ? u.href : null; } catch (_) { return null; }
  }
  const banner=document.querySelector('[data-menu-sponsor]');
  function refreshBanner() {
    if (!banner) return;
    banner.hidden=true;banner.replaceChildren();
    const selection=choose(config,lang,Date.now(),null);
    if (!selection?.sponsor) return;
    const b=selection.item.banner;
    if (!b?.name || !asset(selection.item.videos[lang])) return;
    let website;
    try { website=new URL(b.website); if (website.protocol!=='https:') return; } catch (_) { return; }
    banner.href=website.href;banner.target='_blank';banner.rel='noopener noreferrer';
    if (b.logo && asset(b.logo)) {const image=new Image();image.src=asset(b.logo);image.alt='';image.onerror=()=>image.remove();banner.append(image);}
    const text=document.createElement('div'),name=document.createElement('strong'),motto=document.createElement('p'),url=document.createElement('small');
    name.textContent=b.name;motto.textContent=b.motto||'';url.textContent=website.hostname+website.pathname.replace(/\/$/,'');text.append(name,motto,url);banner.append(text);banner.hidden=false;
  }
  refreshBanner();
  let expirationTimer;
  function scheduleBoundary() {
    clearTimeout(expirationTimer);
    const now=Date.now();
    const next=(config.campaigns||[]).flatMap(c=>[Date.parse(c.startsAt),Date.parse(c.endsAt)]).filter(t=>Number.isFinite(t)&&t>now).sort((a,b)=>a-b)[0];
    if(next)expirationTimer=setTimeout(()=>{refreshBanner();scheduleBoundary();},Math.min(2147483647,next-now+20));
  }
  scheduleBoundary();
  window.addEventListener('pageshow',()=>{refreshBanner();scheduleBoundary();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshBanner();scheduleBoundary();}});
  let busy=false;
  async function claim(id) {
    const save=()=>{
      const now=Date.now(),s=read();if(!eligible(s,config,now))return false;
      try {localStorage.setItem(KEY,JSON.stringify({day:dayKey(now),count:(s.day===dayKey(now)?s.count:0)+1,last:now,lastId:id}));return true;} catch(_){return false;}
    };
    try {return navigator.locks ? await navigator.locks.request(KEY,save) : save();} catch(_){return false;}
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('.menu-card');
    if (!link || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target!=='_self')) return;
    refreshBanner();
    const state=read();if(!eligible(state,config,Date.now()))return;
    const selection=choose(config,lang,Date.now(),state.lastId);
    const src=selection && asset(selection.item.videos[lang]);
    if(!src || typeof HTMLDialogElement==='undefined')return;
    event.preventDefault();if(busy)return;busy=true;
    const destination=link.href;
    const dialog=document.createElement('dialog');dialog.className='eat-menu-spot';dialog.setAttribute('aria-label',selection.sponsor ? selection.item.banner?.name||copy[0] : copy[0]);
    const video=document.createElement('video');video.playsInline=true;video.preload='auto';
    const controls=document.createElement('div');controls.className='spot-controls';
    const title=document.createElement('span');title.textContent=dialog.getAttribute('aria-label');
    const play=document.createElement('button');play.textContent=copy[1];play.hidden=true;
    const next=document.createElement('button');next.textContent=copy[2];next.autofocus=true;
    controls.append(title,play,next);dialog.append(video,controls);document.body.append(dialog);
    let done=false,claimed=false,claiming=false,timeout;
    function finish(){if(done)return;done=true;clearTimeout(timeout);video.pause();if(dialog.open)dialog.close();dialog.remove();busy=false;location.assign(destination);}
    // A media failure or cancelled player must never block the selected function.
    next.onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
    video.addEventListener('error',finish);video.addEventListener('ended',finish);
    video.addEventListener('playing',async()=>{
      if(claimed||claiming||done)return;claiming=true;video.pause();
      const ok=await claim(selection.item.id);if(done)return;
      if(!ok){finish();return;}claimed=true;claiming=false;play.hidden=true;
      clearTimeout(timeout);timeout=setTimeout(finish,20000);
      video.play().catch(()=>{play.hidden=false;});
    });
    play.onclick=()=>video.play().then(()=>play.hidden=true).catch(()=>{});
    try {dialog.showModal();timeout=setTimeout(finish,12000);video.src=src;video.play().catch(()=>{play.hidden=false;});} catch(_){finish();}
  });
})();
