// ── Modale ajout de piste (bouton "+") ──
// gère les zones de drop MP3/image, la recherche MusicBrainz et la soumission

import gsap from "gsap";
import { lookupTrack } from "./musicAPI.js";

// couleur dominante = couleur la plus fréquente (quantifiée) dans l'image
function getDominantColor(imageURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // on regroupe chaque pixel dans un bucket de 32 et on compte les occurrences
      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        const brightness = data[i] + data[i + 1] + data[i + 2];
        if (brightness < 60 || brightness > 700) continue; // ignore noir/blanc
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      // on prend le bucket le plus fréquent
      let maxCount = 0, dominant = null;
      for (const [key, count] of Object.entries(buckets)) {
        if (count > maxCount) { maxCount = count; dominant = key; }
      }

      if (!dominant) { resolve('#f5e6d0'); return; }

      const [r, g, b] = dominant.split(',').map(Number);
      resolve(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
    };
    img.onerror = () => resolve('#f5e6d0');
    img.src = imageURL;
  });
}

// initialise la modale d'ajout avec drag-and-drop + reconnaissance API
export function setupAddTrack(player) {
  const overlay = document.getElementById('add-track-overlay');
  const panel = overlay.querySelector('.add-track-panel');
  const openBtn = document.getElementById('add-track-btn');
  const closeBtn = document.getElementById('add-track-close');
  const submitBtn = document.getElementById('add-track-submit');
  const errorEl = document.getElementById('add-track-error');
  const inputMp3 = document.getElementById('input-mp3');
  const inputImg = document.getElementById('input-img');
  const inputTitle = document.getElementById('input-title');
  const dropMp3 = document.getElementById('dropzone-mp3');
  const dropImg = document.getElementById('dropzone-img');
  const mp3Filename = document.getElementById('mp3-filename');
  const imgFilename = document.getElementById('img-filename');
  const lookupStatus = document.getElementById('api-lookup-status');

  let mp3File = null;
  let imgFile = null;
  let apiData = null;

  // vérifie que les 3 champs sont remplis avant d'activer le bouton
  const validate = () => {
    submitBtn.disabled = !(mp3File && imgFile && inputTitle.value.trim());
    errorEl.textContent = '';
  };

  // helper : branche click + drag/drop sur une zone
  const setupDropzone = (zone, input, acceptType, onFile) => {
    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith(acceptType)) {
        onFile(file);
      } else {
        errorEl.textContent = acceptType === 'audio' ? 'Fichier MP3 requis' : 'Fichier image requis';
      }
    });
    input.addEventListener('change', () => {
      if (input.files[0]) onFile(input.files[0]);
    });
  };

  // zone MP3 : au drop on lance aussi la recherche MusicBrainz
  setupDropzone(dropMp3, inputMp3, 'audio', (file) => {
    mp3File = file;
    mp3Filename.textContent = file.name;
    dropMp3.classList.add('has-file');
    if (!inputTitle.value.trim()) {
      inputTitle.value = file.name.replace(/\.mp3$/i, '');
    }
    validate();

    // recherche auto sur MusicBrainz
    apiData = null;
    lookupStatus.textContent = 'Recherche dans MusicBrainz...';
    lookupStatus.className = 'api-lookup-status searching';
    lookupTrack(file.name).then(result => {
      if (result && result.found) {
        apiData = result;
        inputTitle.value = result.title;
        lookupStatus.textContent = `✓ Trouvé : ${result.artist} — ${result.album}`;
        lookupStatus.className = 'api-lookup-status found';
      } else {
        lookupStatus.textContent = 'Aucun résultat — métadonnées par défaut';
        lookupStatus.className = 'api-lookup-status not-found';
      }
      validate();
    });
  });

  // zone image : on vérifie que c'est bien une image carrée
  setupDropzone(dropImg, inputImg, 'image', (file) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const ratio = img.width / img.height;
      if (ratio < 0.95 || ratio > 1.05) {
        errorEl.textContent = 'Seules les images carrées sont acceptées (ratio ' + ratio.toFixed(2) + ':1)';
        return;
      }
      imgFile = file;
      imgFilename.textContent = file.name;
      dropImg.classList.add('has-file');
      validate();
    };
    img.src = URL.createObjectURL(file);
  });

  inputTitle.addEventListener('input', validate);

  // ouverture de la modale (max 1 piste custom)
  openBtn.addEventListener('click', () => {
    if (player.customTrackAdded) {
      errorEl.textContent = 'Limite atteinte : 1 morceau personnalisé maximum';
      gsap.fromTo(openBtn, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
      return;
    }
    overlay.classList.add('active');
    gsap.to(overlay, { background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(panel,
      { opacity: 0, clipPath: 'inset(40% 40% 40% 40% round 16px)' },
      { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.7, ease: 'power4.out' }
    );
  });

  // fermeture avec animation GSAP
  const closeModal = () => {
    const tl = gsap.timeline({
      onComplete: () => {
        overlay.classList.remove('active');
        gsap.set(overlay, { background: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' });
      }
    });
    tl.to(panel, { clipPath: 'inset(30% 30% 30% 30% round 16px)', opacity: 0, duration: 0.4, ease: 'power3.in' });
    tl.to(overlay, { background: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)', duration: 0.3, ease: 'power2.in' }, '-=0.2');
  };

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // soumission : crée l'objet track + détecte la couleur dominante de la cover
  submitBtn.addEventListener('click', async () => {
    if (!mp3File || !imgFile || !inputTitle.value.trim()) return;

    const audioURL = URL.createObjectURL(mp3File);
    const imageURL = URL.createObjectURL(imgFile);
    const title = inputTitle.value.trim();

    const dominantColor = await getDominantColor(imageURL);

    const newTrack = {
      id: player.tracks.length + 1,
      title: apiData ? apiData.title : title,
      url: audioURL,
      img: imageURL,
      artist: apiData ? apiData.artist : title,
      album: apiData ? apiData.album : 'Custom',
      color: dominantColor,
      desc: apiData ? apiData.desc : 'Morceau ajouté manuellement.'
    };

    player.tracks.push(newTrack);
    player.rebuildCarousel();
    player.customTrackAdded = true;
    openBtn.classList.add('disabled');

    // reset du formulaire
    mp3File = null;
    imgFile = null;
    apiData = null;
    inputTitle.value = '';
    mp3Filename.textContent = '';
    imgFilename.textContent = '';
    dropMp3.classList.remove('has-file');
    dropImg.classList.remove('has-file');
    submitBtn.disabled = true;
    lookupStatus.textContent = '';
    lookupStatus.className = 'api-lookup-status';

    closeModal();
  });
}
