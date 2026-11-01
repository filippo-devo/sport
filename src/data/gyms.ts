import type { PartnerGym } from './types';

// Partner gym registry.
//
// Adding a partner gym: append an entry with a unique `id`, the reception's coordinates and a
// geofence radius, and a random `code` (e.g. `node -e "console.log(require('crypto').randomBytes(6).toString('hex'))"`).
// Then print its QR with `node scripts/gym-qr.mjs <id>` and put it up at the reception.
//
// This list ships inside the app, so the codes can be read from the bundle. That is fine for a
// pilot; for production the registry and the check-in verification move to the server
// (Supabase table `partner_gyms` + an Edge Function that issues rotating codes), see supabase/README.md.
export const PARTNER_GYMS: PartnerGym[] = [
  {
    id: 'test',
    name: 'GameChanger Test Gym',
    address: '—',
    city: '—',
    // No geofence: lets you try the whole flow anywhere by scanning the test QR shown in the app.
    location: null,
    code: 'f3a9c1d27e4b',
    test: true,
  },
];

export const GYM_BY_ID: Record<string, PartnerGym> = Object.fromEntries(PARTNER_GYMS.map((g) => [g.id, g]));
