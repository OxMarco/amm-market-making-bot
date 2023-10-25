import {
  NonfungiblePositionManager,
  Pool,
  Position,
  priceToClosestTick,
} from '@uniswap/v3-sdk';
import {
  Percent,
  Ether,
  CurrencyAmount,
  Fraction,
  Price,
  Token,
} from '@uniswap/sdk-core';
import { ethers, Wallet } from 'ethers';
import { getFastGasPrice } from './helpers';
import { WETH_ADDRESS, POSITIONS_ADDRESS, MAX_UINT128 } from './constants';
import { calculatePriceRange, getChainId } from './helpers';
import { getPositionFactory } from './factory';

export interface PositionData {
  id: bigint;
  token0: string;
  token1: string;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
}

/**
 * Data class describing a uniswap position.
 * Small helper functions added from the base implementation
 */
export class UniPosition extends Position {
  /**
   * Checks if the position is in range
   * @return inRange true if the current price is within the bounds of the position, else false
   */
  inRange(): boolean {
    const lower = this.token0PriceLower;
    const upper = this.token0PriceUpper;
    return (
      this.pool.token0Price.greaterThan(lower) &&
      this.pool.token0Price.lessThan(upper)
    );
  }

  /**
   * Gets the derived total value of the position in terms of token0
   */
  get totalValue0(): CurrencyAmount<Token> {
    const price = this.pool.token1Price;
    return this.amount0.add(price.quote(this.amount1));
  }

  /**
   * Gets the derived total value of the position in terms of token1
   */
  get totalValue1(): CurrencyAmount<Token> {
    const price = this.pool.token0Price;
    return this.amount1.add(price.quote(this.amount0));
  }
}

/**
 * Class describing an active uniswap position
 */
export class ActivePosition extends UniPosition {
  public id: bigint;

  constructor(pool: Pool, data: PositionData) {
    super({
      pool,
      liquidity: data.liquidity.toString(),
      tickLower: data.tickLower,
      tickUpper: data.tickUpper,
    });

    this.id = data.id;
  }

  static fromPosition(position: UniPosition, id: bigint): ActivePosition {
    return new ActivePosition(position.pool, {
      id,
      token0: position.pool.token0.address,
      token1: position.pool.token1.address,
      liquidity: BigInt(position.liquidity.toString()),
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    });
  }

  /**
   * Collects fees and liquidity from the position for the given wallet
   */
  async burn(wallet: Wallet): Promise<void> {
    const positionFactoryAddress = '';
    const positions = await getPositionFactory(positionFactoryAddress, wallet);
    const [fee0, fee1] = await (positions.callStatic as any).collect(
      {
        tokenId: this.id.toString(),
        recipient: await wallet.getAddress(), // some tokens might fail if transferred to address(0)
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      },
      { from: await wallet.getAddress() }, // need to simulate the call as the owner
    );

    console.log(`Fees earned - Token 1: ${fee0}, Token 2: ${fee1}`);

    const token0 =
      this.pool.token0.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? Ether.onChain(await getChainId(wallet))
        : this.pool.token0;
    const token1 =
      this.pool.token1.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? Ether.onChain(await getChainId(wallet))
        : this.pool.token1;

    const params = NonfungiblePositionManager.removeCallParameters(this, {
      tokenId: this.id.toString(),
      liquidityPercentage: new Percent(100, 100),
      slippageTolerance: new Percent(5, 100),
      deadline: ethers.MaxUint256.toString(),
      burnToken: true,
      collectOptions: {
        expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(
          token0,
          fee0.toString(),
        ),
        expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(
          token1,
          fee1.toString(),
        ),
        recipient: await wallet.getAddress(),
      },
    });

    const tx = await wallet.sendTransaction({
      to: POSITIONS_ADDRESS,
      from: await wallet.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await getFastGasPrice(),
      gasLimit: 600000,
    });
    await tx.wait();
  }
}

/**
 * Class describing a new, unopened position
 */
export class NewPosition extends UniPosition {
  static fromPosition(position: Position): NewPosition {
    return new NewPosition({
      pool: position.pool,
      liquidity: position.liquidity,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    });
  }

  /**
   * Crafts a new position class from a price range
   * @param pool The pool to create a position on
   * @param rangePercentage the price difference above and below the current price at which we should set the tick bounds
   * @param amount0 The amount of liquidity in terms of token0 to add to the pool
   */
  static withRange(
    pool: Pool,
    rangePercentage: number,
    amount0: string,
  ): NewPosition {
    const newPriceRange = calculatePriceRange(
      pool.token0Price,
      rangePercentage,
    );

    const tickSpacing = pool.tickSpacing;
    const tickLower =
      priceToClosestTick(newPriceRange.lower) -
      (priceToClosestTick(newPriceRange.lower) % tickSpacing);
    const tickUpper =
      priceToClosestTick(newPriceRange.upper) +
      (tickSpacing - (priceToClosestTick(newPriceRange.upper) % tickSpacing));

    return NewPosition.fromPosition(
      NewPosition.fromAmount0({
        pool,
        tickLower,
        tickUpper,
        amount0,
        useFullPrecision: true,
      }),
    );
  }

  /**
   * Mint a new position on-chain for this position
   */
  async mint(wallet: Wallet): Promise<bigint> {
    const params = NonfungiblePositionManager.addCallParameters(this, {
      slippageTolerance: new Percent(5, 100),
      deadline: ethers.MaxUint256.toString(),
      recipient: await wallet.getAddress(),
      createPool: false,
      useNative: Ether.onChain(await getChainId(wallet)),
    });

    const tx = await wallet.sendTransaction({
      to: POSITIONS_ADDRESS,
      from: await wallet.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await getFastGasPrice(),
      gasLimit: 600000,
    });
    const receipt = await tx.wait();

    if (receipt !== null) {
      const IncreaseLiquidityLog = new ethers.Interface([
        'event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
      ]);

      for (const log of receipt) {
        try {
          const topics = log.topics as any;
          const data = log.data as any;
          const parsed = IncreaseLiquidityLog.parseLog({ topics, data });
          return parsed?.args.tokenId;
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    }

    throw new Error('Unable to fetch tokenId');
  }
}
