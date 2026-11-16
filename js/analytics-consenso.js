/* Analytics removed. Local cleanup only; no network or consent UI. */
(() => {
  'use strict';
  window['ga-disable-G-VW48DQ1C2S'] = true;
  try { localStorage.removeItem('eatmefirst_analytics_consent_v1'); } catch (_) {}
  const parts = location.pathname.split('/'), paths = new Set(['/']);
  for (let i=1;i<parts.length;i++) { const p=parts.slice(0,i).join('/')||'/'; paths.add(p);paths.add(p.replace(/\/$/,'')+'/'); }
  for (const c of document.cookie.split(';')) {
    const name=c.split('=')[0].trim(); if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const d of ['',location.hostname,'.'+location.hostname]) for (const p of paths)
      document.cookie=name+'=; Max-Age=0; path='+p+(d?'; domain='+d:'')+'; SameSite=Lax';
  }
})();
