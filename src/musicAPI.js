// ── MusicBrainz API Module ──
// Auto-detect track metadata from filename using the free MusicBrainz API
// Docs: https://musicbrainz.org/doc/MusicBrainz_API

const MB_API = 'https://musicbrainz.org/ws/2';
const HEADERS = {
  'Accept': 'application/json',
};

/**
 * Parse an MP3 filename to extract artist and track name.
 * Supports formats like:
 *   "Artist - Title.mp3"
 *   "Artist_Title.mp3"
 *   "Artist - Title (feat. X).mp3"
 *   "Title.mp3" (artist unknown)
 */
function parseFilename(filename) {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, '');

  // Try "Artist - Title" format (most common)
  const dashMatch = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      track: dashMatch[2].trim().replace(/\s*\(.*\)$/, ''), // Remove (feat. X) etc.
    };
  }

  // Try "Artist_Title" format
  const underscoreMatch = name.match(/^(.+?)_(.+)$/);
  if (underscoreMatch) {
    return {
      artist: underscoreMatch[1].trim(),
      track: underscoreMatch[2].trim(),
    };
  }

  // Fallback: just the title
  return { artist: '', track: name.trim() };
}

/**
 * Search MusicBrainz for a recording matching artist + track name.
 * Returns metadata object or null if not found.
 */
export async function lookupTrack(filename) {
  const { artist, track } = parseFilename(filename);
  if (!track) return null;

  // Build Lucene query
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

    // Pick the best match (first result with a release)
    const best = recordings.find(r => r.releases && r.releases.length > 0) || recordings[0];

    const artistName = best['artist-credit']?.[0]?.name || artist || 'Artiste inconnu';
    const trackTitle = best.title || track;
    const release = best.releases?.[0];
    const albumTitle = release?.title || '';
    const releaseDate = release?.date?.substring(0, 4) || '';
    const albumDisplay = albumTitle
      ? (releaseDate ? `${albumTitle} (${releaseDate})` : albumTitle)
      : 'Single';

    // Try to build a description from available data
    const tags = best.tags?.slice(0, 3).map(t => t.name).join(', ') || '';
    const duration = best.length
      ? `${Math.floor(best.length / 60000)}:${String(Math.floor((best.length % 60000) / 1000)).padStart(2, '0')}`
      : '';

    let desc = `${artistName} — "${trackTitle}"`;
    if (albumTitle) desc += `, extrait de l'album ${albumDisplay}`;
    desc += '.';
    if (tags) desc += ` Genre : ${tags}.`;
    if (duration) desc += ` Durée : ${duration}.`;

    // Build the formatted title "Artist - Track"
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
