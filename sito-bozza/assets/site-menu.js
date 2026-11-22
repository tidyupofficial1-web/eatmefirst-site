(() => {
  const menu = document.querySelector('.site-menu');
  if (menu) {
    const narrow = window.matchMedia('(max-width: 700px)');
    const adapt = () => { menu.open = !narrow.matches; };
    adapt();
    narrow.addEventListener('change', adapt);
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (narrow.matches) menu.open = false;
      });
    });
  }

  const languages = document.querySelector('.site-header .languages');
  if (!languages) return;

  const destinations = {
    it: ['7710919876461726998', 'DgB3QdJSpvZ', 'Segui EatMeFirst sui social'],
    en: ['7710921592624221442', 'DgCeGJkS6cr', 'Follow EatMeFirst on social media'],
    fr: ['7710921891900378390', 'DgCeSJKSG_3', 'Suivre EatMeFirst sur les réseaux sociaux'],
    de: ['7710922120267631894', 'DgCebr8SYG8', 'EatMeFirst in sozialen Medien folgen'],
    es: ['7710922336672812310', 'DgCeiyxS3iO', 'Sigue a EatMeFirst en redes sociales']
  };
  const language = document.documentElement.lang.slice(0, 2).toLowerCase();
  const [tiktok, instagram, label] = destinations[language] || destinations.it;
  const networks = [
    ['TikTok', 'https://www.tiktok.com/@eatmefirst.app/video/' + tiktok, '#151515',
      '<path fill="currentColor" d="M16 2c.3 2.8 1.8 4.3 4.5 4.5v3.2A8 8 0 0 1 16 8.3v7.2a6 6 0 1 1-6-6c.4 0 .8 0 1.2.1v3.3a2.8 2.8 0 1 0 1.6 2.6V2z"/>'],
    ['Instagram', 'https://www.instagram.com/reel/' + instagram + '/', '#bd286d',
      '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.6" r="1.2" fill="currentColor"/>'],
    ['Facebook', 'https://www.facebook.com/reel/1158473060090301', '#0866ff',
      '<circle cx="12" cy="12" r="11" fill="currentColor"/><path fill="#fff" d="M13.7 23V14h3l.5-3.3h-3.5V8.6c0-1 .4-1.7 1.8-1.7h1.9V4a18 18 0 0 0-2.7-.2c-2.7 0-4.5 1.6-4.5 4.5v2.4h-3V14h3v9z"/>'],
    ['YouTube', 'https://www.youtube.com/channel/UC4NygGfT0cDcOBuraN96vqQ', '#e60000',
      '<rect x="1" y="4" width="22" height="16" rx="5" fill="currentColor"/><path fill="#fff" d="m10 8 6 4-6 4z"/>']
  ];
  let row = languages.closest('.home-header-links');
  if (!row) {
    row = document.createElement('div');
    row.className = 'home-header-links';
    languages.before(row);
    row.append(languages);
  }
  let social = row.querySelector('.home-social-nav');
  if (!social) {
    social = document.createElement('nav');
    social.className = 'home-social-nav';
    row.prepend(social);
  }
  social.setAttribute('aria-label', label);
  social.replaceChildren(...networks.map(([name, href, color, icon]) => {
    const link = document.createElement('a');
    link.href = href;
    link.title = name;
    link.setAttribute('aria-label', name);
    link.style.color = color;
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + icon + '</svg>';
    return link;
  }));
})();
