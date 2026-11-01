// Prints the reception QR code for a partner gym as an SVG (plus the text code for manual entry).
// Usage: npx tsx scripts/gym-qr.ts <gymId> [out.svg]
import QRCode from 'qrcode';

import { GYM_BY_ID } from '../src/data/gyms';
import { gymQrPayload } from '../src/lib/gyms';

const [id, out = `gym-${process.argv[2]}.svg`] = process.argv.slice(2);
const gym = id ? GYM_BY_ID[id] : undefined;
if (!gym) {
  console.error(`Unknown gym "${id ?? ''}". Known: ${Object.keys(GYM_BY_ID).join(', ')}`);
  process.exit(1);
}
const payload = gymQrPayload(gym);
QRCode.toFile(out, payload, { type: 'svg', margin: 2, width: 600, color: { dark: '#091017', light: '#ffffff' } }).then(() => {
  console.log(`${gym.name}: ${out}\nManual code: ${payload}`);
});
