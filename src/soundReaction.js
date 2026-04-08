// ── Module Sound Reaction ──
// animation des blobs en réaction au son via Web Audio API

// branche l'audio du player sur un AnalyserNode pour lire les fréquences
export function initAudioAnalyser(player) {
  if (player.audioCtx) return;
  player.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  player.analyser = player.audioCtx.createAnalyser();
  player.analyser.fftSize = 512;
  player.analyser.smoothingTimeConstant = 0.4;
  player.audioSource = player.audioCtx.createMediaElementSource(player.audio);
  player.audioSource.connect(player.analyser);
  player.analyser.connect(player.audioCtx.destination);
  player.freqData = new Uint8Array(player.analyser.frequencyBinCount);
}

// boucle principale : lit les fréquences et anime chaque blob
export function startReactiveLoop(player) {
  if (player.reactiveRAF) cancelAnimationFrame(player.reactiveRAF);

  // personnalité aléatoire de chaque blob (phase, vitesse, rayons)
  if (!player.blobPhases) {
    player.blobPhases = player.lavaBlobs.map(() => ({
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: 0.6 + Math.random() * 0.8,
      speedY: 0.5 + Math.random() * 0.7,
      rotSpeed: (Math.random() - 0.5) * 2.5,
      rotOffset: Math.random() * 360,
      radii: Array.from({ length: 8 }, () => 30 + Math.random() * 30),
      radiiSpeed: Array.from({ length: 8 }, () => 0.5 + Math.random() * 1.2),
      radiiPhase: Array.from({ length: 8 }, () => Math.random() * Math.PI * 2),
    }));
  }

  if (!player.blobSmoothed) {
    player.blobSmoothed = new Float32Array(player.lavaBlobs.length);
  }
  if (!player.blobPrevEnergy) {
    player.blobPrevEnergy = new Float32Array(player.lavaBlobs.length);
  }

  const binCount = player.freqData.length;

  // découpage du spectre en bandes de fréquence
  const subBassEnd = Math.floor(binCount * 0.04);
  const bassEnd    = Math.floor(binCount * 0.12);
  const midEnd     = Math.floor(binCount * 0.4);
  const trebleEnd  = binCount;

  // chaque blob réagit à une zone du spectre
  const blobZones = player.lavaBlobs.map((_, i) => {
    if (i < 2) return { lo: 0, hi: bassEnd };
    if (i < 4) return { lo: subBassEnd, hi: midEnd };
    if (i < 6) return { lo: bassEnd, hi: trebleEnd };
    return { lo: 0, hi: trebleEnd };
  });

  let time = 0;
  let prevGlobal = 0;

  const tick = () => {
    if (!player.isPlaying || !player.analyser || player.reactiveMode === 'off') return;

    player.analyser.getByteFrequencyData(player.freqData);
    time += 0.018;

    // énergies par bande (sub-bass, bass, mids, treble)
    let subBassSum = 0, bassSum = 0, midSum = 0, trebleSum = 0;
    for (let i = 0; i < subBassEnd; i++) subBassSum += player.freqData[i];
    for (let i = subBassEnd; i < bassEnd; i++) bassSum += player.freqData[i];
    for (let i = bassEnd; i < midEnd; i++) midSum += player.freqData[i];
    for (let i = midEnd; i < trebleEnd; i++) trebleSum += player.freqData[i];

    const subBass = subBassSum / (subBassEnd || 1) / 255;
    const bass    = bassSum / (bassEnd - subBassEnd || 1) / 255;
    const mids    = midSum / (midEnd - bassEnd || 1) / 255;
    const treble  = trebleSum / (trebleEnd - midEnd || 1) / 255;

    const globalEnergy = subBass * 0.3 + bass * 0.3 + mids * 0.2 + treble * 0.2;

    // détection de kick (transitoire global)
    const globalDelta = Math.max(0, globalEnergy - prevGlobal);
    const kickThreshold = player.reactiveMode === 'intense' ? 0.02 : 0.06;
    const kickMult = player.reactiveMode === 'intense' ? 7 : 4;
    const kick = globalDelta > kickThreshold ? globalDelta * kickMult : 0;
    prevGlobal = globalEnergy;

    player.lavaBlobs.forEach((blob, i) => {
      const zone = blobZones[i];
      const phase = player.blobPhases[i];
      const base = (player.blobBaseSizes && player.blobBaseSizes[i]) || 150;

      // énergie propre au blob dans sa zone de fréquence
      let bSum = 0;
      for (let j = zone.lo; j < zone.hi; j++) bSum += player.freqData[j];
      const rawE = bSum / (zone.hi - zone.lo) / 255;

      // lissage attaque/release (soft = doux, intense = nerveux)
      const isSoft = player.reactiveMode === 'soft';
      const attack = isSoft ? 0.2 : 0.88;
      const release = isSoft ? 0.04 : 0.18;
      const lerpRate = rawE > player.blobSmoothed[i] ? attack : release;
      player.blobSmoothed[i] += (rawE - player.blobSmoothed[i]) * lerpRate;
      const energy = player.blobSmoothed[i];

      // détection de transitoire par blob
      const delta = Math.max(0, energy - player.blobPrevEnergy[i]);
      const transient = delta > (isSoft ? 0.03 : 0.008) ? delta * (isSoft ? 1.5 : 8) : 0;
      player.blobPrevEnergy[i] = energy;

      // mélange avec les blobs voisins pour un effet plus organique
      const prev = player.blobSmoothed[(i - 1 + player.lavaBlobs.length) % player.lavaBlobs.length];
      const next = player.blobSmoothed[(i + 1) % player.lavaBlobs.length];
      const blended = energy * 0.55 + prev * 0.22 + next * 0.23;

      const isBassBlob = i < 3;
      const bassInf = isBassBlob ? (subBass + bass) * 0.5 : bass * 0.3;
      const trebleInf = isBassBlob ? treble * 0.35 : (treble + mids) * 0.6;

      let scaleX, scaleY, rot, borderRadius, w, h, dx, dy, opacity;

      if (isSoft) {
        // MODE DOUX : ondulation légère, pointes sur les aigus
        const sin1 = Math.sin(time * phase.speedX * 0.7 + phase.phaseX);
        const sin2 = Math.sin(time * phase.speedY * 0.5 + phase.phaseY);
        scaleX = 1 + blended * 0.2 + sin1 * 0.05 + globalEnergy * 0.08 + treble * 0.15;
        scaleY = 1 + blended * 0.2 + sin2 * 0.05 + globalEnergy * 0.06 + treble * 0.12;

        rot = phase.rotOffset
          + time * phase.rotSpeed * 5
          + blended * 10 * Math.sin(time * 1.2 + i)
          + globalEnergy * 5 * Math.cos(time * 0.8 + i * 1.5);

        const pointiness = treble * 70 + mids * 25;
        const softMorph = 6 + blended * 8;
        const r = phase.radii.map((baseR, k) => {
          const w1 = Math.sin(time * phase.radiiSpeed[k] * 0.8 + phase.radiiPhase[k]);
          const trebleShrink = Math.sin(time * 1.5 + k * Math.PI * 0.25 + i) * pointiness;
          return Math.max(8, baseR + w1 * softMorph - trebleShrink);
        });
        borderRadius = `${r[0]}% ${r[1]}% ${r[2]}% ${r[3]}% / ${r[4]}% ${r[5]}% ${r[6]}% ${r[7]}%`;

        const breathe = Math.sin(time * 0.4 + i * 1.1) * base * 0.04;
        w = base + blended * base * 0.12 + breathe + globalEnergy * base * 0.06;
        h = base + blended * base * 0.12 - breathe * 0.3 + globalEnergy * base * 0.05;

        dx = Math.sin(time * phase.speedX * 0.5 + phase.phaseX) * (20 + blended * 30);
        dy = Math.cos(time * phase.speedY * 0.5 + phase.phaseY) * (15 + blended * 25);

        opacity = 0.35 + blended * 0.25
          + Math.sin(time * 0.5 + i * 0.9) * 0.04
          + globalEnergy * 0.08;

      } else {
        // MODE INTENSE : blobs plus petits, hyper-réactifs à chaque son
        const intenseBase = base * 0.6;

        const scaleBoost = isBassBlob ? 1.6 : 1.0;
        const kickBurst = kick * (isBassBlob ? 3.5 : 1.5);
        const transientPop = transient * 3.5;
        const sin1 = Math.sin(time * phase.speedX * 3.5 + phase.phaseX);
        const sin2 = Math.sin(time * phase.speedY * 2.8 + phase.phaseY + 1.5);
        const microPulse = rawE * 0.8;
        scaleX = 1 + blended * scaleBoost + kickBurst + transientPop + microPulse + sin1 * trebleInf * 0.9 + globalEnergy * 0.35;
        scaleY = 1 + blended * scaleBoost + kickBurst * 0.7 + transientPop * 0.9 + microPulse * 0.8 + sin2 * trebleInf * 0.75 + globalEnergy * 0.3;

        rot = phase.rotOffset
          + time * phase.rotSpeed * 35
          + blended * 80 * Math.sin(time * 4.5 + i)
          + kick * 180 * Math.sin(time * 10 + i * 1.5)
          + trebleInf * 90 * Math.cos(time * 7 + i * 2.2)
          + transient * 60 * Math.sin(time * 15 + i)
          + globalEnergy * 30 * Math.cos(time * 2.5 + i * 2);

        const morphAmp = 25 + blended * 40 + kick * 35 + transient * 20;
        const r = phase.radii.map((baseR, k) => {
          const w1 = Math.sin(time * phase.radiiSpeed[k] * 3.5 + phase.radiiPhase[k]);
          const w2 = Math.cos(time * phase.radiiSpeed[k] * 2.0 + phase.radiiPhase[k] * 1.6);
          const w3 = Math.sin(time * phase.radiiSpeed[k] * 5.0 + k * 0.8);
          return baseR + w1 * morphAmp + w2 * morphAmp * 0.5 + w3 * trebleInf * 50 + microPulse * 15;
        });
        borderRadius = `${r[0]}% ${r[1]}% ${r[2]}% ${r[3]}% / ${r[4]}% ${r[5]}% ${r[6]}% ${r[7]}%`;

        const sizeBurst = blended * intenseBase * 0.6 + kick * intenseBase * 0.8 + transient * intenseBase * 0.4;
        const breathe = Math.sin(time * 1.0 + i * 1.2) * intenseBase * 0.1;
        const trebleFlicker = trebleInf * intenseBase * 0.3 * Math.sin(time * 9 + i * 2);
        w = intenseBase + sizeBurst + breathe + trebleFlicker + globalEnergy * intenseBase * 0.3;
        h = intenseBase + sizeBurst - breathe * 0.5 + trebleFlicker * 0.7 + globalEnergy * intenseBase * 0.25;

        const bassDisplace = bassInf * 180 + kick * 300 + transient * 100;
        const trebleJitter = trebleInf * 80 * Math.sin(time * 18 + i * 3.7);
        const midShake = mids * 40 * Math.cos(time * 14 + i * 2.1);
        dx = Math.sin(time * phase.speedX * 2.5 + phase.phaseX) * bassDisplace + trebleJitter + midShake;
        dy = Math.cos(time * phase.speedY * 2.5 + phase.phaseY) * bassDisplace * 0.8 + trebleJitter * 0.6 + midShake * 0.7;

        opacity = 0.25 + blended * 0.6
          + kick * 0.4
          + transient * 0.2
          + Math.sin(time * 1.8 + i * 1.1) * 0.08
          + globalEnergy * 0.25;
      }

      blob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      blob.style.opacity = Math.min(opacity, 0.9);
      blob.style.borderRadius = borderRadius;
      blob.style.width = w + 'px';
      blob.style.height = h + 'px';
    });

    player.reactiveRAF = requestAnimationFrame(tick);
  };
  player.reactiveRAF = requestAnimationFrame(tick);
}

export function stopReactiveLoop(player) {
  if (player.reactiveRAF) {
    cancelAnimationFrame(player.reactiveRAF);
    player.reactiveRAF = null;
  }
  player.blobPhases = null;
  player.blobSmoothed = null;
  player.blobPrevEnergy = null;
}

export function showSoundWave() {
  const el = document.getElementById('sound-wave');
  if (el) el.classList.add('active');
}

export function hideSoundWave() {
  const el = document.getElementById('sound-wave');
  if (el) el.classList.remove('active');
}

export function setupReactiveToggle(player) {
  const btn = document.getElementById('reactive-toggle');
  const indicator = document.getElementById('reactive-indicator');
  const modes = ['off', 'soft', 'intense'];
  const labels = { off: 'RÉACTIF OFF', soft: 'RÉACTIF DOUX', intense: 'RÉACTIF INTENSE' };

  btn.addEventListener('click', () => {
    const idx = (modes.indexOf(player.reactiveMode) + 1) % modes.length;
    const prev = player.reactiveMode;
    player.reactiveMode = modes[idx];

    btn.classList.remove('active', 'active-soft');
    if (player.reactiveMode === 'intense') btn.classList.add('active');
    else if (player.reactiveMode === 'soft') btn.classList.add('active-soft');

    indicator.textContent = labels[player.reactiveMode];
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 1400);

    if (player.reactiveMode !== 'off') {
      initAudioAnalyser(player);
      if (player.analyser) {
        player.analyser.smoothingTimeConstant = player.reactiveMode === 'intense' ? 0.2 : 0.4;
      }
      if (prev !== 'off') stopReactiveLoop(player);
      if (player.isPlaying) startReactiveLoop(player);
    } else {
      stopReactiveLoop(player);
      player.lavaBlobs.forEach(blob => {
        blob.style.transform = '';
        blob.style.opacity = '';
        blob.style.borderRadius = '';
        blob.style.width = '';
        blob.style.height = '';
      });
      if (player.isPlaying) player.showLava();
    }
  });
}
