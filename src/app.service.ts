import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

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
}
