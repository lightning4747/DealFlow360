import { Injectable } from '@nestjs/common';
import { calculateBRS, LineItemDiscountInput, BrsCalculationResult } from './brs-calculator';

@Injectable()
export class BrsCalculationService {
  computeBRS(lines: LineItemDiscountInput[]): BrsCalculationResult {
    return calculateBRS(lines);
  }
}
