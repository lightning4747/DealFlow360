import { ProductsService } from '../src/modules/products/products.service';
import { CustomerTiersService } from '../src/modules/customer-tiers/customer-tiers.service';
import { PriceListsService } from '../src/modules/price-lists/price-lists.service';
import { sqlClient } from '@dealflow360/database';

describe('Integration Test: Master Data CRUD Services (PostgreSQL)', () => {
  let productsService: ProductsService;
  let tiersService: CustomerTiersService;
  let priceListsService: PriceListsService;

  beforeAll(() => {
    productsService = new ProductsService();
    tiersService = new CustomerTiersService();
    priceListsService = new PriceListsService();
  });

  afterAll(async () => {
    await sqlClient.end();
  });

  it('should list seeded customer tiers', async () => {
    const tiers = await tiersService.findAll();
    expect(tiers.length).toBeGreaterThanOrEqual(4);
    const goldTier = tiers.find((t) => t.code === 'GLD');
    expect(goldTier).toBeDefined();
    expect(goldTier?.maxDiscountPct).toBe(25);
  });

  it('should list seeded products with pagination and category filtering', async () => {
    const hardwareResult = await productsService.findAll({
      category: 'hardware',
      page: 1,
      limit: 10,
    });

    expect(hardwareResult.items.length).toBeGreaterThan(0);
    expect(hardwareResult.items.every((p) => p.category === 'hardware')).toBe(true);
    expect(hardwareResult.meta.total).toBeGreaterThan(0);
  });

  it('should create a new product, find it, update it, and deactivate it', async () => {
    const testSku = `TEST-${Date.now()}`;
    const created = await productsService.create({
      sku: testSku,
      name: 'Integration Test Product',
      category: 'services',
      basePrice: 1999.99,
      unitCost: 1000,
      unit: 'project',
      description: 'Temporary test fixture',
    });

    expect(created.id).toBeDefined();
    expect(created.sku).toBe(testSku);

    // Find product
    const found = await productsService.findOne(created.id);
    expect(found.name).toBe('Integration Test Product');

    // Update product
    const updated = await productsService.update(created.id, {
      name: 'Updated Integration Product',
      basePrice: 2499.99,
    });
    expect(updated.name).toBe('Updated Integration Product');
    expect(updated.basePrice).toBe(2499.99);

    // Deactivate
    const removal = await productsService.remove(created.id);
    expect(removal.success).toBe(true);

    const deactivated = await productsService.findOne(created.id);
    expect(deactivated.isActive).toBe(false);
  });

  it('should create a custom price list and add price overrides', async () => {
    const plName = `VIP Enterprise Pricing ${Date.now()}`;
    const priceList = await priceListsService.create({
      name: plName,
      effectiveDate: new Date().toISOString(),
    });

    expect(priceList.id).toBeDefined();

    // Fetch any existing product
    const productsList = await productsService.findAll({ page: 1, limit: 1 });
    const testProduct = productsList.items[0];

    const bulkResult = await priceListsService.addItems(priceList.id, {
      items: [{ productId: testProduct.id, price: 888.88 }],
    });

    expect(bulkResult.updatedCount).toBe(1);

    const detailed = await priceListsService.findOne(priceList.id);
    expect(detailed.items.length).toBe(1);
    expect(detailed.items[0].price).toBe(888.88);
  });
});
