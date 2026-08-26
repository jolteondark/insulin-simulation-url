const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

expect(
  index.includes('app.js?v=20260826-scale-audit1'),
  'index.html must reference the correction-scale audited app with a fresh cache-bust key'
);
expect(
  !index.includes('app.js?v=20260818-2305'),
  'stale app.js cache key must not remain in the public index'
);
expect(app.includes('function effectiveRapid('), 'audited app must calculate effective rapid dose');
expect(app.includes('function rapidHistoryCell('), 'audited app must render actual rapid dose');
expect(app.includes('correction_doses_u'), 'audited app must consume correction-scale doses');

console.log('public_asset_cache_bust: PASS');
