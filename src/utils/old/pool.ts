import { Contract, ethers } from 'ethers';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import {
  AddLiquidityOptions,
  CollectOptions,
  MintOptions,
  NonfungiblePositionManager,
  Pool,
  Position,
  RemoveLiquidityOptions,
  TICK_SPACINGS,
  TickMath,
  nearestUsableTick,
} from '@uniswap/v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { getTokenInfo } from '../token';
import { NONFUNGIBLE_POSITION_MANAGER_ABI } from 'src/abi/nonFungiblePositionManager';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESS } from '@uniswap/smart-order-router';

type Immutables = {
  factory: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  maxLiquidityPerTick: bigint;
};

type State = {
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
};

async function getPoolImmutables(poolContract: Contract) {
  const immutables: Immutables = {
    factory: await poolContract.factory(),
    token0: await poolContract.token0(),
    token1: await poolContract.token1(),
    fee: await poolContract.fee(),
    tickSpacing: await poolContract.tickSpacing(),
    maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
  };
  return immutables;
}

async function getPoolState(poolContract: Contract) {
  const slot = await poolContract.slot0();
  const PoolState: State = {
    liquidity: await poolContract.liquidity(),
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };
  return PoolState;
}

async function getPool(poolAddress: string, provider: any) {
  const poolContract: Contract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    provider,
  );

  const { chainId } = await provider.getNetwork();
  const immutables = await getPoolImmutables(poolContract);
  const state = await getPoolState(poolContract);

  const token0 = await getTokenInfo(immutables.token0, poolContract.provider);

  const token1 = await getTokenInfo(immutables.token1, poolContract.provider);

  const TokenA = new Token(
    chainId,
    immutables.token0,
    token0.decimals,
    token0.symbol,
    token0.name,
  );
  const TokenB = new Token(
    chainId,
    immutables.token1,
    token1.decimals,
    token1.symbol,
    token1.name,
  );

  const liquidity = state.liquidity.toString();
  const feeAmount = immutables.fee;
  const pool = new Pool(
    TokenA,
    TokenB,
    feeAmount,
    state.sqrtPriceX96.toString(),
    liquidity,
    state.tick,
    [
      {
        index: nearestUsableTick(
          TickMath.MIN_TICK,
          (TICK_SPACINGS as any)[feeAmount],
        ),
        liquidityNet: liquidity,
        liquidityGross: liquidity,
      },
      {
        index: nearestUsableTick(
          TickMath.MAX_TICK,
          (TICK_SPACINGS as any)[feeAmount],
        ),
        liquidityNet: (BigInt(liquidity) * -1n).toString(), // @todo check
        liquidityGross: liquidity,
      },
    ],
  );

  return {
    pool,
    state,
    immutables,
  };
}

export async function getPrices(poolAddress: string, provider: any) {
  const { pool } = await getPool(poolAddress, provider);
  return {
    token0: pool.token0Price.toFixed(6),
    token1: pool.token1Price.toFixed(6),
  };
}

function constructPosition(
  pool: Pool,
  state: State,
  immutables: Immutables,
  token0amount: string,
  token1Amount: string,
) {
  const position = Position.fromAmounts({
    pool: pool,
    tickLower:
      nearestUsableTick(state.tick, immutables.tickSpacing) -
      immutables.tickSpacing * 2,
    tickUpper:
      nearestUsableTick(state.tick, immutables.tickSpacing) +
      immutables.tickSpacing * 2,
    amount0: token0amount,
    amount1: token1Amount,
    useFullPrecision: true,
  });

  return position;
}

function sendTransaction(
  data: any,
  nftManagerAddress: string,
  value: string,
  recipient: string,
  maxFeePerGas: number,
  maxPriorityFee: number,
) {
  const transaction = {
    data,
    to: nftManagerAddress,
    value: value,
    from: recipient,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFee,
  };
}

export async function createPosition(
  poolAddress: string,
  signer: any,
  token0amount: string,
  token1Amount: string,
) {
  const { pool, state, immutables } = await getPool(poolAddress, signer);
  const recipient = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // @todo check

  const position = constructPosition(
    pool,
    state,
    immutables,
    token0amount,
    token1Amount,
  );

  const mintOptions: MintOptions = {
    recipient,
    deadline,
    slippageTolerance: new Percent(50, 10_000),
  };

  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    position,
    mintOptions,
  );

  //await sendTransaction();
}

export async function addLiquidity(
  poolAddress: string,
  signer: any,
  positionId: number,
  token0amount: string,
  token1Amount: string,
) {
  const { pool, state, immutables } = await getPool(poolAddress, signer);
  const recipient = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // @todo check

  const position = constructPosition(
    pool,
    state,
    immutables,
    token0amount,
    token1Amount,
  );

  const addLiquidityOptions: AddLiquidityOptions = {
    deadline,
    slippageTolerance: new Percent(50, 10_000),
    tokenId: positionId,
    recipient,
  };

  // get calldata for increasing a position
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    position,
    addLiquidityOptions,
  );

  // await sendTransaction()
}

export async function removeLiquidity(
  poolAddress: string,
  signer: any,
  positionId: number,
  expectedCurrencyOwed0: string,
  expectedCurrencyOwed1: string,
) {
  const { pool, state, immutables } = await getPool(poolAddress, signer);
  const recipient = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // @todo check

  const position = constructPosition(
    pool,
    state,
    immutables,
    token0amount,
    token1Amount,
  );

  const token0 = CurrencyAmount.fromRawAmount(
    pool.token0,
    expectedCurrencyOwed0,
  );
  const token1 = CurrencyAmount.fromRawAmount(
    pool.token1,
    expectedCurrencyOwed1,
  );
  const collectOptions: Omit<CollectOptions, 'tokenId'> = {
    expectedCurrencyOwed0: token0,
    expectedCurrencyOwed1: token1,
    recipient,
  };

  const removeLiquidityOptions: RemoveLiquidityOptions = {
    deadline,
    slippageTolerance: new Percent(50, 10_000),
    tokenId: positionId,
    liquidityPercentage: new Percent(50, 10_000),
    collectOptions,
  };
  // get calldata for minting a position
  const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
    position,
    removeLiquidityOptions,
  );

  // build transaction
  const transaction = {
    data: calldata,
    to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    value: value,
    from: address,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  return sendTransaction(transaction);
}
