import { ethers } from 'ethers';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { NONFUNGIBLE_POSITION_MANAGER_ABI } from '../abi/nonFungiblePositionManager';

export interface PositionInfo {
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

export async function getPositionIds(
  address: string,
  positionManager: string,
  provider: any,
): Promise<number[]> {
  const positionContract = new ethers.Contract(
    positionManager,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    provider,
  );

  const balance: number = await positionContract.balanceOf(address);

  const tokenIds = [];
  for (let i = 0; i < balance; i++) {
    const tokenOfOwnerByIndex: number =
      await positionContract.tokenOfOwnerByIndex(address, i);
    tokenIds.push(tokenOfOwnerByIndex);
  }

  return tokenIds;
}

export async function getPositionInfo(
  tokenId: number,
  positionManager: string,
  provider: any,
): Promise<PositionInfo> {
  const positionContract = new ethers.Contract(
    positionManager,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    provider,
  );

  const position = await positionContract.positions(tokenId);

  return {
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    liquidity: position.liquidity,
    feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
    feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
    tokensOwed0: position.tokensOwed0,
    tokensOwed1: position.tokensOwed1,
  };
}

export async function collectFees(
  poolAddress: string,
  recipient: string,
  tickLower: number,
  tickUpper: number,
  amount0Max: bigint,
  amount1Max: bigint,
  gasPrice: bigint,
  signer: any,
) {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    signer,
  );

  const collectTx = await poolContract.collect(
    {
      recipient,
      tickLower,
      tickUpper,
      amount0Max,
      amount1Max,
    },
    {
      gasPrice,
    },
  );

  await collectTx.wait();
}
