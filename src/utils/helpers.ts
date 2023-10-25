import { CurrencyAmount, Fraction, Price, Token } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
import { ethers } from 'ethers';
import { WETH_ADDRESS } from './constants';

interface PriceRange {
  lower: Price<Token, Token>;
  upper: Price<Token, Token>;
}

interface GasPriceData {
  fastest: number;
}

export async function getFastGasPrice(): Promise<bigint> {
  const response = await fetch('https://www.etherchain.org/api/gasPriceOracle');
  const gasPriceData: GasPriceData = await response.json();
  return ethers.parseUnits(gasPriceData.fastest.toString(), 9);
}

export const fractionToPrice = (
  referencePrice: Price<Token, Token>,
  fraction: Fraction,
): Price<Token, Token> => {
  return new Price(
    referencePrice.baseCurrency,
    referencePrice.quoteCurrency,
    fraction.denominator,
    fraction.numerator,
  );
};

/*
export function ethToTokenValue(value: bigint, pool: Pool) {
  return pool.token0.address === WETH_ADDRESS
    ? pool.token0Price.quote(
        CurrencyAmount.fromRawAmount(pool.token0, value.toString()),
      )
    : pool.token1Price
        .quote(CurrencyAmount.fromRawAmount(pool.token1, value.toString()))
        .quotient.toString(10);
}
*/

export function calculatePriceRange(
  currentPrice: Price<Token, Token>,
  priceWidthPercentage: number,
): PriceRange {
  const diff = currentPrice.asFraction.multiply(
    new Fraction(priceWidthPercentage, 100),
  );

  const lower = currentPrice.asFraction.subtract(diff);
  const upper = currentPrice.asFraction.add(diff);

  return {
    lower: fractionToPrice(currentPrice, lower),
    upper: fractionToPrice(currentPrice, upper),
  };
}

export async function getChainId(wallet: any) {
  return parseInt((await wallet.provider.getNetwork()).chainId.toString());
}
