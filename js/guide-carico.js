/* Le guide si aprono senza abbandonare il modulo e senza salvare una bozza. */
(() => {
    const labels = {it:'Chiudi guida',en:'Close guide',fr:'Fermer le guide',de:'Anleitung schließen',es:'Cerrar guía'};
    const label = labels[document.documentElement.lang.slice(0,2)] || labels.en;
    let dialog, frame, trigger;
    function close() { dialog.close(); frame.src = 'about:blank'; trigger?.focus(); }
    function create() {
        dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', label);
        dialog.style.cssText = 'width:min(980px,94vw);height:88vh;padding:12px;border:2px solid #79c0ff;border-radius:12px;background:#12181b;color:white;';
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = '✕ ' + label;
        button.style.cssText = 'padding:10px 18px;margin-bottom:8px;font:inherit;cursor:pointer;background:#263640;color:white;border:1px solid #79c0ff;border-radius:8px;';
        button.addEventListener('click',close);
        frame = document.createElement('iframe');
        frame.title = label; frame.style.cssText = 'display:block;width:100%;height:calc(100% - 55px);border:0;background:#12181b;';
        frame.addEventListener('load', () => {
            try {
                frame.contentDocument.addEventListener('click',event => {
                    const link=event.target.closest('a[href]');
                    if(link && new URL(link.href).pathname===location.pathname){event.preventDefault();close();}
                });
            } catch (_) { /* La guida resta chiudibile dal pulsante esterno. */ }
        });
        dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
        dialog.append(button,frame);document.body.append(dialog);
    }
    document.addEventListener('click',event => {
        const link=event.target.closest('a.postit-link[href]');
        if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !window.HTMLDialogElement)return;
        const url=new URL(link.href,location.href);
        if(url.origin!==location.origin)return;
        event.preventDefault();trigger=link;
        if(!dialog)create();
        frame.src=url.href;dialog.showModal();
    });
})();
