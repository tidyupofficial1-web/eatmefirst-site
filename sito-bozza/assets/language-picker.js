(() => {
    const translations = {
        it: ["it","Una casa più organizzata.","Cominciamo da qui.","Scegli la lingua."],
        en: ["en","A more organised home.","Let’s start here.","Choose your language."],
        fr: ["fr","Une maison mieux organisée.","Commençons ici.","Choisissez votre langue."],
        de: ["de","Ein besser organisiertes Zuhause.","Fangen wir hier an.","Wähle deine Sprache."],
        es: ["es","Un hogar más organizado.","Empecemos por aquí.","Elige tu idioma."],
        pt: ["pt-BR","Uma casa mais organizada.","Vamos começar por aqui.","Escolha seu idioma."],
        ja: ["ja","もっとすっきりした暮らしへ。","ここから始めましょう。","言語を選んでください。"],
        ar: ["ar","منزل أكثر ترتيبًا.","لنبدأ من هنا.","اختر لغتك."],
    };

    const preferences = [navigator.language, ...(navigator.languages || [])];
    const language = preferences
        .map(locale => (locale || '').toLowerCase().split('-')[0])
        .find(code => Object.hasOwn(translations, code)) || 'en';
    const [tag, firstLine, secondLine, instruction] = translations[language];
    document.documentElement.lang = tag;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.querySelector('h1').replaceChildren(firstLine, document.createElement('br'), secondLine);
    document.getElementById('language-picker-label').textContent = instruction;
    document.querySelector('.page-intro .brand').href = document.querySelector('nav a[lang="' + tag + '"]').href;
})();
