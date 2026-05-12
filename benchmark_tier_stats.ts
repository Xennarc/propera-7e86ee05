const NUM_RESORTS = 10000;

const allResorts = Array.from({ length: NUM_RESORTS }).map((_, i) => ({
  id: `resort-${i}`,
  subscription_tier: i % 3 === 0 ? 'ESSENTIAL' : i % 3 === 1 ? 'PROFESSIONAL' : 'ELITE',
  subscription_expires_at: i % 2 === 0 ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() : null,
  is_demo: i % 5 === 0
}));

function original() {
  const distribution: Record<string, number> = {
    ESSENTIAL: 0,
    PROFESSIONAL: 0,
    ELITE: 0,
  };

  let expiringSoon = 0;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const resort of allResorts || []) {
    const tier = resort.subscription_tier || 'ESSENTIAL';
    if (distribution[tier] !== undefined) {
      distribution[tier]++;
    }

    if (resort.subscription_expires_at) {
      const expiresAt = new Date(resort.subscription_expires_at);
      if (expiresAt <= thirtyDaysFromNow && expiresAt > now) {
        expiringSoon++;
      }
    }
  }

  return {
    distribution,
    total: allResorts?.length || 0,
    expiringSoon,
    demoCount: allResorts?.filter((r) => r.is_demo).length || 0,
  };
}

function optimized() {
  const distribution: Record<string, number> = {
    ESSENTIAL: 0,
    PROFESSIONAL: 0,
    ELITE: 0,
  };

  let expiringSoon = 0;
  let demoCount = 0;
  const now = Date.now();
  const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

  const total = allResorts ? allResorts.length : 0;
  if (!total) {
    return { distribution, total, expiringSoon, demoCount };
  }

  for (let i = 0; i < total; i++) {
    const resort = allResorts[i];
    const tier = resort.subscription_tier || 'ESSENTIAL';
    if (distribution[tier] !== undefined) {
      distribution[tier]++;
    }

    if (resort.subscription_expires_at) {
      const expiresAt = Date.parse(resort.subscription_expires_at);
      if (expiresAt <= thirtyDaysFromNow && expiresAt > now) {
        expiringSoon++;
      }
    }

    if (resort.is_demo) {
        demoCount++;
    }
  }

  return {
    distribution,
    total,
    expiringSoon,
    demoCount,
  };
}

console.log('Original output:', original());
console.log('Optimized output:', optimized());

const RUNS = 1000;

console.time('original');
for(let i = 0; i < RUNS; i++) original();
console.timeEnd('original');

console.time('optimized');
for(let i = 0; i < RUNS; i++) optimized();
console.timeEnd('optimized');
