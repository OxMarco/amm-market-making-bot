import { ethers } from 'ethers';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';

export async function getPoolInfo(poolAddress: string, provider: any) {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    provider,
  );

  const [token0, token1, fee, tickSpacing, liquidity, slot0] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

  return {
    token0,
    token1,
    fee,
    tickSpacing,
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}

export const setupPool = async () => {
  const configuredPool = new Pool(
    new Token(token0),
    token0Amount.currency,
    token1Amount.currency,
    poolInfo.fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  )
}

/////////////////////////

export async function rebalanceLiquidity(
  poolAddress: string,
  baseLower: number,
  baseUpper: number,
  newLower: number,
  newUpper: number,
  liquidity: bigint,
  gasPrice: bigint,
  signer: any,
) {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    signer,
  );

  const removeLiquidityTx = await poolContract.burn(
    baseLower,
    baseUpper,
    liquidity,
    {
      gasPrice,
    },
  );
  await removeLiquidityTx.wait();

  const addLiquidityTx = await poolContract.mint(
    newLower,
    newUpper,
    liquidity,
    {
      gasPrice,
    },
  );
  await addLiquidityTx.wait();
}

export async function mintLiquidity(
  poolAddress: string,
  tickLower: number,
  tickUpper: number,
  amount: bigint,
  data: string,
  deadline: number,
  gasPrice: number,
  signer: any,
) {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    signer,
  );

  const mintTx = await poolContract.mint(
    signer.getAddress(),
    tickLower,
    tickUpper,
    amount,
    data,
    {
      gasPrice,
      deadline,
    },
  );

  await mintTx.wait();
}
