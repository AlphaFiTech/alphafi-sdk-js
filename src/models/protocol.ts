import { Decimal } from "decimal.js";
import { poolDetailsMap, poolDetailsMapByPoolName } from "src/common/maps.ts";
import { Blockchain } from "./blockchain.ts";
import { SuiNetwork } from "./types.ts";
import { SuiClient } from "@mysten/sui/client/client.js";
import { getConf } from "src/common/constants.ts";

export class Protocol {
  client: SuiClient;
  blockchain: Blockchain;

  constructor(client: SuiClient, network: SuiNetwork) {
    this.client = client;
    this.blockchain = new Blockchain(client, network);
  }

  async getAprMap(): Promise<
    Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>
  > {
    const apiUrl = "https://api.alphafi.xyz/apr";
    const response = await fetch(`${apiUrl}`);
    const dataArr = (await response.json()) as {
      name: string;
      apr: any;
    }[];
    const aprMap = new Map<
      string,
      {
        parentApr: Decimal;
        alphaMiningApr: Decimal;
      }
    >();

    for (const data of dataArr) {
      const poolId = poolDetailsMapByPoolName[data.name].poolId;
      if (!poolId) {
        console.error(`Pool ${data.name} not found in poolDetailsMap`);
        continue;
      }
      const entries = Object.entries(data.apr) as [string, number][];
      const parentApr = entries.find(([key]) => key !== "alphaApr")?.[1];
      aprMap.set(poolId, {
        parentApr: new Decimal(parentApr ?? 0),
        alphaMiningApr: new Decimal(data.apr.alphaApr),
      });
    }

    return aprMap;
  }

  private async getNaviTvlMap(): Promise<Map<string, Decimal>> {
    const naviUrl = "https://api.alphafi.xyz/navi-params";
    const response = await fetch(naviUrl);
    const dataArr = await response.json();
    const naviTvlMap = new Map<string, Decimal>();

    for (const data of dataArr) {
      const poolId = poolDetailsMapByPoolName[data.poolName].poolId;
      if (!poolId) {
        console.error(`Pool ${data.poolName} not found in poolDetailsMap`);
        continue;
      }
      naviTvlMap.set(poolId, new Decimal(data.naviPoolTVL));
    }
    return naviTvlMap;
  }

  private async getBucketTVL(): Promise<string> {
    try {
      const fountain = (
        await this.client.getObject({
          id: getConf().FOUNTAIN,
          options: { showContent: true },
        })
      ).data as any;
      const flask = (
        await this.client.getObject({
          id: getConf().FLASK,
          options: { showContent: true },
        })
      ).data as any;

      const totalSbuckInFountain = fountain.content.fields.staked;
      const buckPerSbuck = new Decimal(flask.content.fields.reserves).div(
        flask.content.fields.sbuck_supply.fields.value,
      );
      const totalBuckInFountain = new Decimal(totalSbuckInFountain).mul(
        buckPerSbuck,
      );

      return totalBuckInFountain.div(new Decimal(1e9)).toString();
    } catch {
      throw new Error("error in bucket protocol tvl");
    }
  }
}
