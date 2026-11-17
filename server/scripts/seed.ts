import { initDatabase } from '../config/db.ts';
import { ensureSeeded } from '../services/seedService.ts';

async function runSeed() {
  const force = process.argv.includes('--force');
  await initDatabase();
  const seeded = await ensureSeeded(force);
  console.log(
    seeded
      ? 'Database seeded successfully with Comfort Stay PG data.'
      : 'Database already contains data. Pass --force to reset and reseed.'
  );
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
