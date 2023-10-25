export interface Config {
  rpcUrl: string;
  privateKey: string;
  priceWidthPercentage: number;
  bufferEther: number;
  pair: {
    token0: string;
    token1: string;
    fee: number;
  };
  uniswap: {
    positions: string;
    factory: string;
    router: string;
  };
  chainId: number;
}

export async function getConfig(): Promise<Config> {
  return {
    rpcUrl: '',
    privateKey: '',
    priceWidthPercentage: 11,
    bufferEther: 1,
    chainId: 111,
    pair: {
      token0: '',
      token1: '',
      fee: 1,
    },
    uniswap: {
      positions: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
      factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
      router: '0xe592427a0aece92de3edee1f18e0157c05861564',
    },
  };
}
