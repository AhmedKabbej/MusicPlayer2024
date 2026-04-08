// ── Modale ajout de piste (bouton "+") ──
// gère les zones de drop MP3/image, la recherche MusicBrainz et la soumission

import gsap from "gsap";
import { lookupTrack } from "./musicAPI.js";

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
  let detectedColor = '#f5e6d0';

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

  // zone image : on vérifie que c'est carré + on détecte la couleur dominante
  setupDropzone(dropImg, inputImg, 'image', (file) => {
    // FileReader lit le fichier en base64 → pas de souci CORS ni blob tainted
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        // check ratio carré (tolérance ±5%)
        const ratio = img.width / img.height;
        if (ratio < 0.95 || ratio > 1.05) {
          errorEl.textContent = 'Seules les images carrées sont acceptées (ratio ' + ratio.toFixed(2) + ':1)';
          return;
        }

        // ── Détection de la couleur dominante ──
        // 1) on dessine l'image sur un petit canvas pour lire ses pixels
        const canvas = document.createElement('canvas');
        const sz = 100;
        canvas.width = sz;
        canvas.height = sz;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, sz, sz);
        const pixels = ctx.getImageData(0, 0, sz, sz).data;

        // 2) on regroupe les pixels par "bucket" de couleur (arrondi à 32)
        //    → chaque pixel tombe dans un des ~32k groupes possibles
        //    on ignore les pixels trop sombres (noir) ou trop clairs (blanc)
        const buckets = {};
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          // luminosité perceptuelle (formule standard)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < 20 || lum > 235) continue;
          // arrondi par bitshift : 237 → 224, 100 → 96, etc.
          const key = `${(r >> 5) << 5},${(g >> 5) << 5},${(b >> 5) << 5}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }

        // 3) on prend le bucket avec le plus de pixels = couleur dominante
        let maxCount = 0, bestBucket = null;
        for (const [key, count] of Object.entries(buckets)) {
          if (count > maxCount) { maxCount = count; bestBucket = key; }
        }

        if (bestBucket) {
          // 4) on fait la vraie moyenne RGB de tous les pixels de ce bucket
          //    pour avoir une couleur plus précise que le bucket arrondi
          const [br, bg, bb] = bestBucket.split(',').map(Number);
          let sumR = 0, sumG = 0, sumB = 0, n = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            if (((r >> 5) << 5) === br && ((g >> 5) << 5) === bg && ((b >> 5) << 5) === bb) {
              sumR += r; sumG += g; sumB += b; n++;
            }
          }
          const avgR = Math.round(sumR / n);
          const avgG = Math.round(sumG / n);
          const avgB = Math.round(sumB / n);
          // conversion RGB → hex : ex. (66, 135, 245) → "#4287f5"
          detectedColor = '#' + ((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1);
        } else {
          detectedColor = '#f5e6d0'; // fallback beige si aucun pixel valide
        }

        console.log('[addTrack] couleur dominante =', detectedColor);

        imgFile = file;
        imgFilename.textContent = file.name;
        dropImg.classList.add('has-file');
        validate();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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

  // soumission : crée l'objet track avec la couleur détectée au drop
  submitBtn.addEventListener('click', () => {
    if (!mp3File || !imgFile || !inputTitle.value.trim()) return;

    const audioURL = URL.createObjectURL(mp3File);
    const imageURL = URL.createObjectURL(imgFile);
    const title = inputTitle.value.trim();

    const newTrack = {
      id: player.tracks.length + 1,
      title: apiData ? apiData.title : title,
      url: audioURL,
      img: imageURL,
      artist: apiData ? apiData.artist : title,
      album: apiData ? apiData.album : 'Custom',
      color: detectedColor,
      desc: apiData ? apiData.desc : 'Morceau ajouté manuellement.'
    };

    player.tracks.push(newTrack);
    // on navigue vers la nouvelle piste pour que les blobs prennent sa couleur
    player.currentTrackIndex = player.tracks.length - 1;
    player.rebuildCarousel();
    player.updateLavaColors();
    player.customTrackAdded = true;
    openBtn.classList.add('disabled');

    // reset du formulaire
    mp3File = null;
    imgFile = null;
    apiData = null;
    detectedColor = '#f5e6d0';
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
