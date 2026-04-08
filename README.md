# Lecteur Musical 

Lecteur de playlist interactif avec une esthétique rétro-luxe. **100% vanilla** — pas de Three.js, pas de WebGL. Toute la 3D est simulée en pur CSS.

## Contexte du projet

Ce projet est né lors d'un **workshop encadré par Alexis Séjourné en 2024**. À l'origine un exercice de carousel en CSS, j'ai repris un ancien fork Git après le workshop pour le transformer en un véritable **lecteur musical nostalgique** complet. J'y ai incorporé progressivement de nombreuses fonctionnalités : détection automatique de métadonnées via l'API MusicBrainz, un mode réactif au son avec analyse audio en temps réel, des effets visuels rétro (lava blobs, grain pellicule, TV static), un système d'ajout de piste par drag & drop, et une esthétique soignée inspirée des lecteurs physiques d'époque — le tout sans aucune librairie 3D.

## La "fausse" 3D

Le carousel utilise `perspective` + `transform-style: preserve-3d` en CSS. Les pochettes sont positionnées en cercle avec `rotateY(n°) translateZ(r)` (desktop) ou `rotateX(n°) translateZ(r)` (mobile vertical). La rotation du conteneur parent via GSAP donne l'illusion d'un objet 3D qu'on fait tourner, alors que ce sont juste des `div` plates placées dans l'espace CSS.

## Fonctionnalités

- **Carousel 3D (CSS)** — Navigation horizontale (PC) / verticale (mobile) avec drag & swipe, fausse 3D via `perspective` et `rotateY`/`rotateX`
- **Lecture audio** — Play, pause, piste suivante/précédente avec transition automatique
- **Popup artiste** — Clic sur une pochette → fiche détaillée (image, bio, album)
- **Lava blobs** — Sphères abstraites colorées selon l'album en cours
- **Mode réactif (2 niveaux)** — Doux : morphing subtil, formes pointues sur les aigus / Intense : explosions sur les basses, jitter sur les aigus, kicks détectés
- **Ajout de piste + détection API** — Drag & drop MP3 + image carrée, limité à 1 ajout. Le nom du fichier est analysé et envoyé à l'API **MusicBrainz** pour auto-compléter artiste, album, description et titre (voir section dédiée ci-dessous)
- **Fond TV static** — Bruit de pixels généré en canvas temps réel
- **Grain & vignette** — Doubles couches de grain SVG + vignette cinématique
- **Boutons luxe** — Remplissage circulaire suivant la direction de la souris
- **Responsive** — 4 breakpoints (mobile, petit mobile, paysage, tablette)

## Détection automatique via MusicBrainz API

Quand un fichier MP3 est déposé dans le modal d'ajout, le lecteur analyse automatiquement le **nom du fichier** pour essayer de détecter l'artiste et le morceau, puis interroge l'API gratuite [MusicBrainz](https://musicbrainz.org/) (aucune clé API requise).

### Comment ça marche

1. **Parsing du nom de fichier** — Le module `musicAPI.js` extrait l'artiste et le titre à partir du nom du fichier. Formats reconnus :
   - `Artiste - Titre.mp3` (le plus courant)
   - `Artiste_Titre.mp3`
   - `Titre.mp3` (recherche sans artiste)

2. **Requête MusicBrainz** — Une recherche Lucene est envoyée à l'endpoint `/ws/2/recording/` avec les termes extraits. L'API renvoie les enregistrements correspondants avec leurs métadonnées.

3. **Auto-complétion** — Si un résultat est trouvé :
   - Le **titre** est formaté en `"Artiste - Titre"`
   - L'**album** et l'**année** sont remplis automatiquement
   - Une **description** est générée avec le genre musical et la durée
   - Un indicateur vert ✓ confirme la détection dans le formulaire

4. **Fallback** — Si aucun résultat n'est trouvé (fichier mal nommé, morceau non répertorié), le morceau est ajouté avec les métadonnées par défaut : album "Custom", description "Morceau ajouté manuellement."

### Détection de couleur dominante (Pixel Detector)

Quand une image de pochette est déposée dans le formulaire, le lecteur analyse ses pixels pour en extraire la **couleur dominante**. Cette couleur est ensuite appliquée aux **lava blobs** en arrière-plan lorsqu'on navigue sur cette piste.

1. **Lecture du fichier** — L'image est lue via `FileReader.readAsDataURL()` pour obtenir une data URL en base64, ce qui évite tout problème de CORS ou de canvas tainted.

2. **Dessin sur canvas** — L'image est dessinée sur un canvas temporaire de 100×100 pixels, puis on récupère les données RGBA de chaque pixel via `getImageData()`.

3. **Regroupement en buckets** — Chaque pixel est arrondi par pas de 32 (via bitshift `>> 5 << 5`) pour regrouper les couleurs proches dans un même "bucket". Les pixels trop sombres (noir) ou trop clairs (blanc) sont ignorés grâce à un filtre de luminosité perceptuelle.

4. **Bucket dominant** — On parcourt tous les buckets et on prend celui qui contient le plus de pixels → c'est la couleur majoritaire de la pochette.

5. **Moyenne précise** — Une 2e passe recalcule la vraie moyenne RGB de tous les pixels appartenant au bucket gagnant, pour obtenir une couleur plus fidèle que l'arrondi du bucket.

6. **Application** — La couleur hex résultante est stockée dans `track.color`. Quand on navigue vers cette piste, `updateLavaColors()` applique cette couleur aux sphères d'arrière-plan via GSAP.

### Bien nommer son fichier

Pour maximiser les chances de détection, nommez votre MP3 au format :
```
Artiste - Titre du morceau.mp3
```
Exemples qui fonctionnent :
- `Daft Punk - Around the World.mp3` → ✓ Détecté
- `Radiohead - Creep.mp3` → ✓ Détecté
- `morceau random.mp3` → ✗ Probablement non trouvé

## Stack

HTML · CSS · JavaScript vanilla · GSAP (animations + Draggable) · Web Audio API (mode réactif) · MusicBrainz API (détection métadonnées)

---

> **Fun fact** — Le projet était tellement ancien que quand je l'ai redécouvert, j'utilisais encore `gsap-trial` parce qu'à l'époque SplitText, Draggable & co. étaient **payants**. Depuis avril 2025, GSAP est devenu 100 % gratuit. J'ai pris un sacré coup de vieux. 👴
