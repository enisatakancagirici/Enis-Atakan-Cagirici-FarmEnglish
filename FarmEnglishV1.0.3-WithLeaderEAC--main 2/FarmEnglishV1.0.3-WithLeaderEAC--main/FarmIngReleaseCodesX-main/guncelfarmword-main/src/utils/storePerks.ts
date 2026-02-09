import type { ActiveBoost } from '../models/types';

const isActive = (boost: ActiveBoost, now: number) => boost.expiresAt > now;

export const getSeedDiscountFactor = (ownedItems: string[]) => {
  const factors: Array<[string, number]> = [
    ['seed_discount_30', 0.7],
    ['seed_discount_15', 0.85],
    ['seed_discount_10', 0.9],
  ];

  for (const [id, factor] of factors) {
    if (ownedItems.includes(id)) return factor;
  }
  return 1;
};

export const getPhrasalDiscountFactor = (ownedItems: string[]) => {
  const factors: Array<[string, number]> = [
    ['phrasal_discount_30', 0.7],
    ['phrasal_discount_15', 0.85],
    ['phrasal_discount_10', 0.9],
  ];

  for (const [id, factor] of factors) {
    if (ownedItems.includes(id)) return factor;
  }
  return 1;
};

export const getHintBonusMultiplier = (ownedItems: string[]) => {
  if (ownedItems.includes('hint_bonus_75')) return 1.75;
  if (ownedItems.includes('hint_bonus_30')) return 1.3;
  return 1;
};

export const applyHintBonus = (baseHints: number, ownedItems: string[]) => {
  const mult = getHintBonusMultiplier(ownedItems);
  return Math.max(0, Math.floor(baseHints * mult));
};

export const getPermanentQuizRewardMultiplier = (ownedItems: string[], kind: 'coin' | 'xp') => {
  if (kind === 'coin') {
    if (ownedItems.includes('coin_charm_20')) return 1.2;
    if (ownedItems.includes('coin_charm_10')) return 1.1;
    return 1;
  }

  if (ownedItems.includes('xp_charm_20')) return 1.2;
  if (ownedItems.includes('xp_charm_10')) return 1.1;
  return 1;
};

export const getBoostMultiplier = (activeBoosts: ActiveBoost[] | undefined, kind: 'coin' | 'xp') => {
  const boosts = activeBoosts ?? [];
  const now = Date.now();

  let mult = 1;

  // Mega boosts apply to both.
  if (boosts.some(b => b.id === 'mega_boost_30' && isActive(b, now))) mult = Math.max(mult, 1.75);
  if (boosts.some(b => b.id === 'mega_boost_15' && isActive(b, now))) mult = Math.max(mult, 1.5);

  if (kind === 'coin') {
    if (boosts.some(b => b.id === 'coin_boost_120' && isActive(b, now))) mult = Math.max(mult, 2);
    if (boosts.some(b => b.id === 'coin_boost_60' && isActive(b, now))) mult = Math.max(mult, 1.75);
    if (boosts.some(b => b.id === 'coin_boost_30' && isActive(b, now))) mult = Math.max(mult, 1.5);
    if (boosts.some(b => b.id === 'coin_boost_15' && isActive(b, now))) mult = Math.max(mult, 1.35);
  } else {
    if (boosts.some(b => b.id === 'xp_boost_120' && isActive(b, now))) mult = Math.max(mult, 2);
    if (boosts.some(b => b.id === 'xp_boost_60' && isActive(b, now))) mult = Math.max(mult, 1.75);
    if (boosts.some(b => b.id === 'xp_boost_30' && isActive(b, now))) mult = Math.max(mult, 1.5);
    if (boosts.some(b => b.id === 'xp_boost_15' && isActive(b, now))) mult = Math.max(mult, 1.35);
  }

  return mult;
};
