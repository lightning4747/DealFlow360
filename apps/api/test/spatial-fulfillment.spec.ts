import { SpatialAllocationEngine } from '../src/modules/fulfillment/spatial-allocation.engine';
import { CalculateFulfillmentSplitDto } from '@dealflow360/types';

describe('Unit & Integration Test: Spatial Fulfillment & Stock Allocation Engine', () => {
  let engine: SpatialAllocationEngine;
  let mockDb: any;

  const mockWarehouses = [
    {
      id: 'wh-dal-0001',
      code: 'WH-DAL-01',
      name: 'Dallas Distribution Hub',
      latitude: '32.776700',
      longitude: '-96.797000',
      distance_km: '30.50',
    },
    {
      id: 'wh-ord-0002',
      code: 'WH-ORD-01',
      name: 'Chicago Central Facility',
      latitude: '41.878100',
      longitude: '-87.629800',
      distance_km: '1280.20',
    },
  ];

  beforeEach(() => {
    mockDb = {
      execute: jest.fn(),
      transaction: jest.fn(),
    };
    engine = new SpatialAllocationEngine(mockDb);
  });

  it('should fulfill order from single hub when single warehouse has complete stock', async () => {
    // 1st query: warehouses sorted by distance
    mockDb.execute.mockResolvedValueOnce({
      rows: mockWarehouses,
    });

    // 2nd query: stock across warehouses
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          warehouse_id: 'wh-dal-0001',
          product_id: 'prod-switch-01',
          available_qty: '50',
          product_name: 'Core Switch 48-Port',
          sku: 'NET-SW-48P',
          unit_cost: '3200.00',
        },
        {
          warehouse_id: 'wh-ord-0002',
          product_id: 'prod-switch-01',
          available_qty: '20',
          product_name: 'Core Switch 48-Port',
          sku: 'NET-SW-48P',
          unit_cost: '3200.00',
        },
      ],
    });

    const dto: CalculateFulfillmentSplitDto = {
      quoteId: 'a1111111-1111-1111-1111-111111111111',
      destinationLatitude: 32.8000,
      destinationLongitude: -96.8000,
      items: [
        { productId: 'prod-switch-01', quantity: 5 },
      ],
    };

    const result = await engine.calculateFulfillmentSplit(dto);

    expect(result.hubCount).toBe(1);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].warehouseCode).toBe('WH-DAL-01');
    expect(result.allocations[0].allocatedItems[0].quantity).toBe(5);
    expect(result.backorders).toHaveLength(0);
    expect(result.totalEstimatedShippingCost).toBeGreaterThan(0);
  });

  it('should bifurcate fulfillment across multiple hubs when neither hub alone has full stock', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: mockWarehouses,
    });

    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          warehouse_id: 'wh-dal-0001',
          product_id: 'prod-switch-01',
          available_qty: '4', // Primary closest hub only has 4 units
          product_name: 'Core Switch 48-Port',
          sku: 'NET-SW-48P',
          unit_cost: '3200.00',
        },
        {
          warehouse_id: 'wh-ord-0002',
          product_id: 'prod-switch-01',
          available_qty: '6', // Secondary hub only has 6 units (total 10 needed)
          product_name: 'Core Switch 48-Port',
          sku: 'NET-SW-48P',
          unit_cost: '3200.00',
        },
      ],
    });

    const dto: CalculateFulfillmentSplitDto = {
      quoteId: 'a2222222-2222-2222-2222-222222222222',
      destinationLatitude: 32.8000,
      destinationLongitude: -96.8000,
      items: [
        { productId: 'prod-switch-01', quantity: 10 },
      ],
    };

    const result = await engine.calculateFulfillmentSplit(dto);

    expect(result.hubCount).toBe(2);
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].warehouseCode).toBe('WH-DAL-01');
    expect(result.allocations[0].allocatedItems[0].quantity).toBe(4);
    expect(result.allocations[1].warehouseCode).toBe('WH-ORD-01');
    expect(result.allocations[1].allocatedItems[0].quantity).toBe(6);
    expect(result.backorders).toHaveLength(0);
  });

  it('should generate backorders when aggregate stock across all hubs is insufficient', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: mockWarehouses,
    });

    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          warehouse_id: 'wh-dal-0001',
          product_id: 'prod-switch-01',
          available_qty: '2',
          product_name: 'Core Switch 48-Port',
          sku: 'NET-SW-48P',
          unit_cost: '3200.00',
        },
        {
          warehouse_id: 'wh-ord-0002',
          product_id: 'prod-switch-01',
          available_qty: '3',
          product_name: 'Core Switch 48-Port',
          sku: 'NET-SW-48P',
          unit_cost: '3200.00',
        },
      ],
    });

    const dto: CalculateFulfillmentSplitDto = {
      quoteId: 'a3333333-3333-3333-3333-333333333333',
      destinationLatitude: 32.8000,
      destinationLongitude: -96.8000,
      items: [
        { productId: 'prod-switch-01', quantity: 10 },
      ],
    };

    const result = await engine.calculateFulfillmentSplit(dto);

    // 2 units from DAL, 3 units from ORD, 5 units backordered
    expect(result.hubCount).toBe(2);
    expect(result.backorders).toHaveLength(1);
    expect(result.backorders[0].quantity).toBe(5);
    expect(result.backorders[0].reason).toContain('Insufficient inventory');
  });
});
