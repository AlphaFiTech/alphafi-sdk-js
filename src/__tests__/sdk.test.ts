import { AlphaFiSDK } from '../core';
import { formatAmount } from '../utils';

describe('AlphaFi SDK', () => {
  test('SDK initialization', () => {
    const sdk = new AlphaFiSDK();
    expect(sdk).toBeDefined();
  });

  test('Utility functions', () => {
    const result = formatAmount(123.456789, 2);
    expect(result).toBe('123.46');
  });
});