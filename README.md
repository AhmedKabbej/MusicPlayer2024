# Lecteur Musical

Lecteur de playlist interactif avec une esthétique rétro-luxe. **100% vanilla** — pas de Three.js, pas de WebGL. Toute la 3D est simulée en pur CSS.

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
