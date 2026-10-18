import type { MenuItem } from '../types';
import { activeBusinessId } from '../config/tenancy';
import { getDb, newId } from './rxdb';

/**
 * The stall's real menu, seeded into an empty database on first launch.
 * Prices are in PHP. Source: knowledge/menu-products.json.
 *
 * Modelling notes:
 *  - Burgers/sandwiches, hotdogs/sausages and footlongs/halflongs are the same
 *    product sold in a few add-on variants (e.g. BURGER "Regular" vs "w/ Cheese"),
 *    so each is one item with a required single-select "Variant" group — the same
 *    pattern as Fruit Soda. Base price = cheapest variant; each variant carries
 *    the price delta from that base.
 *  - Items that genuinely vary by size (Coke Float, Fruit Soda) use a required
 *    single-select Size group: base price = smallest size, larger sizes carry
 *    the price delta.
 *  - Flavour choices (Ice Cream, Fruit Soda) are required single-select groups
 *    with ₱0 deltas (flavour doesn't change the price).
 */

/** Build a required single-select Size group from oz → price pairs. */
function sizeGroup(
  sizes: { label: string; price: number }[]
): MenuItem['modifierGroups'][number] {
  const base = sizes[0].price;
  return {
    id: 'size',
    name: 'Size',
    selectionType: 'single',
    required: true,
    options: sizes.map((s) => ({
      id: s.label,
      name: s.label,
      priceDelta: +(s.price - base).toFixed(2),
    })),
  };
}

/** Build a required single-select Flavour group (all ₱0 deltas). */
function flavourGroup(
  flavours: string[]
): MenuItem['modifierGroups'][number] {
  return {
    id: 'flavour',
    name: 'Flavour',
    selectionType: 'single',
    required: true,
    options: flavours.map((f) => ({
      id: f.toLowerCase().replace(/\s+/g, '-'),
      name: f,
      priceDelta: 0,
    })),
  };
}

/**
 * Build a required single-select "Variant" group from label → price pairs.
 * The cheapest variant becomes the item's base price; every variant carries the
 * delta from that base (same technique as `sizeGroup`). This lets products that
 * only differ by add-ons (e.g. BURGER vs. BURGER w/ Cheese) be one item with a
 * picker, instead of many separate tiles.
 */
function variantGroup(
  variants: { label: string; price: number }[]
): { base: number; group: MenuItem['modifierGroups'][number] } {
  const base = Math.min(...variants.map((v) => v.price));
  return {
    base,
    group: {
      id: 'variant',
      name: 'Variant',
      selectionType: 'single',
      required: true,
      options: variants.map((v) => ({
        id: v.label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        name: v.label,
        priceDelta: +(v.price - base).toFixed(2),
      })),
    },
  };
}

/** Build a single item carrying a required Variant group. */
function variantItem(
  name: string,
  category: string,
  variants: { label: string; price: number }[]
): Omit<MenuItem, 'id'> {
  const { base, group } = variantGroup(variants);
  return {
    name,
    category,
    basePrice: base,
    available: true,
    modifierGroups: [group],
  };
}

/** A plain, modifier-free item helper. */
function plain(
  name: string,
  category: string,
  basePrice: number
): Omit<MenuItem, 'id'> {
  return { name, category, basePrice, available: true, modifierGroups: [] };
}

const STREET_FOODS = [
  'FRENCH FRIES',
  'FISH BALL',
  'KIKIAM',
  'SQUID BALLS',
  'CHICKEN BALLS',
  'HOTDOG',
].map((name) => plain(name, 'Street Foods', 20));

const BURGERS_SANDWICHES: Omit<MenuItem, 'id'>[] = [
  variantItem('BURGER', 'Burgers & Sandwiches', [
    { label: 'Regular', price: 30 },
    { label: 'w/ Cheese', price: 36 },
    { label: 'w/ Egg', price: 42 },
    { label: 'w/ Cheese & Egg', price: 48 },
  ]),
  variantItem('HAM', 'Burgers & Sandwiches', [
    { label: 'w/ Cheese', price: 30 },
    { label: 'w/ Egg', price: 35 },
    { label: 'w/ Cheese & Egg', price: 40 },
  ]),
  variantItem('BACON', 'Burgers & Sandwiches', [
    { label: 'w/ Egg', price: 35 },
    { label: 'w/ Cheese & Egg', price: 40 },
  ]),
];

const HOTDOGS_SAUSAGES: Omit<MenuItem, 'id'>[] = [
  variantItem('HOTDOG', 'Hotdogs & Sausages', [
    { label: 'On Stick', price: 20 },
    { label: 'Sandwich', price: 30 },
    { label: 'Sandwich w/ Cheese', price: 35 },
    { label: 'Egg Roll Sandwich', price: 40 },
  ]),
  variantItem('HUNGARIAN SAUSAGE', 'Hotdogs & Sausages', [
    { label: 'On Stick', price: 40 },
    { label: 'Sandwich', price: 55 },
  ]),
];

const FOOTLONGS_HALFLONGS: Omit<MenuItem, 'id'>[] = [
  variantItem('FOOTLONG', 'Footlongs & Halflongs', [
    { label: 'Regular', price: 40 },
    { label: 'w/ Cheese', price: 50 },
    { label: 'w/ Coleslaw', price: 50 },
    { label: 'w/ Cheese & Coleslaw', price: 60 },
  ]),
  variantItem('HALFLONG', 'Footlongs & Halflongs', [
    { label: 'Regular', price: 25 },
    { label: 'w/ Cheese', price: 30 },
    { label: 'w/ Coleslaw', price: 30 },
    { label: 'w/ Cheese & Coleslaw', price: 35 },
  ]),
];

const FLOATS: Omit<MenuItem, 'id'>[] = [
  {
    name: 'COKE FLOAT',
    category: 'Floats',
    basePrice: 25,
    available: true,
    modifierGroups: [
      sizeGroup([
        { label: '8oz', price: 25 },
        { label: '12oz', price: 35 },
        { label: '16oz', price: 45 },
      ]),
    ],
  },
  plain('CHUCKIE FLOAT', 'Floats', 49),
  plain('DUTCHMILL STRAWBERRY FLOAT', 'Floats', 49),
  plain('LUCKY DAY COFFEE FLOAT', 'Floats', 55),
];

const DESSERTS_SODAS: Omit<MenuItem, 'id'>[] = [
  {
    name: 'ICE CREAM',
    category: 'Desserts & Sodas',
    basePrice: 15,
    available: true,
    modifierGroups: [flavourGroup(['COOKIES & CREAM'])],
  },
  plain('MILO CON YELO', 'Desserts & Sodas', 30),
  plain('GRAHAM CON YELO', 'Desserts & Sodas', 30),
  {
    name: 'FRUIT SODA',
    category: 'Desserts & Sodas',
    basePrice: 20,
    available: true,
    modifierGroups: [
      sizeGroup([
        { label: '8oz', price: 20 },
        { label: '12oz', price: 30 },
        { label: '16oz', price: 40 },
      ]),
      flavourGroup([
        'GREEN APPLE',
        'LYCHEE',
        'STRAWBERRY',
        'WINTER MELON',
        'BLUEBERRY',
      ]),
    ],
  },
];

export const MENU: Omit<MenuItem, 'id'>[] = [
  ...STREET_FOODS,
  ...BURGERS_SANDWICHES,
  ...HOTDOGS_SAUSAGES,
  ...FOOTLONGS_HALFLONGS,
  ...FLOATS,
  ...DESSERTS_SODAS,
];

/**
 * Populate the menu if (and only if) it is currently empty. Safe to call on
 * every app start. Returns the number of items inserted.
 */
export async function seedIfEmpty(): Promise<number> {
  const db = await getDb();
  const count = await db.menuitems.count().exec();
  if (count > 0) return 0;
  const now = Date.now();
  const businessId = activeBusinessId();
  const stamped = (MENU as MenuItem[]).map((item) => ({
    ...item,
    id: newId(),
    businessId,
    updatedAt: now,
    isDeleted: false,
  }));
  await db.menuitems.bulkInsert(stamped);
  return MENU.length;
}
