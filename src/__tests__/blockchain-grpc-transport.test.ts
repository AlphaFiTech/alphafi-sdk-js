import { Blockchain } from '../models/blockchain';

// SuiGrpcClient's convenience constructor drops `meta`, so the token must ride
// on an explicitly-built transport. These tests pin the property actually
// shipped: the transport's defaultOptions carry the x-token metadata.
describe('Blockchain gRPC transport auth', () => {
  const transportOf = (blockchain: Blockchain) =>
    (blockchain.suiGrpcClient.ledgerService as any)._transport;

  it('attaches grpcToken as x-token metadata on the transport', () => {
    const blockchain = new Blockchain({
      network: 'mainnet',
      grpcUrl: 'https://example.invalid:443',
      grpcToken: 'TEST_TOKEN',
    });
    expect(transportOf(blockchain).defaultOptions.meta).toEqual({
      'x-token': 'TEST_TOKEN',
    });
  });

  it('sends no metadata when grpcToken is absent', () => {
    const blockchain = new Blockchain({ network: 'mainnet' });
    expect(transportOf(blockchain).defaultOptions.meta).toBeUndefined();
  });
});
