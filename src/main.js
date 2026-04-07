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
  // Explication : Le constructeur est la première fonction lancée quand la Classe est instanciée. On y initialise les propriété, et appelle des fonctions.
  constructor() {
    // BUG : tracks est un tableau d'objets. Chaque objet représente une musique et ses proprités. Un des items du tableau n'est pas un objet.
    // TODO DRAGGABLE : On va vouloir ajouter une propriété "img" à chaque objet, et y inscrire le lien de l'image que l'on veut charger. 
    // Pense bien à mettre tes images dans le dossier "public"


    //boucle for each
    this.tracks = [
      { id: 1, title: "The Strokes - Someday", url: "The Strokes_Someday.mp3", img: "public/Thestrokescover.jpg", artist: "The Strokes", album: "Is This It (2001)", color: "#FDD94F", desc: "Groupe emblématique du rock indé new-yorkais. 'Someday' est un hymne nostalgique porté par des guitares incisives et la voix nonchalante de Julian Casablancas." },
      { id: 2, title: "Toploader - Dancing in the Moonlight", url: "Toploader - Dancing in the Moonlight.mp3", img: "public/Toploadercover.jpg", artist: "Toploader", album: "Onka's Big Moka (1999)", color: "#4A90D9", desc: "Reprise feel-good devenue un classique. Cette version lumineuse de Toploader capture l'euphorie d'une nuit parfaite avec des mélodies irrésistibles." },
      { id: 3, title: "LP - Other People", url: "LP - Other People.mp3", img: "public/LPcover.jpg", artist: "LP", album: "Lost on You (2016)", color: "#888888", desc: "Laura Pergolizzi, alias LP, délivre une performance vocale intense. 'Other People' mêle folk et pop avec une émotion brute et un sifflement signature." },
      { id: 4, title: "Harry Styles - Sign of the Times", url: "Harry Styles - Sign of the Times.mp3", img: "public/Harrystylecover.jpg", artist: "Harry Styles", album: "Harry Styles (2017)", color: "#7BA7CC", desc: "Premier single solo de Harry Styles, une ballade rock épique et émouvante qui marque sa transition artistique avec une montée instrumentale grandiose." },
      { id: 5, title: "Pharrell Williams - Happy", url: "Pharrell Williams-Happy.mp3", img: "public/Pharrellwilliamscover.jpg", artist: "Pharrell Williams", album: "G I R L (2014)", color: "#F7E04B", desc: "Tube planétaire au groove contagieux. 'Happy' est une célébration pure de la joie, propulsée par la voix solaire de Pharrell et des claps entêtants." },
      { id: 6, title: "Stromae - Merci", url: "Stromae - merci.mp3", img: "public/StromaeCover.jpg", artist: "Stromae", album : "Racine carrée (2013)", color : "#F77E7E", desc : "Stromae propose un album mêlant électro, hip-hop et chanson française, avec des thèmes profonds comme l’identité, la solitude et les relations humaines, porté par une production originale et marquante." }
    ];

    this.tracks.forEach(track => {


    });

    this.currentTrackIndex = 0; // Bug: En général, les tableaux commencent à 0
    this.audio = new Audio();
    this.isPlaying = false;
    this.volume = 1.2; // BUG: C'est trop fort 
    this.customTrackAdded = false;
    this.reactiveMode = 'off';
    this.audioCtx = null;
    this.analyser = null;
    this.audioSource = null;
    this.freqData = null;
    this.reactiveRAF = null;

    // BUG : Cette fonction n'est pas appelé dans le constructeur
    this.init();

  }



  // Explication : Ici, on est en dehors du constructor, on y défini toutes les fonctions que la classe possède.

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.loadTrack();
    this.handleSplitTrack();
    this.setupDraggable();
    this.setupPopup();
    this.setupButtonEffects();
    this.setupLava();
    setupAddTrack(this);
    this.setupTVStatic();
    setupReactiveToggle(this);
    this.setupTitleHover();
  }

  // Bug: Regarde aussi la façon dont on déclare les variables/membres de classe. Rappelle toi que les "const" sont limité à leur portée de bloc (donc ici, à la fonction).
  // Alors que les membres de classes (this.truc) sont appelable n'importe ou dans la classe.
  cacheDOM() {

    const playlist = document.querySelector("#playlist");
    this.playButton = document.querySelector("#play");
    this.nextButton = document.querySelector("#next");
    this.prevButton = document.querySelector("#prev");
    this.trackTitle = document.querySelector("#track-title");
  }

  // Bug: Il semble que dans cette définition de fonction, on attende un paramètre, pourtant on ne l'utilise nul part. Est il vraiment utile ?
  // Bug : Il semble que des events listeners soient mal appelés. nextButton par exemple, est un élement HTML déjà défini.
  // Bug : Quel est l'évènement que l'on veut utiliser sur prevButton ? wheel ? vraiment ?
  // Bug : Son callback est également mal écrit. Regarde au dessus et en dessous comment on déclenche les fonctions de Callback
  bindEvents(item) {
    this.playButton.addEventListener("click", () => this.togglePlay());
    this.nextButton.addEventListener("click", () => this.nextTrack()); // Bug: nextButton est undefined
    this.prevButton.addEventListener("click", () => this.prevTrack());
    this.audio.addEventListener("ended", () => this.nextTrack());
  }

  // Bug : Il manque des accolades pour décrire le corps de la fonction
  loadTrack() {

    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.tracks.length) {
      console.error("Index de piste invalide");
      return;
    }
    this.audio.src = this.tracks[this.currentTrackIndex].url;
    this.trackTitle.textContent = this.tracks[this.currentTrackIndex].title;
    // this.animateTitle();
  }

  handleSplitTrack() {
    const isMobile = window.innerWidth <= 600;
    var splitParent = new SplitText('#track-title', { types: 'lines', linesClass: 'split-parent' })
    var typeSplit = new SplitText('#track-title', { types: 'chars', tagName: 'span' })
    gsap.from(typeSplit.chars, {
      y: '100%',
      opacity: 0,
      rotationZ: 4,
      duration: isMobile ? 0.45 : 0.7,
      ease: 'power3.out',
      stagger: isMobile ? 0.02 : 0.03,
    })

  }

  setupTitleHover() {
    const h1 = document.querySelector('h1');
    if (!h1) return;

    // Split h1 into individual characters
    this.h1Split = new SplitText(h1, { types: 'chars', tagName: 'span' });
    const chars = this.h1Split.chars;

    // Style setup for each char
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

  // Challenge : les fonction Next et previous track ont sensiblement le même traitement. En code, on cherche toujours à ne pas dupliquer de la logique, mais plutôt à factoriser.
  // Peux tu créer une seule fonction à la place de deux ? Comment gérerais tu le cas à ce moment ?

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
          gsap.set(".icon-cards__content", {
            rotateX: gsap.getProperty(".icon-cards__content", "rotateX") + delta * 0.08
          });
          this.dragStartY = this.drag[0].y;
        } else {
          const delta = this.drag[0].x - this.dragStartX;
          gsap.set(".icon-cards__content", {
            rotateY: gsap.getProperty(".icon-cards__content", "rotateY") + delta * 0.08
          });
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
            // Swipe up = next, swipe down = prev
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

  changerTrack() {
    this.pas = (360 / this.tracks.length);
    const currentPas = this.pas * this.currentTrackIndex;

    console.log(this.drag[0].target)
    const isLandscape = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth <= 600;
    const tz = isLandscape ? '-22vw' : isMobile ? '-50vw' : '-38vw';
    const dur = isMobile ? 0.6 : 1;
    const rotateAxis = isMobile ? 'rotateX' : 'rotateY';
    const angle = isMobile ? currentPas : -currentPas;
    gsap.to(".icon-cards__content", {
      transform: `translateZ(${tz}) ${rotateAxis}(${angle}deg)`,
      duration: dur,
      ease: isMobile ? 'power3.out' : 'power2.out'
    })

    // gsap.set(this.drag[0].target, {x:100, y:100, onUpdate:draggable[0].update, onUpdateScope:draggable[0]});

    //console.log(`transform: rotateY(${currentPas}deg) translateZ(35vw)`)
    this.handleSplitTrack();
  }

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
    this.popupListenBtn.addEventListener('click', () => {
      this.closePopup();
      // Navigate to that track and play
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

  openPopup(index) {
    this.popupCurrentIndex = index;
    const track = this.tracks[index];
    this.popupImg.src = track.img;
    this.popupArtist.textContent = track.artist;
    this.popupAlbum.textContent = track.album;
    this.popupDesc.textContent = track.desc;

    this.popupOverlay.classList.add('active');

    // Overlay fade in
    gsap.to(this.popupOverlay, {
      background: 'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(12px)',
      duration: 0.5,
      ease: 'power2.out'
    });

    // Panel: clip-path reveal from center
    gsap.fromTo(this.popupPanel,
      { opacity: 0, clipPath: 'inset(40% 40% 40% 40% round 16px)' },
      { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.7, ease: 'power4.out' }
    );

    // Image: slide & scale from left
    gsap.fromTo(this.popupImg,
      { scale: 1.3, x: -60, opacity: 0 },
      { scale: 1, x: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: 'power3.out' }
    );

    // Label
    gsap.fromTo(this.popupLabel,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: 0.3, ease: 'power3.out' }
    );

    // Artist name — chars stagger
    gsap.fromTo(this.popupArtist,
      { y: 40, opacity: 0, skewY: 3 },
      { y: 0, opacity: 1, skewY: 0, duration: 0.6, delay: 0.35, ease: 'power3.out' }
    );

    // Divider line wipe
    gsap.fromTo('.popup-divider',
      { scaleX: 0, transformOrigin: 'left' },
      { scaleX: 1, duration: 0.5, delay: 0.45, ease: 'power2.out' }
    );

    // Album
    gsap.fromTo(this.popupAlbum,
      { y: 25, opacity: 0 },
      { y: 0, opacity: 0.55, duration: 0.5, delay: 0.5, ease: 'power3.out' }
    );

    // Description
    gsap.fromTo(this.popupDesc,
      { y: 25, opacity: 0 },
      { y: 0, opacity: 0.5, duration: 0.5, delay: 0.55, ease: 'power3.out' }
    );

    // Listen button
    gsap.fromTo(this.popupListenBtn,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: 0.65, ease: 'power3.out' }
    );

    // Close button
    gsap.fromTo(this.popupClose,
      { rotation: -90, opacity: 0 },
      { rotation: 0, opacity: 1, duration: 0.4, delay: 0.4, ease: 'back.out(2)' }
    );
  }

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

  setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn-player');

    buttons.forEach(btn => {
      const fill = btn.querySelector('.btn-fill');
      let enterTween = null;
      let leaveTween = null;

      btn.addEventListener('mouseenter', (e) => {
        // Kill any running leave animation so it doesn't fight
        if (leaveTween) leaveTween.kill();

        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Place circle at mouse entry point, scale 0
        gsap.set(fill, { left: x, top: y, xPercent: -50, yPercent: -50, scale: 0 });

        enterTween = gsap.to(fill, {
          scale: 1,
          duration: 0.55,
          ease: 'power3.out'
        });

        // Icon color inversion
        gsap.to(btn.querySelectorAll('svg'), {
          color: '#161414',
          duration: 0.35,
          ease: 'power1.out'
        });
      });

      btn.addEventListener('mouseleave', (e) => {
        // Kill enter tween if still running
        if (enterTween) enterTween.kill();

        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Move circle center to exit point, then shrink
        gsap.set(fill, { left: x, top: y, xPercent: -50, yPercent: -50 });

        leaveTween = gsap.to(fill, {
          scale: 0,
          duration: 0.45,
          ease: 'power3.in'
        });

        // Icon color back
        gsap.to(btn.querySelectorAll('svg'), {
          color: '#f5e6d0',
          duration: 0.35,
          ease: 'power1.in'
        });
      });

      // Micro-press
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

  //fonction au click applique a lelement contenair valeur transform

  // ── Carousel focus effect ──

  focusCarousel() {
    const items = document.querySelectorAll('.icon-cards__item');
    const total = this.tracks.length;
    const active = this.currentTrackIndex;

    items.forEach((item, i) => {
      if (i === active) {
        // Active card: subtle zoom in
        gsap.to(item, {
          scale: 1.12,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      } else {
        // Others: shrink & fade
        gsap.to(item, {
          scale: 0.85,
          opacity: 0.35,
          duration: 0.8,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      }
    });

    // Slight perspective push on the whole carousel
    gsap.to('.icon-cards', {
      scale: 1.04,
      duration: 0.9,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

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

  // ── Lava lamp blobs — random organic morph ──

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

  updateLavaColors() {
    const color = this.tracks[this.currentTrackIndex].color;
    this.lavaBlobs.forEach((blob) => {
      gsap.to(blob, { background: color, duration: 1.2, ease: 'power2.out' });
    });
  }

  showLava() {
    this.lavaTweens.forEach(t => t.kill());
    this.lavaTweens = [];
    const isMobile = window.innerWidth <= 600;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this.blobBaseSizes = [];

    this.lavaBlobs.forEach((blob, i) => {
      const size = isMobile ? (80 + Math.random() * 100) : (140 + Math.random() * 220);
      this.blobBaseSizes[i] = size;
      gsap.set(blob, { width: size, height: size });

      // Fade in
      gsap.to(blob, {
        opacity: 0.5 + Math.random() * 0.2,
        scale: 1,
        duration: 1.2 + i * 0.12,
        ease: 'power3.out'
      });

      // Random drift
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

      this.lavaTweens.push(moveTween, scaleTween);
    });
  }

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

  // ── TV Static background ──

  setupTVStatic() {
    const container = document.querySelector('.paper-bg');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Low-res for performance — scaled up with CSS
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
      // Regenerate dimensions if canvas resized
      if (imageData.width !== w || imageData.height !== h) {
        requestAnimationFrame(draw);
        return;
      }

      const len = w * h * 4;
      for (let i = 0; i < len; i += 4) {
        const v = Math.random() * 28 | 0; // very dark static: 0–28
        pixels[i]     = v;
        pixels[i + 1] = v;
        pixels[i + 2] = v;
        pixels[i + 3] = 45; // low alpha for subtlety
      }
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(draw);
    };
    draw();
  }

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

    // Clear existing items
    content.innerHTML = '';

    // Rebuild all carousel items
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

      // Re-add click for popup
      item.addEventListener('click', () => {
        if (this.isDragging) return;
        this.openPopup(i);
      });

      content.appendChild(item);
    });

    // Reset content transform to current track
    this.changerTrack();

    // Rebuild draggable
    if (this.drag && this.drag[0]) this.drag[0].kill();
    this.setupDraggable();

    // Re-apply focus if playing
    if (this.isPlaying) this.focusCarousel();
  }
}






new MusicPlayer();

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