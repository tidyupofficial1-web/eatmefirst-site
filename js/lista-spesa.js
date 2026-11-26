/* Shopping list, errands and notes. The storage schema is shared by every language. */
const shoppingMessages = window.EatListaTesti?.[document.documentElement.lang];
const shoppingText = (value, fallback = value) => shoppingMessages?.[value] ?? fallback;
function shoppingError(message) {
    return shoppingMessages?.errors?.[message] ?? shoppingMessages?.genericError ?? EatErroriEN(message);
}
    // VAR GLOBALI
    const KEY_SPESA = 'eat_lista_spesa_v1';
    const KEY_TODO = 'eat_cose_da_fare_v1';
    const KEY_NOTES = 'eat_bacheca_notes_v1';

    const statoListe = {};
    let ultimoErroreListe = '';
    let notaSenzaSpazio = null;
    function loadArray(key) {
      try {
        const value = EatStorico.leggi(key);
        statoListe[key] = localStorage.getItem(key);
        return Array.isArray(value) ? value : [];
      } catch (error) {
        console.error('Impossibile leggere i dati locali:', key, error);
        return [];
      }
    }

    function saveArray(key, value) {
      ultimoErroreListe = '';
      try {
        const prima = EatStorico.leggi(key);
        const cambiata = value.find(v => !prima.some(p => p.id === v.id && JSON.stringify(p) === JSON.stringify(v))) || prima.find(p => !value.some(v => v.id === p.id));
        const nome = cambiata?.nome || cambiata?.text?.slice(0, 100) || 'Post-it';
        const tipo = key === KEY_SPESA ? 'Lista della spesa' : key === KEY_TODO ? 'Cose da fare' : 'Post-it';
        const azione = value.length > prima.length ? shoppingText("Added") : value.length < prima.length ? shoppingText("Removed") : shoppingText("Tick changed");
        const risultati = EatStorico.registra(tipo, `${azione}: ${nome}`, {[key]: value}, {[key]: statoListe[key]});
        value.splice(0, value.length, ...risultati[key]);
        statoListe[key] = localStorage.getItem(key);
        return true;
      } catch (error) {
        ultimoErroreListe = error.message;
        console.error('Impossibile salvare i dati locali:', key, error);
        alert(shoppingText("Change not saved. ") + shoppingError(error.message));
        return false;
      }
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[character]);
    }

    let listaSpesa = loadArray(KEY_SPESA);
    let coseDaFare = loadArray(KEY_TODO);
    let currentPhotoBase64 = null;
    let bachecaNotes = loadArray(KEY_NOTES);
    let videoStream = null;

    function openTab(evt, tabId) {
      stopCamera();
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      evt.currentTarget.classList.add('active');
    }

    // LOGICA LISTA SPESA
    function renderListaSpesa() {
      const ul = document.getElementById('lista-spesa-ul');
      ul.innerHTML = '';

      if (listaSpesa.length === 0) {
        ul.innerHTML = `<li style="text-align: center; padding: 20px; color: var(--text-muted); font-style: italic; font-size: 14px;">${shoppingText("Your shopping list is currently empty.")}</li>`;
        return;
      }

      const listaOrdinata = [...listaSpesa].sort((a, b) => a.checked - b.checked);

      listaOrdinata.forEach(item => {
        let classePrio = 'prio-manuale';
        if (item.tipo === 'esaurito') classePrio = 'prio-esaurito';
        if (item.tipo === 'scadenza') classePrio = 'prio-scadenza';

        const giacenzaHTML = (item.tipo === 'scadenza' && item.giacenza != null)
          ? `<span class="qty-tag">${shoppingText('quantity', 'Left: {n} items').replace('{n}', escapeHtml(item.giacenza))}</span>`
          : '';

        const li = document.createElement('li');
        li.className = `item-row ${classePrio} ${item.checked ? 'checked' : ''}`;
        li.innerHTML = `
          <div class="item-left" onclick="toggleCheckSpesa(${item.id})">
            <input type="checkbox" ${item.checked ? 'checked' : ''} onclick="event.stopPropagation(); toggleCheckSpesa(${item.id})">
            <span>${escapeHtml(item.nome)} ${giacenzaHTML}</span>
          </div>
          <button class="btn-delete" onclick="deleteSpesaItem(${item.id})">✕</button>
        `;
        ul.appendChild(li);
      });
    }

    function toggleCheckSpesa(id) {
      const item = listaSpesa.find(i => i.id === id);
      if (item) {
        item.checked = !item.checked;
        if (!saveArray(KEY_SPESA, listaSpesa)) item.checked = !item.checked;
        renderListaSpesa();
      }
    }

    function addManualItem() {
      const input = document.getElementById('input-spesa');
      const val = input.value.trim();
      if (!val) return;

      const item = {
        id: Date.now(),
        nome: val,
        tipo: 'manuale',
        giacenza: null,
        settore: 'Generico',
        checked: false
      };

      listaSpesa.push(item);
      if (!saveArray(KEY_SPESA, listaSpesa)) {
        listaSpesa.pop();
        return;
      }

      input.value = '';
      renderListaSpesa();
    }

    function deleteSpesaItem(id) {
      const precedente = listaSpesa;
      listaSpesa = listaSpesa.filter(i => i.id !== id);
      if (!saveArray(KEY_SPESA, listaSpesa)) listaSpesa = precedente;
      renderListaSpesa();
    }

    // LOGICA COSE DA FARE
    function renderTodo() {
      const ul = document.getElementById('list-todo');
      ul.innerHTML = '';
      coseDaFare.forEach(item => {
        const li = document.createElement('li');
        li.className = `item-row prio-manuale ${item.checked ? 'checked' : ''}`;
        li.innerHTML = `
          <div class="item-left">
            <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleTodo(${item.id})">
            <span>${escapeHtml(item.nome)}</span>
          </div>
          <button class="btn-delete" onclick="deleteTodo(${item.id})">✕</button>
        `;
        ul.appendChild(li);
      });
    }

    function toggleTodo(id) {
      const item = coseDaFare.find(i => i.id === id);
      if (!item) return;
      item.checked = !item.checked;
      if (!saveArray(KEY_TODO, coseDaFare)) item.checked = !item.checked;
      renderTodo();
    }

    function deleteTodo(id) {
      const precedente = coseDaFare;
      coseDaFare = coseDaFare.filter(i => i.id !== id);
      if (!saveArray(KEY_TODO, coseDaFare)) coseDaFare = precedente;
      renderTodo();
    }

    function addTodoItem() {
      const input = document.getElementById('input-todo');
      const val = input.value.trim();
      if (!val) return;

      coseDaFare.push({ id: Date.now(), nome: val, checked: false });
      if (!saveArray(KEY_TODO, coseDaFare)) {
        coseDaFare.pop();
        return;
      }
      input.value = '';
      renderTodo();
    }

    // LOGICA FOTOCAMERA LIVE & FILE UPLOAD
    async function startCamera() {
      const box = document.getElementById('camera-stream-box');
      const video = document.getElementById('video-elem');
      box.style.display = 'block';

      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = videoStream;
      } catch (err) {
        alert(shoppingText("Could not access the camera. Check browser permissions."));
        box.style.display = 'none';
      }
    }

    function stopCamera() {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
      }
      document.getElementById('camera-stream-box').style.display = 'none';
    }

    let letturaFoto = 0;
    let fotoInPreparazione = false;
    function fotoLeggera(sorgente, larghezza, altezza) {
      const rapporto = Math.min(1, 1280 / Math.max(larghezza, altezza));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(larghezza * rapporto));
      canvas.height = Math.max(1, Math.round(altezza * rapporto));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sorgente, 0, 0, canvas.width, canvas.height);
      const foto = canvas.toDataURL('image/jpeg', 0.8);
      if (!foto.startsWith('data:image/jpeg') || foto.length > 600000) throw Error('Questa immagine è ancora troppo pesante. Prova un ritaglio più piccolo.');
      return foto;
    }

    function takeSnapshot() {
      const video = document.getElementById('video-elem');
      try { currentPhotoBase64 = fotoLeggera(video, video.videoWidth || 640, video.videoHeight || 480); }
      catch (errore) { alert(shoppingError(errore.message)); return; }
      letturaFoto++;
      fotoInPreparazione = false;
      document.getElementById('img-preview').src = currentPhotoBase64;
      document.getElementById('foto-preview-container').style.display = 'block';

      stopCamera();
    }

    function previewImage(event) {
      const file = event.target.files[0];
      if (file) {
        const richiesta = ++letturaFoto;
        fotoInPreparazione = true;
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = () => {
            if (richiesta !== letturaFoto) return;
            try {
              const foto = fotoLeggera(img, img.naturalWidth, img.naturalHeight);
              // Mantiene l’originale se è già più piccolo della versione ridotta.
              currentPhotoBase64 = e.target.result.length < foto.length ? e.target.result : foto;
              document.getElementById('img-preview').src = currentPhotoBase64;
              document.getElementById('foto-preview-container').style.display = 'block';
            } catch (errore) { alert(shoppingError(errore.message)); }
            finally { fotoInPreparazione = false; }
          };
          img.onerror = () => { if (richiesta === letturaFoto) { fotoInPreparazione = false; alert(shoppingText("Could not read the image. Choose a JPEG, PNG or WebP photo.")); } };
          img.src = e.target.result;
        }
        reader.onerror = () => { if (richiesta === letturaFoto) { fotoInPreparazione = false; alert(shoppingText("Could not read the photo.")); } };
        reader.readAsDataURL(file);
      }
    }

    function clearPhoto() {
      letturaFoto++;
      fotoInPreparazione = false;
      currentPhotoBase64 = null;
      document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
      document.getElementById('foto-preview-container').style.display = 'none';
      stopCamera();
    }

    function savePostItNote() {
      if (fotoInPreparazione) { alert(shoppingText("Please wait while the photo is prepared.")); return; }
      const text = document.getElementById('note-text').value.trim();
      if (!text && !currentPhotoBase64) {
        alert(shoppingText("Enter some text or take a photo before saving."));
        return;
      }

      const note = {
        id: Date.now(),
        text: text,
        photo: currentPhotoBase64,
        date: new Date().toLocaleDateString(document.documentElement.lang)
      };
      bachecaNotes.push(note);
      if (!saveArray(KEY_NOTES, bachecaNotes)) {
        bachecaNotes.pop();
        return;
      }

      document.getElementById('note-text').value = '';
      clearPhoto();
      renderBacheca();
    }

    function renderBacheca() {
      const bacheca = document.getElementById('postit-bacheca');
      bacheca.innerHTML = '';

      if (bachecaNotes.length === 0) {
        bacheca.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 15px; color: var(--text-muted); font-style: italic; font-size: 13.5px;">${shoppingText("No notes or photos on your noticeboard.")}</div>`;
        return;
      }

      bachecaNotes.forEach(note => {
        const card = document.createElement('div');
        card.style.background = '#fff59d';
        card.style.color = '#333333';
        card.style.padding = '12px';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        card.style.fontSize = '13.5px';
        card.style.position = 'relative';

        let photoHTML = typeof note.photo === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(note.photo)
          ? `<img src="${note.photo}" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 4px; margin-top: 8px;">` : '';
        let textHTML = note.text ? `<p style="word-break: break-word; margin-bottom: 4px;">${escapeHtml(note.text)}</p>` : '';

        card.innerHTML = `
          <button onclick="deleteNote(${note.id})" style="position: absolute; top: 6px; right: 6px; background: none; border: none; font-weight: bold; cursor: pointer; color: #555;">✕</button>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">${escapeHtml(note.date)}</div>
          ${textHTML}
          ${photoHTML}
        `;
        if (photoHTML) {
          const scarica = document.createElement('button');
          scarica.type = 'button';
          scarica.textContent = shoppingText("Download image");
          scarica.style.cssText = 'margin-top:10px;padding:9px 12px;background:#174875;color:#ffffff;border:1px solid #174875;border-radius:6px;font:inherit;font-weight:600;cursor:pointer';
          scarica.onclick = () => scaricaImmaginePostIt(note.photo);
          card.appendChild(scarica);
          if (notaSenzaSpazio === note.id) {
            const elimina = document.createElement('button');
            elimina.type = 'button';
            elimina.textContent = shoppingText("Delete permanently, without recovery");
            elimina.style.cssText = 'display:block;margin-top:8px;padding:10px;background:#a32222;color:white;border:0;border-radius:6px;font:inherit;cursor:pointer';
            elimina.onclick = () => eliminaNotaSenzaRecupero(note.id);
            card.appendChild(elimina);
          }
        }
        bacheca.appendChild(card);
      });
    }

    function scaricaImmaginePostIt(foto) {
      try {
        const parti = typeof foto === 'string' && foto.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/i);
        if (!parti) throw Error('Immagine non disponibile per il download.');
        const bytes = Uint8Array.from(atob(parti[2]), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], {type: 'image/' + parti[1].toLowerCase()}));
        const link = document.createElement('a');
        link.href = url;
        const estensione = parti[1].toLowerCase() === 'jpeg' ? 'jpg' : parti[1].toLowerCase();
        link.download = 'EatMeFirst-foto-' + Date.now() + '.' + estensione;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (errore) { alert(shoppingText("Image not downloaded. ") + shoppingError(errore.message)); }
    }

    function deleteNote(id) {
      const precedente = bachecaNotes;
      bachecaNotes = bachecaNotes.filter(n => n.id !== id);
      if (!saveArray(KEY_NOTES, bachecaNotes)) {
        bachecaNotes = precedente;
        if (/spazio|quota/i.test(ultimoErroreListe) && precedente.some(n => n.id === id && n.photo)) notaSenzaSpazio = id;
      } else { notaSenzaSpazio = null; }
      renderBacheca();
    }

    function eliminaNotaSenzaRecupero(id) {
      const nota = bachecaNotes.find(n => n.id === id);
      if (!nota || notaSenzaSpazio !== id) return;
      if (!confirm(shoppingText("Permanently delete the note “") + (nota.text || shoppingText("Photo without text")).slice(0, 100) + shoppingText("” and its photo from the noticeboard? You cannot recover them from Last 15 operations. Other data and the photo in your phone gallery are unchanged."))) return;
      try {
        const risultato = EatStorico.eliminaPostItSenzaRecupero(id, statoListe[KEY_NOTES]);
        bachecaNotes = risultato.righe;
        statoListe[KEY_NOTES] = localStorage.getItem(KEY_NOTES);
        notaSenzaSpazio = null;
        renderBacheca();
        alert(risultato.metadatiAggiornati ? shoppingText("Note permanently deleted.") : shoppingText("Note deleted. Could not update the last-modified date: check it before transferring inventory."));
      } catch (errore) { alert(shoppingText("Deletion not completed. ") + shoppingError(errore.message)); }
    }

    function aggiornaPrevisioni() {
      let box = document.getElementById('stato-previsioni');
      if (!box) {
        box = document.createElement('p'); box.id = 'stato-previsioni';
        document.getElementById('lista-spesa-ul').before(box);
      }
      try { box.textContent = EatPrevisioni.aggiorna().testo; }
      catch (errore) { box.textContent = shoppingText("Estimates not updated: ") + shoppingError(errore.message); }
    }
    function aggiornaListe() {
      aggiornaPrevisioni();
      listaSpesa = loadArray(KEY_SPESA);
      coseDaFare = loadArray(KEY_TODO);
      bachecaNotes = loadArray(KEY_NOTES);
      renderListaSpesa(); renderTodo(); renderBacheca();
    }
    window.addEventListener('pageshow', aggiornaListe);
    window.addEventListener('focus', aggiornaListe);
    window.addEventListener('storage', evento => {
      if ([KEY_SPESA, KEY_TODO, KEY_NOTES, 'eat_dispensa_locale', EatStorico.chiaveConsumi, null].includes(evento.key)) setTimeout(aggiornaListe, 100);
    });

    window.addEventListener('DOMContentLoaded', () => {
      aggiornaPrevisioni();
      listaSpesa = loadArray(KEY_SPESA);
      renderListaSpesa();
      renderTodo();
      renderBacheca();
    });
