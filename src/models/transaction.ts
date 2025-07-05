import { Transaction } from "@mysten/sui/transactions";
import { Blockchain } from "./blockchain.js";
import { BluefinTransactions } from "./transactionProtocolModels/bluefin.js";
import { NaviTransactions } from "./transactionProtocolModels/navi.js";
import { CetusTransactions } from "./transactionProtocolModels/cetus.js";
import { poolDetailsMap } from "../common/maps.js";
import { PoolUtils } from "./pool.js";

/**
 * Types for liquidity calculations
 */
export interface LiquidityResult {
  coinAmountA: bigint;
  coinAmountB: bigint;
}

export interface CommonInvestorFields {
  content: {
    fields: {
      lower_tick: string;
      upper_tick: string;
    };
  };
}

export interface ClmmPool {
  content: {
    fields: {
      current_sqrt_price: string;
    };
  };
}

/**
 * Main transaction manager that orchestrates all protocol-specific transaction builders
 */
export class TransactionManager{
  private bluefin: BluefinTransactions;
  private navi: NaviTransactions;
  private cetus: CetusTransactions;

  constructor(private address: string, private blockchain: Blockchain, private poolUtils: PoolUtils) {
    this.bluefin = new BluefinTransactions(address, blockchain, poolUtils);
    this.navi = new NaviTransactions(address, blockchain);
    this.cetus = new CetusTransactions(address, blockchain);
    this.blockchain = blockchain;
  }

  /**
   * Get the appropriate protocol transaction handler
   */
  getProtocolHandler(protocol: string) {
    switch (protocol.toLowerCase()) {
      case "bluefin":
        return this.bluefin;
      case "navi":
        return this.navi;
      case "cetus":
        return this.cetus;
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }

  /**
   * Generic deposit method that routes to the appropriate protocol
   */
  async deposit(protocol: string, amount: string, poolId: number, options?: any): Promise<Transaction> {
    switch (protocol.toLowerCase()) {
      case "bluefin":
        return this.bluefin.depositBluefinSuiFirstTxb(amount, poolId);
      case "navi":
        return this.navi.depositNaviTx(amount, poolId);
      case "cetus":
        return this.cetus.depositCetusTx(amount, poolId, options?.isAmountA);
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }

  /**
   * Generic withdraw method that routes to the appropriate protocol
   */
  async withdraw(protocol: string, xTokens: string, poolId: number, options?: any): Promise<Transaction> {
    switch (protocol.toLowerCase()) {
      case "bluefin":
        return this.bluefin.withdrawBluefinSuiFirstTxb(xTokens, poolId);
      case "navi":
        return this.navi.withdrawNaviTx(xTokens, poolId);
      case "cetus":
        return this.cetus.withdrawCetusTx(xTokens, poolId);
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }

  /**
   * Get all available protocols
   */
  getAvailableProtocols(): string[] {
    return ["bluefin", "navi", "cetus"];
  }

  /**
   * Check if a protocol is supported
   */
  isProtocolSupported(protocol: string): boolean {
    return this.getAvailableProtocols().includes(protocol.toLowerCase());
  }

  /**
   * Get estimated gas budget for a transaction
   */
  async getEstimatedGasBudget(tx: Transaction): Promise<number | undefined> {
    try {
      const simResult = await this.blockchain.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.address,
      });
      return (
        Number(simResult.effects.gasUsed.computationCost) +
        Number(simResult.effects.gasUsed.nonRefundableStorageFee) +
        1e8
      );
    } catch (err) {
      console.error(`Error estimating transaction gasBudget`, err);
      return undefined;
    }
  }
}
