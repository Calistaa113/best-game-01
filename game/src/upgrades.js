// The upgrade cards offered between waves: each one names what it does, shows a
// glyph, and changes the player's numbers. The world rolls three different ones
// the player does not already hold at its cap.

export const UPGRADE_POOL = [
  {
    id: 'rapid',
    name: 'Rapid Cinders',
    desc: '+25% fire rate',
    glyph: '»»',
    max: 4,
    apply(player) {
      player.fireInterval *= 0.8;
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Ember',
    desc: '+30% bullet damage',
    glyph: '◆',
    max: 5,
    apply(player) {
      player.bulletDamage *= 1.3;
    },
  },
  {
    id: 'twin',
    name: 'Twin Shot',
    desc: '+1 bullet per shot',
    glyph: '✦✦',
    max: 3,
    apply(player) {
      player.projectiles += 1;
    },
  },
  {
    id: 'swift',
    name: 'Swift Boots',
    desc: '+15% move speed',
    glyph: '➤',
    max: 3,
    apply(player) {
      player.speed *= 1.15;
    },
  },
  {
    id: 'shell',
    name: 'Thick Shell',
    desc: '+25 max HP, heal 25',
    glyph: '⬢',
    max: 4,
    apply(player) {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
    },
  },
  {
    id: 'pierce',
    name: 'Piercing Shots',
    desc: 'Bullets pierce +1 enemy',
    glyph: '—›',
    max: 3,
    apply(player) {
      player.pierce += 1;
    },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    desc: '+60% ember pickup radius',
    glyph: '◎',
    max: 3,
    apply(player) {
      player.emberRadius *= 1.6;
    },
  },
];

/** Roll `count` distinct upgrades the player can still take. */
export function rollUpgrades(rng, owned, count = 3) {
  const available = UPGRADE_POOL.filter((u) => (owned[u.id] || 0) < u.max);
  const picks = [];
  while (picks.length < count && available.length > 0) {
    const index = Math.floor(rng.next() * available.length);
    picks.push(available.splice(index, 1)[0]);
  }
  return picks;
}
