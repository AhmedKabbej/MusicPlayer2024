import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { Draggable } from "gsap/Draggable";
import {
  initAudioAnalyser,
  startReactiveLoop,
  stopReactiveLoop,
  showSoundWave,
  hideSoundWave,
  setupReactiveToggle
} from "./soundReaction.js";
import { setupAddTrack } from "./addTrack.js";
gsap.registerPlugin(SplitText, Draggable);


class MusicPlayer {
  // le constructeur c'est la qui se lance en premier quand on fait new MusicPlayer()
  constructor() {
    // tableau avec toutes les musiques, chaque objet = 1 musique avec ses infos
    this.tracks = [
      { id: 1, title: "The Strokes - Someday", url: "/The Strokes_Someday.mp3", img: "/Thestrokescover.jpg", artist: "The Strokes", album: "Is This It (2001)", color: "#FDD94F", desc: "Groupe emblématique du rock indé new-yorkais. 'Someday' est un hymne nostalgique porté par des guitares incisives et la voix nonchalante de Julian Casablancas." },
      { id: 2, title: "Toploader - Dancing in the Moonlight", url: "/Toploader - Dancing in the Moonlight.mp3", img: "/Toploadercover.jpg", artist: "Toploader", album: "Onka's Big Moka (1999)", color: "#4A90D9", desc: "Reprise feel-good devenue un classique. Cette version lumineuse de Toploader capture l'euphorie d'une nuit parfaite avec des mélodies irrésistibles." },
      { id: 3, title: "Stromae - Merci", url: "/Stromae - merci.mp3", img: "/StromaeCover.jpg", artist: "Stromae", album : "Racine carrée (2013)", color : "#F77E7E", desc : "Stromae propose un album mêlant électro, hip-hop et chanson française, avec des thèmes profonds comme l'identité, la solitude et les relations humaines, porté par une production originale et marquante." },
      { id: 4, title: "Harry Styles - Sign of the Times", url: "/Harry Styles - Sign of the Times.mp3", img: "/Harrystylecover.jpg", artist: "Harry Styles", album: "Harry Styles (2017)", color: "#7BA7CC", desc: "Premier single solo de Harry Styles, une ballade rock épique et émouvante qui marque sa transition artistique avec une montée instrumentale grandiose." },
      { id: 5, title: "Pharrell Williams - Happy", url: "/Pharrell Williams-Happy.mp3", img: "/Pharrellwilliamscover.jpg", artist: "Pharrell Williams", album: "G I R L (2014)", color: "#F7E04B", desc: "Tube planétaire au groove contagieux. 'Happy' est une célébration pure de la joie, propulsée par la voix solaire de Pharrell et des claps entêtants." },
{ id: 6, title: "LP - Other People", url: "/LP - Other People.mp3", img: "/LPcover.jpg", artist: "LP", album: "Lost on You (2016)", color: "#888888", desc: "Laura Pergolizzi, alias LP, délivre une performance vocale intense. 'Other People' mêle folk et pop avec une émotion brute et un sifflement signature." }
    ];

    this.tracks.forEach(track => {


    });

    // proprietes du player
    this.currentTrackIndex = 0;
    this.currentAngle = 0; // angle continu du carousel pour eviter les tours de 360
    this.audio = new Audio();
    this.isPlaying = false;
    this.volume = 1.2;
    this.customTrackAdded = false;
    this.reactiveMode = 'off';
    this.audioCtx = null;
    this.analyser = null;
    this.audioSource = null;
    this.freqData = null;
    this.reactiveRAF = null;

    this.init();
  }

  // on lance tout ici : DOM, events, plugins, etc.
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadTrack();
    this.handleSplitTrack();
    // on force gsap a initialiser son cache avec les bonnes valeurs
    // sinon il lit le CSS transform en string et ca buge avec rotateY
    const isMobileInit = window.innerWidth <= 600;
    const isLandscapeInit = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
    const initZ = isLandscapeInit ? -22 : isMobileInit ? -50 : -38;
    const initSet = { z: (initZ / 100) * window.innerWidth };
    if (isMobileInit) initSet.rotateX = 0;
    else initSet.rotateY = 0;
    gsap.set(".icon-cards__content", initSet);
    this.setupDraggable();
    this.setupPopup();
    this.setupButtonEffects();
    this.setupLava();
    setupAddTrack(this);
    this.setupTVStatic();
    setupReactiveToggle(this);
    this.setupTitleHover();
  }

  // on recupere tous les elements HTML dont on a besoin
  cacheDOM() {

    const playlist = document.querySelector("#playlist");
    this.playButton = document.querySelector("#play");
    this.nextButton = document.querySelector("#next");
    this.prevButton = document.querySelector("#prev");
    this.trackTitle = document.querySelector("#track-title");
  }

  // on branche les evenements click sur les boutons
  bindEvents(item) {
    this.playButton.addEventListener("click", () => this.togglePlay());
    this.nextButton.addEventListener("click", () => this.nextTrack());
    this.prevButton.addEventListener("click", () => this.prevTrack());
    this.audio.addEventListener("ended", () => this.nextTrack());
  }

  // charge la musique actuelle dans le player audio
  loadTrack() {

    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.tracks.length) {
      console.error("Index de piste invalide");
      return;
    }
    this.audio.src = this.tracks[this.currentTrackIndex].url;
    this.trackTitle.textContent = this.tracks[this.currentTrackIndex].title;
  }

  // animation du titre avec SplitText : decoupe en lettres et les fait apparaitre une par une
  handleSplitTrack() {
    const isMobile = window.innerWidth <= 600;

    // on revert le split precedent pour pas casser le DOM
    if (this._splitParent) this._splitParent.revert();
    if (this._typeSplit) this._typeSplit.revert();

    this.trackTitle.textContent = this.tracks[this.currentTrackIndex].title;

    this._splitParent = new SplitText('#track-title', { types: 'lines', linesClass: 'split-parent' })
    this._typeSplit = new SplitText('#track-title', { types: 'chars', tagName: 'span' })
    gsap.from(this._typeSplit.chars, {
      y: '100%',
      opacity: 0,
      rotationZ: 4,
      duration: isMobile ? 0.45 : 0.7,
      ease: 'power3.out',
      stagger: isMobile ? 0.02 : 0.03,
    })

  }

  // effet hover sur le h1 : les lettres rebondissent quand on passe la souris
  setupTitleHover() {
    const h1 = document.querySelector('h1');
    if (!h1) return;

    this.h1Split = new SplitText(h1, { types: 'chars', tagName: 'span' });
    const chars = this.h1Split.chars;

    chars.forEach(char => {
      char.style.display = 'inline-block';
      char.style.transition = 'none';
    });

    h1.addEventListener('mouseenter', () => {
      gsap.to(chars, {
        scale: 1.35,
        y: -4,
        duration: 0.4,
        ease: 'back.out(2)',
        stagger: { each: 0.03, from: 'center' },
        overwrite: true,
      });
    });

    h1.addEventListener('mouseleave', () => {
      gsap.to(chars, {
        scale: 1,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)',
        stagger: { each: 0.02, from: 'center' },
        overwrite: true,
      });
    });
  }

  // play / pause : gere aussi la lava, le mode reactif, le focus carousel et la wave
  togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.hideLava();
      stopReactiveLoop(this);
      this.unfocusCarousel();
      hideSoundWave();
    } else {
      this.audio.play().catch(err => console.error("Erreur de lecture :", err));
      this.isPlaying = true;
      this.showLava();
      if (this.reactiveMode !== 'off') startReactiveLoop(this);
      this.focusCarousel();
      showSoundWave();
    }
    this.updatePlayIcon();
  }

  // switch entre l'icone play et pause
  updatePlayIcon() {
    const iconPlay = this.playButton.querySelector('.icon-play');
    const iconPause = this.playButton.querySelector('.icon-pause');
    if (this.isPlaying) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
    } else {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
    }
  }

  // piste suivante : modulo pour boucler a la fin du tableau
  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.loadTrack();
    this.audio.play();
    this.isPlaying = true;
    this.updatePlayIcon();
    this.changerTrack();
    this.updateLavaColors();
    this.showLava();
    if (this.reactiveMode !== 'off') startReactiveLoop(this);
    this.focusCarousel();
    showSoundWave();
  };


  // piste precedente : +length avant le modulo pour eviter les index negatifs
  prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.loadTrack();
    this.audio.play();
    this.isPlaying = true;
    this.updatePlayIcon();
    this.changerTrack();
    this.updateLavaColors();
    this.showLava();
    if (this.reactiveMode !== 'off') startReactiveLoop(this);
    this.focusCarousel();
    showSoundWave();
  };
  // drag sur le carousel : on cree un proxy invisible que Draggable manipule
  // quand on drag assez loin on passe a next/prev, sinon on recentre
  setupDraggable() {
    var proxy = document.createElement("div");
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    const DRAG_THRESHOLD = 30;
    const isMobile = window.innerWidth <= 600;

    this.drag = Draggable.create(proxy, {
      trigger: ".icon-cards__content",
      type: isMobile ? 'y' : 'x',
      onDragStart: () => {
        this.dragStartX = this.drag[0].x;
        this.dragStartY = this.drag[0].y;
      },
      onDrag: () => {
        if (isMobile) {
          const delta = this.drag[0].y - this.dragStartY;
          this.currentAngle += delta * 0.08;
          gsap.set(".icon-cards__content", { rotateX: this.currentAngle });
          this.dragStartY = this.drag[0].y;
        } else {
          const delta = this.drag[0].x - this.dragStartX;
          this.currentAngle += delta * 0.08;
          gsap.set(".icon-cards__content", { rotateY: this.currentAngle });
          this.dragStartX = this.drag[0].x;
        }
      },
      onDragEnd: () => {
        const totalDelta = isMobile
          ? this.drag[0].y - this.drag[0].startY
          : this.drag[0].x - this.drag[0].startX;
        if (Math.abs(totalDelta) > DRAG_THRESHOLD) {
          this.isDragging = true;
          if (isMobile) {
            if (totalDelta < 0) {
              this.nextTrack();
            } else {
              this.prevTrack();
            }
          } else {
            if (totalDelta > 0) {
              this.prevTrack();
            } else {
              this.nextTrack();
            }
          }
          setTimeout(() => { this.isDragging = false; }, 100);
        } else {
          this.changerTrack();
        }
      }
    });
  }

  // rotation du carousel 3D vers la bonne carte
  // on normalise le delta entre -180 et 180 pour toujours prendre le chemin le plus court
  changerTrack() {
    this.pas = (360 / this.tracks.length);

    console.log(this.drag[0].target)
    const isLandscape = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth <= 600;
    const dur = isMobile ? 0.6 : 1;

    const sign = isMobile ? 1 : -1;
    const targetBase = sign * this.pas * this.currentTrackIndex;
    let delta = targetBase - this.currentAngle;
    delta = ((delta % 360) + 540) % 360 - 180;
    this.currentAngle += delta;

    const tweenVars = {
      duration: dur,
      ease: isMobile ? 'power3.out' : 'power2.out'
    };

    if (isMobile) {
      tweenVars.rotateX = this.currentAngle;
      tweenVars.z = -(50 / 100) * window.innerWidth;
    } else if (isLandscape) {
      tweenVars.rotateY = this.currentAngle;
      tweenVars.z = -(22 / 100) * window.innerWidth;
    } else {
      tweenVars.rotateY = this.currentAngle;
      tweenVars.z = -(38 / 100) * window.innerWidth;
    }

    gsap.to(".icon-cards__content", tweenVars)

    this.handleSplitTrack();
  }

  // popup quand on clique sur une carte : affiche les infos de l'artiste
  setupPopup() {
    this.popupOverlay = document.getElementById('popup-overlay');
    this.popupPanel = this.popupOverlay.querySelector('.popup-panel');
    this.popupImg = document.getElementById('popup-img');
    this.popupArtist = document.getElementById('popup-artist');
    this.popupAlbum = document.getElementById('popup-album');
    this.popupDesc = document.getElementById('popup-desc');
    this.popupClose = document.getElementById('popup-close');
    this.popupLabel = document.getElementById('popup-label');
    this.popupListenBtn = document.getElementById('popup-listen');

    const items = document.querySelectorAll('.icon-cards__item');
    items.forEach((item, index) => {
      item.addEventListener('click', () => {
        if (this.isDragging) return;
        this.openPopup(index);
      });
    });

    this.popupClose.addEventListener('click', () => this.closePopup());
    this.popupOverlay.addEventListener('click', (e) => {
      if (e.target === this.popupOverlay) this.closePopup();
    });
    // bouton "ecouter" dans la popup : lance la musique et ferme la popup
    this.popupListenBtn.addEventListener('click', () => {
      this.closePopup();
      const idx = this.popupCurrentIndex;
      if (idx !== undefined && idx !== this.currentTrackIndex) {
        this.currentTrackIndex = idx;
        this.loadTrack();
        this.changerTrack();
      }
      this.audio.play();
      this.isPlaying = true;
      this.updatePlayIcon();
      this.updateLavaColors();
      this.showLava();
      if (this.reactiveMode !== 'off') startReactiveLoop(this);
      this.focusCarousel();
      showSoundWave();
    });
  }

  // animation d'ouverture de la popup : clip-path, slide, stagger sur chaque element
  openPopup(index) {
    this.popupCurrentIndex = index;
    const track = this.tracks[index];
    this.popupImg.src = track.img;
    this.popupArtist.textContent = track.artist;
    this.popupAlbum.textContent = track.album;
    this.popupDesc.textContent = track.desc;

    this.popupOverlay.classList.add('active');

    gsap.to(this.popupOverlay, {
      background: 'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(12px)',
      duration: 0.5,
      ease: 'power2.out'
    });

    gsap.fromTo(this.popupPanel,
      { opacity: 0, clipPath: 'inset(40% 40% 40% 40% round 16px)' },
      { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.7, ease: 'power4.out' }
    );

    gsap.fromTo(this.popupImg,
      { scale: 1.3, x: -60, opacity: 0 },
      { scale: 1, x: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: 'power3.out' }
    );

    gsap.fromTo(this.popupLabel,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: 0.3, ease: 'power3.out' }
    );

    gsap.fromTo(this.popupArtist,
      { y: 40, opacity: 0, skewY: 3 },
      { y: 0, opacity: 1, skewY: 0, duration: 0.6, delay: 0.35, ease: 'power3.out' }
    );

    gsap.fromTo('.popup-divider',
      { scaleX: 0, transformOrigin: 'left' },
      { scaleX: 1, duration: 0.5, delay: 0.45, ease: 'power2.out' }
    );

    gsap.fromTo(this.popupAlbum,
      { y: 25, opacity: 0 },
      { y: 0, opacity: 0.55, duration: 0.5, delay: 0.5, ease: 'power3.out' }
    );

    gsap.fromTo(this.popupDesc,
      { y: 25, opacity: 0 },
      { y: 0, opacity: 0.5, duration: 0.5, delay: 0.55, ease: 'power3.out' }
    );

    gsap.fromTo(this.popupListenBtn,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: 0.65, ease: 'power3.out' }
    );

    gsap.fromTo(this.popupClose,
      { rotation: -90, opacity: 0 },
      { rotation: 0, opacity: 1, duration: 0.4, delay: 0.4, ease: 'back.out(2)' }
    );
  }

  // animation de fermeture : clip-path qui se referme + fade du fond noir
  closePopup() {
    const tl = gsap.timeline({
      onComplete: () => {
        this.popupOverlay.classList.remove('active');
        gsap.set(this.popupOverlay, { background: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' });
      }
    });

    tl.to(this.popupPanel, {
      clipPath: 'inset(30% 30% 30% 30% round 16px)',
      opacity: 0,
      duration: 0.4,
      ease: 'power3.in'
    });
    tl.to(this.popupOverlay, {
      background: 'rgba(0,0,0,0)',
      backdropFilter: 'blur(0px)',
      duration: 0.3,
      ease: 'power2.in'
    }, '-=0.2');
  }

  // effet hover sur les boutons play/next/prev : cercle qui se remplit depuis la souris
  setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn-player');

    buttons.forEach(btn => {
      const fill = btn.querySelector('.btn-fill');
      let enterTween = null;
      let leaveTween = null;

      btn.addEventListener('mouseenter', (e) => {
        if (leaveTween) leaveTween.kill();

        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        gsap.set(fill, { left: x, top: y, xPercent: -50, yPercent: -50, scale: 0 });

        enterTween = gsap.to(fill, {
          scale: 1,
          duration: 0.55,
          ease: 'power3.out'
        });

        // icone en couleur inversee
        gsap.to(btn.querySelectorAll('svg'), {
          color: '#161414',
          duration: 0.35,
          ease: 'power1.out'
        });
      });

      btn.addEventListener('mouseleave', (e) => {
        if (enterTween) enterTween.kill();

        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        gsap.set(fill, { left: x, top: y, xPercent: -50, yPercent: -50 });

        leaveTween = gsap.to(fill, {
          scale: 0,
          duration: 0.45,
          ease: 'power3.in'
        });

        gsap.to(btn.querySelectorAll('svg'), {
          color: '#f5e6d0',
          duration: 0.35,
          ease: 'power1.in'
        });
      });

      // micro effet de pression quand on clique
      btn.addEventListener('mousedown', () => {
        gsap.to(btn, { scale: 0.9, duration: 0.12, ease: 'power2.out' });
      });
      btn.addEventListener('mouseup', () => {
        gsap.to(btn, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      });
    });
  }

  // zoom sur la carte active et fade sur les autres quand la musique joue
  focusCarousel() {
    const items = document.querySelectorAll('.icon-cards__item');
    const total = this.tracks.length;
    const active = this.currentTrackIndex;

    items.forEach((item, i) => {
      if (i === active) {
        gsap.to(item, {
          scale: 1.12,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      } else {
        gsap.to(item, {
          scale: 0.85,
          opacity: 0.35,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      }
    });

    gsap.to('.icon-cards', {
      scale: 1.04,
      duration: 0.9,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

  // remet toutes les cartes a la meme taille/opacite quand on met pause
  unfocusCarousel() {
    const items = document.querySelectorAll('.icon-cards__item');

    items.forEach((item) => {
      gsap.to(item, {
        scale: 1,
        opacity: 1,
        duration: 0.7,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
    });

    gsap.to('.icon-cards', {
      scale: 1,
      duration: 0.7,
      ease: 'power2.inOut',
      overwrite: 'auto'
    });
  }

  // lava lamp : on cree des blobs colores en fond qui bougent tout seuls
  setupLava() {
    this.lavaBg = document.getElementById('lava-bg');
    this.lavaBlobs = [];
    this.lavaTweens = [];
    const BLOB_COUNT = 7;
    const isMobile = window.innerWidth <= 600;

    for (let i = 0; i < BLOB_COUNT; i++) {
      const blob = document.createElement('div');
      blob.classList.add('lava-blob');
      const clusterX = (i % 3 - 1) * (isMobile ? 25 : 20) + 50;
      const clusterY = 30 + (i * 7) % 40;
      gsap.set(blob, {
        left: clusterX + '%',
        top: clusterY + '%',
        xPercent: -50,
        yPercent: -50
      });
      this.lavaBg.appendChild(blob);
      this.lavaBlobs.push(blob);
    }

    this.updateLavaColors();
    gsap.set(this.lavaBlobs, { opacity: 0, scale: 0 });
  }

  // change la couleur des blobs selon la musique en cours
  updateLavaColors() {
    const color = this.tracks[this.currentTrackIndex].color;
    this.lavaBlobs.forEach((blob) => {
      gsap.to(blob, { background: color, duration: 1.2, ease: 'power2.out' });
    });
  }

  // fait apparaitre les blobs avec des mouvements aleatoires + morph du border-radius
  showLava() {
    this.lavaTweens.forEach(t => t.kill());
    this.lavaTweens = [];
    const isMobile = window.innerWidth <= 600;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this.blobBaseSizes = [];

    this.lavaBlobs.forEach((blob, i) => {
      const size = isMobile ? (120 + Math.random() * 120) : (140 + Math.random() * 220);
      this.blobBaseSizes[i] = size;
      gsap.set(blob, { width: size, height: size });

      gsap.to(blob, {
        opacity: 0.5 + Math.random() * 0.2,
        scale: 1,
        duration: 1.2 + i * 0.12,
        ease: 'power3.out'
      });

      const rangeX = isMobile ? vw * 0.4 : vw * 0.35;
      const rangeY = isMobile ? vh * 0.35 : vh * 0.3;

      const moveTween = gsap.to(blob, {
        x: () => (Math.random() - 0.5) * rangeX,
        y: () => (Math.random() - 0.5) * rangeY,
        duration: () => 5 + Math.random() * 5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.3
      });

      const scaleTween = gsap.to(blob, {
        scaleX: () => 0.7 + Math.random() * 0.6,
        scaleY: () => 0.7 + Math.random() * 0.6,
        duration: () => 3 + Math.random() * 4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.25
      });

      const morphTween = gsap.to(blob, {
        borderRadius: () => {
          const r = Array.from({ length: 8 }, () => 25 + Math.random() * 35);
          return `${r[0]}% ${r[1]}% ${r[2]}% ${r[3]}% / ${r[4]}% ${r[5]}% ${r[6]}% ${r[7]}%`;
        },
        duration: () => 3 + Math.random() * 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.2
      });

      this.lavaTweens.push(moveTween, scaleTween, morphTween);
    });
  }

  // cache les blobs avec un fade out + reset des styles
  hideLava() {
    this.lavaBlobs.forEach((blob, i) => {
      gsap.to(blob, {
        opacity: 0,
        scale: 0,
        duration: 0.8 + i * 0.1,
        ease: 'power2.in',
        onComplete: () => {
          blob.style.borderRadius = '';
          blob.style.width = '';
          blob.style.height = '';
          blob.style.transform = '';
          if (i === this.lavaBlobs.length - 1) {
            this.lavaTweens.forEach(t => t.kill());
            this.lavaTweens = [];
          }
        }
      });
    });
  }

  // fond anime style TV statique avec un canvas basse res pour la perf
  setupTVStatic() {
    const container = document.querySelector('.paper-bg');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const SCALE = 3;
    let w, h;
    const resize = () => {
      w = Math.ceil(window.innerWidth / SCALE);
      h = Math.ceil(window.innerHeight / SCALE);
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    const imageData = ctx.createImageData(w, h);
    const pixels = imageData.data;

    const draw = () => {
      if (imageData.width !== w || imageData.height !== h) {
        requestAnimationFrame(draw);
        return;
      }

      const len = w * h * 4;
      for (let i = 0; i < len; i += 4) {
        const v = Math.random() * 28 | 0;
        pixels[i]     = v;
        pixels[i + 1] = v;
        pixels[i + 2] = v;
        pixels[i + 3] = 45;
      }
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(draw);
    };
    draw();
  }

  // reconstruit tout le carousel quand on ajoute une musique custom
  rebuildCarousel() {
    const content = document.querySelector('.icon-cards__content');
    const count = this.tracks.length;
    const angleUnit = 360 / count;
    const isMobile = window.innerWidth <= 600;
    const isLandscape = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;

    let tzVal;
    if (isLandscape) tzVal = '22vw';
    else if (isMobile) tzVal = '50vw';
    else tzVal = '38vw';

    content.innerHTML = '';

    this.tracks.forEach((track, i) => {
      const item = document.createElement('div');
      item.classList.add('icon-cards__item');
      const img = document.createElement('img');
      img.src = track.img;
      img.alt = track.artist || track.title;
      item.appendChild(img);

      const rotateAxis = isMobile ? 'rotateX' : 'rotateY';
      const sign = isMobile ? '-' : '';
      item.style.transform = `${rotateAxis}(${sign}${i * angleUnit}deg) translateZ(${tzVal})`;

      item.addEventListener('click', () => {
        if (this.isDragging) return;
        this.openPopup(i);
      });

      content.appendChild(item);
    });

    this.changerTrack();

    if (this.drag && this.drag[0]) this.drag[0].kill();
    this.setupDraggable();

    if (this.isPlaying) this.focusCarousel();
  }
}






new MusicPlayer();


// ── INSTRUCTIONS DU PROF (ne pas supprimer) ──

// BUG : Ici, on est en dehors de la classe Music Player. 
// On peut donc l'instancier avec le mot clef New, pour qu'elle soit utilisée.



// Fonctionnalités : Draggable
// On va utiiser Draggable pour drag n drop les images de notre slider, et passer d'une musique à l'autre
// https://gsap.com/docs/v3/Plugins/Draggable/

// Tu dois commencer par installer gsap dans ton projet : npm i gsap
// L'importer en haut du fichier, puis entre ton import et ta classe, ajouter gsap.registerPlugin(Draggable)

// On va créer une fonction setupDraggable que l'on va appeler ensuite dans le constructor. Elle contiendra la logique du drag.
// On va utiliser la fonction create de Draggable pour construire notre instance de Draggable.
// On voit dans la doc que Draggable a besoin d'un id de container HTML pour déclencher la feature de drag sur cet élément.
// En deuxième paramètre, c'est l'objet de config de cette instance draggable

// Dans cet objet veut utiliser le "Snap", c'est à dire la magnétisation vers un item lorsqu'on relache le drag
// Pour utiliser Snap, il faut également ajouter le Inertia Plugin, (normalement payant, mais la on peut simplement utiliser une version gratos)
// La façon de le faire est d'importer le fichier js https://assets.codepen.io/16327/InertiaPlugin.min.js, dans une balise script, dans ton fichier HTML.

// Bien, si tu cherches dans la doc de Draggable le mot "snap", tu vas trouver comment est ce qu'on s'en sert. Elle se déclenche dès lors que tu relâche le drag.

// Ton objectif est de lui passer la valeur vers laquelle il va se déplacer (en fonction de la où tu te trouves déjà)
// Indice : tu as besoin de la largeur de tes covers de musique.
// Teste, expérimente, réfléchis.


// Fonctionnalité : Split Text

// De même, on va utiliser le Plugin Split Text (normalement payant) de GSAP.
// Tu peux trouver le fichier à utiliser ici : https://codepen.io/GreenSock/full/OPqpRJ/



// De même, on va créer une fonction à appeler dans le constructeur pour "Split" tous nos titres en petits lignes, mots, ou caractères. Nomme la comme tu veux.
// Dedans, construit un SplitText comme dans la doc (avec le mot clef New)
// Split text prend en premier paramètre le selecteur (ID, class css...) à Splitter, et en second, un objet de config, comprenant le type en quoi casser ce texte : lines, words, chars.

// Tu peux regarder dans ton inspecteur, il aura automatiquement cassé le HTML en plus petits blocs.

// De la, tu peux utiliser la fonction gsap.from

// NB : gsap.to(), prends les valeurs par défaut de ton élément, et anime jusqu'aux valeurs que tu donnes dans le to()
// alors que gsap.from(), prend les valeurs que tu donnes dans le from(), et les anim jusqu'à la valeur de base de ton élément.

// ex: j'ai une div avec un background bleu par défaut, si je fais

// gsap.to('#element', {
//   duration: 1, 
//   backgroundColor: 'red'
// });

// il passera du bleu à rouge.
// alors que si je fais

// gsap.from('#element', {
//   duration: 1, 
//   backgroundColor: 'red'
// });

// il passera de rouge à bleu.

// Quand tu auras fait le split, tu voudras peut être qu'il soit caché par un bloc invisible.
// Indice : Tu peux surement y arriver avec une dif parente qui possède un overflow: hidden


// Si tu veux lancer les animations de texte sur le bon élément à chaque fois que tu changes de musique, il va falloir que tu créer une fonction qui sera appelée :
// A chaque snap (quand tu changes de musique avec Draggable)
// A chaque click sur (previous ou next)

// Tu voudras surement que tes éléments soient en absolute.
// Et tu cherches à lancer une fonction pour "cacher" ton split text précédent, et "faire apparaitre" ton split text suivant

// Je te laisse chercher et collaborer avec les autres :)