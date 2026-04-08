// ── Module MusicBrainz API ──
// détecte automatiquement artiste/album/genre depuis le nom du fichier MP3
// doc : https://musicbrainz.org/doc/MusicBrainz_API

const MB_API = 'https://musicbrainz.org/ws/2';
const HEADERS = {
  'Accept': 'application/json',
};

// parse le nom du fichier pour en extraire artiste + titre
// supporte "Artiste - Titre.mp3", "Artiste_Titre.mp3", ou juste "Titre.mp3"
function parseFilename(filename) {
  let name = filename.replace(/\.[^.]+$/, '');

  // format "Artiste - Titre" (le plus courant)
  const dashMatch = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      track: dashMatch[2].trim().replace(/\s*\(.*\)$/, ''),
    };
  }

  // format "Artiste_Titre"
  const underscoreMatch = name.match(/^(.+?)_(.+)$/);
  if (underscoreMatch) {
    return {
      artist: underscoreMatch[1].trim(),
      track: underscoreMatch[2].trim(),
    };
  }

  // fallback : juste le titre
  return { artist: '', track: name.trim() };
}

// cherche un enregistrement sur MusicBrainz et renvoie les métadonnées ou null
export async function lookupTrack(filename) {
  const { artist, track } = parseFilename(filename);
  if (!track) return null;

  // requête Lucene sur l'API
  let query = `recording:"${encodeURIComponent(track)}"`;
  if (artist) {
    query += ` AND artist:"${encodeURIComponent(artist)}"`;
  }

  const url = `${MB_API}/recording/?query=${query}&limit=5&fmt=json`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    const recordings = data.recordings;
    if (!recordings || recordings.length === 0) return null;

    // on prend le 1er résultat qui a un album (release)
    const best = recordings.find(r => r.releases && r.releases.length > 0) || recordings[0];

    const artistName = best['artist-credit']?.[0]?.name || artist || 'Artiste inconnu';
    const trackTitle = best.title || track;
    const release = best.releases?.[0];
    const albumTitle = release?.title || '';
    const releaseDate = release?.date?.substring(0, 4) || '';
    const albumDisplay = albumTitle
      ? (releaseDate ? `${albumTitle} (${releaseDate})` : albumTitle)
      : 'Single';

    // on construit une description lisible avec les infos dispo
    const tags = best.tags?.slice(0, 3).map(t => t.name).join(', ') || '';
    const duration = best.length
      ? `${Math.floor(best.length / 60000)}:${String(Math.floor((best.length % 60000) / 1000)).padStart(2, '0')}`
      : '';

    let desc = `${artistName} — "${trackTitle}"`;
    if (albumTitle) desc += `, extrait de l'album ${albumDisplay}`;
    desc += '.';
    if (tags) desc += ` Genre : ${tags}.`;
    if (duration) desc += ` Durée : ${duration}.`;

    // titre formaté "Artiste - Titre" pour l'affichage
    const formattedTitle = `${artistName} - ${trackTitle}`;

    return {
      title: formattedTitle,
      artist: artistName,
      album: albumDisplay,
      desc,
      found: true,
    };
  } catch {
    return null;
  }
}
