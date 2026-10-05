import { Blockchain } from '../models/blockchain';

// Since @mysten/sui 2.29, SuiGrpcClient forwards `meta` to the transport it builds
// (before that it accepted and silently dropped it). These tests pin the property
// actually shipped: the transport's defaultOptions carry the x-token metadata.
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

  it('routes to the configured gRPC url', () => {
    const blockchain = new Blockchain({
      network: 'mainnet',
      grpcUrl: 'https://example.invalid:443',
    });
    expect(transportOf(blockchain).defaultOptions.baseUrl).toBe('https://example.invalid:443');
  });

  it('defaults the gRPC url per network', () => {
    expect(transportOf(new Blockchain({ network: 'mainnet' })).defaultOptions.baseUrl).toBe(
      'https://fullnode.mainnet.sui.io',
    );
    expect(transportOf(new Blockchain({ network: 'testnet' })).defaultOptions.baseUrl).toBe(
      'https://fullnode.testnet.sui.io',
    );
  });
});
