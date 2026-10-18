import { describe, it, expect, beforeEach } from 'vitest';
import { menuRepo } from './menuRepo';
import { resetStore } from '../test/storeTestUtils';

beforeEach(async () => {
  await resetStore();
});

describe('menuRepo', () => {
  it('adds an item defaulting to available with empty modifiers', async () => {
    const id = await menuRepo.add({
      name: '  Burger  ',
      category: '  Snacks  ',
      basePrice: 45,
    });
    expect(typeof id).toBe('string');
    const item = await menuRepo.getById(id);
    expect(item).toMatchObject({
      name: 'Burger', // trimmed
      category: 'Snacks', // trimmed
      basePrice: 45,
      available: true,
      modifierGroups: [],
    });
  });

  it('lists items ordered by category then name', async () => {
    await menuRepo.add({ name: 'Zebra Cake', category: 'Snacks', basePrice: 10 });
    await menuRepo.add({ name: 'Americano', category: 'Drinks', basePrice: 50 });
    await menuRepo.add({ name: 'Latte', category: 'Drinks', basePrice: 60 });

    const names = (await menuRepo.list()).map((i) => `${i.category}/${i.name}`);
    expect(names).toEqual([
      'Drinks/Americano',
      'Drinks/Latte',
      'Snacks/Zebra Cake',
    ]);
  });

  it('listAvailable excludes sold-out items', async () => {
    const soldOut = await menuRepo.add({
      name: 'Rare Brew',
      category: 'Drinks',
      basePrice: 80,
    });
    await menuRepo.add({ name: 'House Blend', category: 'Drinks', basePrice: 55 });

    await menuRepo.setAvailable(soldOut, false);

    const available = await menuRepo.listAvailable();
    expect(available.map((i) => i.name)).toEqual(['House Blend']);
  });

  it('updates and removes an item', async () => {
    const id = await menuRepo.add({
      name: 'Fries',
      category: 'Snacks',
      basePrice: 40,
    });

    await menuRepo.update(id, { basePrice: 45 });
    expect((await menuRepo.getById(id))!.basePrice).toBe(45);

    await menuRepo.remove(id);
    expect(await menuRepo.getById(id)).toBeUndefined();
  });

  it('resetToDefault replaces all items with the default menu', async () => {
    await menuRepo.add({ name: 'Custom Thing', category: 'X', basePrice: 1 });
    expect(await menuRepo.list()).toHaveLength(1);

    const seeded = await menuRepo.resetToDefault();

    const items = await menuRepo.list();
    expect(items).toHaveLength(seeded);
    expect(seeded).toBeGreaterThan(1);
    expect(items.some((i) => i.name === 'Custom Thing')).toBe(false);
    expect(items.some((i) => i.name === 'FISH BALL')).toBe(true);
    const coke = items.find((i) => i.name === 'COKE FLOAT');
    expect(coke?.modifierGroups[0]?.name).toBe('Size');
    expect(coke?.modifierGroups[0]?.options).toHaveLength(3);
  });
});
