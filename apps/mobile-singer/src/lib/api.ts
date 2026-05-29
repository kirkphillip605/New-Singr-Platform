/**
 * Singr Express API Client
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are sent for Better Auth sessions
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

export interface Show {
  id: string;
  showName: string;
  slug: string;
  isAccepting: boolean;
  venueName: string;
  distance: number;
  pinRequired?: boolean;
}

export interface Song {
  songId: string;
  title: string;
  artist: string;
}

export interface QueueRequest {
  id: string;
  singerName: string;
  song: {
    title: string;
    artist: string;
  };
  status: 'pending' | 'accepted' | 'playing' | 'processed';
  submittedAt: string;
}

/**
 * Get nearby public active shows based on lat/lon coordinates.
 */
export async function getNearbyVenues(latitude: number, longitude: number, rangeMiles = 25): Promise<any[]> {
  const data = await apiFetch(`/v1/shows/nearby?lat=${latitude}&lon=${longitude}&radius=${rangeMiles}`);
  return (data.shows || []).map((s: any) => ({
    venueId: s.slug,
    name: s.showName,
    venueName: s.venueName,
    distance: s.distance || 0,
    accepting: s.isAccepting,
    id: s.id,
  }));
}

/**
 * Join a show. Checks if PIN is required.
 */
export async function joinShow(slug: string, pinCode?: string): Promise<{ success: boolean; show?: any; pinRequired?: boolean; error?: string }> {
  try {
    const payload: any = {};
    if (pinCode) {
      payload.pin_code = pinCode;
    }
    const data = await apiFetch(`/v1/shows/${slug}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      success: data.success === true,
      show: data.show,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('PIN code is required')) {
      return { success: false, pinRequired: true };
    }
    return {
      success: false,
      error: err.message || 'Failed to join show.',
    };
  }
}

/**
 * Search the show's catalog of songs.
 */
export async function searchSongs(slug: string, query: string): Promise<{ songs: Song[]; songCount: number }> {
  const data = await apiFetch(`/v1/shows/${slug}/catalog?q=${encodeURIComponent(query)}&limit=50`);
  return {
    songCount: data.pagination?.total || 0,
    songs: (data.songs || []).map((s: any) => ({
      songId: s.id,
      artist: s.artist,
      title: s.title,
    })),
  };
}

/**
 * Submit a request to the show queue.
 */
export async function submitRequest(showId: string, songId: string, singerName: string, keyChange: number): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await apiFetch(`/v1/requests`, {
      method: 'POST',
      body: JSON.stringify({
        showId,
        songId,
        singerName,
        keyChange,
      }),
    });
    return {
      success: data.success === true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Request failed.',
    };
  }
}

/**
 * Get active requests queue (for Live view).
 */
export async function getLiveQueue(showId: string): Promise<QueueRequest[]> {
  const data = await apiFetch(`/v1/requests?showId=${showId}`);
  return data.requests || [];
}
