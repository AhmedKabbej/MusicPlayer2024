// ── Add Track + MusicBrainz API Recognition ──
// Handles the "+" button modal: MP3 & image drop zones, MusicBrainz auto-detection,
// form validation, and track submission.

import gsap from "gsap";
import { lookupTrack } from "./musicAPI.js";

/**
 * Setup the add-track modal with drag-and-drop and API recognition.
 * @param {object} player — the MusicPlayer instance
 */
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
  let apiData = null; // MusicBrainz lookup result

  // ── Validation ──
  const validate = () => {
    submitBtn.disabled = !(mp3File && imgFile && inputTitle.value.trim());
    errorEl.textContent = '';
  };

  // ── Dropzone helper ──
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

  // ── MP3 dropzone + MusicBrainz lookup ──
  setupDropzone(dropMp3, inputMp3, 'audio', (file) => {
    mp3File = file;
    mp3Filename.textContent = file.name;
    dropMp3.classList.add('has-file');
    if (!inputTitle.value.trim()) {
      inputTitle.value = file.name.replace(/\.mp3$/i, '');
    }
    validate();

    // MusicBrainz API lookup
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

  // ── Image dropzone (square validation) ──
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

  // ── Open modal ──
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

  // ── Close modal ──
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

  // ── Submit ──
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
      color: '#f5e6d0',
      desc: apiData ? apiData.desc : 'Morceau ajouté manuellement.'
    };

    player.tracks.push(newTrack);
    player.rebuildCarousel();
    player.customTrackAdded = true;
    openBtn.classList.add('disabled');

    // Reset form
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
