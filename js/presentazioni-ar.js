for (const intro of document.querySelectorAll('[data-intro]')) {
    const key = 'emf_ar_intro_' + intro.dataset.intro;
    try {
        intro.hidden = localStorage.getItem(key) === 'hidden';
    } catch {
        // The temporary close button still works without browser storage.
    }
    intro.querySelector('[data-intro-close]').addEventListener('click', () => {
        intro.hidden = true;
    });
    intro.querySelector('[data-intro-hide]').addEventListener('click', () => {
        intro.hidden = true;
        try {
            localStorage.setItem(key, 'hidden');
        } catch {
            // Without storage, closing affects only this visit.
        }
    });
}
