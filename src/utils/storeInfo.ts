/**
 * Static stall details printed on the receipt header. There is no backend, so
 * these are edited here. Kept in one place so a stall owner only touches this
 * file to rebrand the printed receipt.
 */
export const STORE_INFO = {
  name: 'KAFFEED',
  tagline: 'Coffee & Street Eats',
  address: '123 Rizal Street, Barangay Uno, Quezon City',
  phone: '0917 123 4567',
  email: 'hello@kaffeed.ph',
  website: 'www.kaffeed.ph',
  footer: 'Thank you! We hope to see you again.',
} as const;
