import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { getPoolInfo, mintLiquidity, rebalanceLiquidity } from './utils/pool';
import { approve, balance } from './utils/token';
import { collectFees, getPositionIds, getPositionInfo } from './utils/position';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private provider: any;
  private signer: any;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

    if (!rpcUrl) throw new Error('Invalid rpc url');
    if (!ethers.isHexString(privateKey)) throw new Error('Invalid private key');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    this.logger.log('AppService initialised');
  }

  async getChainData() {
    return await this.provider.getNetwork();
  }

  async getGasPrice() {
    return await this.provider.getFeeData();
  }

  async tokenBalance(tokenAddress: string, address: string) {
    return await balance(tokenAddress, address, this.provider);
  }

  async poolInfo(poolAddress: string) {
    return await getPoolInfo(poolAddress, this.provider);
  }

  async positionInfo(id: number, positionManager: string) {
    return await getPositionInfo(id, positionManager, this.provider);
  }

  async positionIDs(address: string, positionManager: string) {
    return await getPositionIds(address, positionManager, this.provider);
  }

  async initPool(poolAddress: string) {
    const { token0, token1 } = await getPoolInfo(poolAddress, this.provider);

    if (!ethers.isAddress(token0)) throw new Error('Invalid token0');
    if (!ethers.isAddress(token1)) throw new Error('Invalid token1');

    await approve(token0, poolAddress, ethers.MaxUint256, this.signer);
    await approve(token1, poolAddress, ethers.MaxUint256, this.signer);

    this.logger.log(`Pool ${poolAddress} initialised`);
  }

  async createPosition(
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    amount: bigint,
    data: string,
    deadline: number,
    gasPrice: number,
  ) {
    this.logger.log(`New position for pool ${poolAddress} created`);

    return await mintLiquidity(
      poolAddress,
      tickLower,
      tickUpper,
      amount,
      data,
      deadline,
      gasPrice,
      this.signer,
    );
  }

  async rebalancePosition(
    poolAddress: string,
    baseLower: number,
    baseUpper: number,
    newLower: number,
    newUpper: number,
    liquidity: bigint,
    gasPrice: bigint,
  ) {
    this.logger.log(`Rebalanced liquidity for pool ${poolAddress}`);

    await rebalanceLiquidity(
      poolAddress,
      baseLower,
      baseUpper,
      newLower,
      newUpper,
      liquidity,
      gasPrice,
      this.signer,
    );
  }

  async collectPositionFees(
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    amount0Max: bigint,
    amount1Max: bigint,
    gasPrice: bigint,
  ) {
    this.logger.log(`Collected fees for pool ${poolAddress}`);

    const recipient = await this.signer.getAddress();
    return await collectFees(
      poolAddress,
      recipient,
      tickLower,
      tickUpper,
      amount0Max,
      amount1Max,
      gasPrice,
      this.signer,
    );
  }
}
