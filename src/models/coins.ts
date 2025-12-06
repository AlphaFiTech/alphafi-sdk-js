export interface CoinDetails {
  coinType: string;
  coingeckoPrice: string;
  symbol: string;
  decimals: number;
  pythPrice: string;
}

export class Coins {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  constructor(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet') {
    this.network = network;
  }

  async getCoinDetails(): Promise<CoinDetails[]> {
    const apiUrl = 'https://api.alphalend.xyz/public/graphql';
    const query = `
      query {
        coinInfo {
          coinType
          coingeckoPrice
          pythPrice
          symbol
          decimals
        }
      }`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const dataArr = (await response.json()).data.coinInfo;

    return dataArr;
  }

  /*
  export async function fetchRequiredPrices(): Promise<{
  [k: string]: string | undefined;
}> {
  const apiUrl = "https://api.alphalend.xyz/public/graphql";
  const query = `
      query {
        coinInfo {
          coinType
          coingeckoPrice
        }
      }`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const dataArr = (await response.json()).data.coinInfo;

  const priceMap: { [k: string]: string | undefined } = {};
  for (const data of dataArr) {
    let coinType = data.coinType;
    let coin: string | undefined;
    if (
      coinType !==
        "0x0041f9f9344cac094454cd574e333c4fdb132d7bcc9379bcd4aab485b2a63942::wbtc::WBTC" &&
      coinType.startsWith("0x0")
    ) {
      coinType = "0x" + coinType.substring(5);
    }
    coin = Object.keys(coinsList).find(
      (coinKey) => coinsList[coinKey as CoinName].type === coinType,
    );
    if (data.coinType === "0x2::sui::SUI") {
      coin = "SUI";
    }
    if (!coin || coin === "ETHIRD" || coin === "EXBTC") {
      // console.error(`Coin not found for coinType: ${data.coinType}`);
      continue;
    }
    priceMap[coin] = data.coingeckoPrice.toString();
  }
  return priceMap;
}

  */
}
