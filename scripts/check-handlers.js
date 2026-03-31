async function check(path) {
  try {
    const mod = await import(path);
    console.log(path, '->', typeof mod.default === 'function' ? 'handler function' : typeof mod.default);
  } catch (e) {
    console.error(path, 'failed to import:', e && e.message ? e.message : e);
  }
}

async function run() {
  await check('../api/ready.js');
  await check('../api/commands.js');
  await check('../api/me.js');
  await check('../api/auth/discord.js');
  await check('../api/auth/discord/callback.js');
  await check('../api/auth/complete.js');
}

run().catch((e) => { console.error('check script failed', e); process.exit(1); });
