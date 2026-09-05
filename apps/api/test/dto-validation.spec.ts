import {
  CreateProductSchema,
  CreateCustomerTierSchema,
  CreatePriceListSchema,
  BulkPriceListItemsSchema,
  LoginRequestSchema,
} from '@dealflow360/types';

describe('Unit Test: Zod Data Contracts & Validation Boundaries', () => {
  describe('CreateProductSchema', () => {
    it('should validate a correct product payload', () => {
      const validProduct = {
        sku: 'HW-SRV-999',
        name: 'Enterprise Test Server',
        category: 'hardware',
        basePrice: 5000,
        unitCost: 3500,
        unit: 'each',
        taxRate: 8,
        description: 'High performance compute unit',
        isActive: true,
      };

      const parsed = CreateProductSchema.parse(validProduct);
      expect(parsed.sku).toBe('HW-SRV-999');
      expect(parsed.basePrice).toBe(5000);
    });

    it('should reject invalid SKU length < 3', () => {
      expect(() =>
        CreateProductSchema.parse({
          sku: 'AB',
          name: 'Short SKU',
          category: 'hardware',
          basePrice: 100,
          unitCost: 50,
        }),
      ).toThrow();
    });

    it('should reject negative base price', () => {
      expect(() =>
        CreateProductSchema.parse({
          sku: 'HW-SRV-001',
          name: 'Negative Server',
          category: 'hardware',
          basePrice: -50,
          unitCost: 10,
        }),
      ).toThrow();
    });

    it('should reject invalid product category', () => {
      expect(() =>
        CreateProductSchema.parse({
          sku: 'HW-SRV-001',
          name: 'Unknown Category Product',
          category: 'invalid_category',
          basePrice: 100,
          unitCost: 50,
        }),
      ).toThrow();
    });
  });

  describe('CreateCustomerTierSchema', () => {
    it('should accept valid customer tier specifications', () => {
      const tier = {
        name: 'Enterprise Diamond',
        code: 'DIA',
        maxDiscountPct: 40,
        approvalThresholdPct: 25,
        description: 'Top strategic enterprise tier',
      };

      const parsed = CreateCustomerTierSchema.parse(tier);
      expect(parsed.code).toBe('DIA');
      expect(parsed.maxDiscountPct).toBe(40);
    });

    it('should reject discount ceiling greater than 100%', () => {
      expect(() =>
        CreateCustomerTierSchema.parse({
          name: 'Extreme Discount Tier',
          code: 'EXT',
          maxDiscountPct: 150,
          approvalThresholdPct: 20,
        }),
      ).toThrow();
    });

    it('should reject negative discount ceiling', () => {
      expect(() =>
        CreateCustomerTierSchema.parse({
          name: 'Negative Discount Tier',
          code: 'NEG',
          maxDiscountPct: -5,
          approvalThresholdPct: 10,
        }),
      ).toThrow();
    });
  });

  describe('CreatePriceListSchema and BulkPriceListItemsSchema', () => {
    it('should validate price list creation schema', () => {
      const pl = {
        name: 'Q3 Enterprise Promo',
        effectiveDate: new Date().toISOString(),
      };
      const parsed = CreatePriceListSchema.parse(pl);
      expect(parsed.name).toBe('Q3 Enterprise Promo');
    });

    it('should validate bulk price list items with positive prices', () => {
      const items = {
        items: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', price: 1200 },
          { productId: '550e8400-e29b-41d4-a716-446655440001', price: 3400 },
        ],
      };
      const parsed = BulkPriceListItemsSchema.parse(items);
      expect(parsed.items.length).toBe(2);
    });

    it('should reject negative or zero item prices', () => {
      expect(() =>
        BulkPriceListItemsSchema.parse({
          items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', price: -10 }],
        }),
      ).toThrow();
    });
  });

  describe('LoginRequestSchema', () => {
    it('should validate well-formed credentials', () => {
      const creds = { email: 'admin@dealflow360.com', password: 'password123' };
      const parsed = LoginRequestSchema.parse(creds);
      expect(parsed.email).toBe('admin@dealflow360.com');
    });

    it('should reject malformed email address', () => {
      expect(() =>
        LoginRequestSchema.parse({ email: 'not-an-email', password: 'password123' }),
      ).toThrow();
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() =>
        LoginRequestSchema.parse({ email: 'admin@dealflow360.com', password: 'short' }),
      ).toThrow();
    });
  });
});
