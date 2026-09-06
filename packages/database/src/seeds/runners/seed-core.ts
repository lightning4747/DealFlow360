import { db } from '../../client';
import {
  users,
  customerTiers,
  products,
  priceLists,
  priceListItems,
  customers,
  discountCeilings,
  productRecommendations,
  quotes,
  quoteLines,
  approvals,
  approvalSteps,
  invoices,
  invoiceLines,
  subscriptions,
  payments,
} from '../../schema/sales.schema';
import { warehouses, warehouseStock } from '../../schema/fulfillment.schema';
import { getUsersData } from '../data/users.data';
import { warehouseData } from '../data/warehouses.data';
import { customerData } from '../data/customers.data';

export async function seedCoreDomain() {
  console.log('🌱 [Core] Seeding baseline customer tiers...');
  const tierData = [
    { name: 'Standard', code: 'STD', maxDiscountPct: '10.00', approvalThresholdPct: '5.00', description: 'Standard baseline terms' },
    { name: 'Silver', code: 'SLV', maxDiscountPct: '15.00', approvalThresholdPct: '8.00', description: 'Silver partner tier' },
    { name: 'Gold', code: 'GLD', maxDiscountPct: '25.00', approvalThresholdPct: '15.00', description: 'Gold enterprise tier' },
    { name: 'Platinum', code: 'PLT', maxDiscountPct: '35.00', approvalThresholdPct: '20.00', description: 'Platinum strategic account tier' },
  ];

  const insertedTiers: Record<string, string> = {};
  for (const t of tierData) {
    const [record] = await db
      .insert(customerTiers)
      .values(t)
      .onConflictDoUpdate({
        target: customerTiers.code,
        set: { maxDiscountPct: t.maxDiscountPct, approvalThresholdPct: t.approvalThresholdPct },
      })
      .returning();
    insertedTiers[t.code] = record.id;
  }

  console.log('🌱 [Core] Seeding 35 RBAC Users...');
  const userDataList = await getUsersData();
  const insertedUsers: Record<string, { id: string; email: string; name: string; role: string }> = {};

  for (const u of userDataList) {
    const [record] = await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: { name: u.name, role: u.role, hashedPassword: u.hashedPassword },
      })
      .returning();
    insertedUsers[u.email] = record;
  }

  console.log('🌱 [Core] Seeding 12 Spatial Warehouses...');
  const insertedWarehouses: Record<string, string> = {};
  for (const wh of warehouseData) {
    const [record] = await db
      .insert(warehouses)
      .values(wh)
      .onConflictDoUpdate({
        target: warehouses.code,
        set: { name: wh.name, address: wh.address, latitude: wh.latitude, longitude: wh.longitude },
      })
      .returning();
    insertedWarehouses[wh.code] = record.id;
  }

  console.log('🌱 [Core] Seeding 15 Customer Accounts...');
  const insertedCustomers: Record<string, string> = {};
  for (const c of customerData) {
    const tierId = c.tier === 'platinum' ? insertedTiers['PLT'] : c.tier === 'gold' ? insertedTiers['GLD'] : c.tier === 'silver' ? insertedTiers['SLV'] : insertedTiers['STD'];
    const [record] = await db
      .insert(customers)
      .values({ ...c, tierId })
      .onConflictDoUpdate({
        target: customers.email,
        set: { name: c.name, company: c.company, creditLimit: c.creditLimit },
      })
      .returning();
    insertedCustomers[c.email] = record.id;
  }

  return { insertedTiers, insertedUsers, insertedWarehouses, insertedCustomers };
}
