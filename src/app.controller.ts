import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './guards/apikey';
import { InitPoolDto } from './dto/init-pool';
import { CreatePositionDto } from './dto/create-position';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  index() {
    return { message: 'ok', time: new Date().toISOString() };
  }

  @Get('gas-price')
  gasPrice() {
    return this.appService.getGasPrice();
  }

  @Get('chain-data')
  chainData() {
    return this.appService.getChainData();
  }

  @Get('pool-info/:poolAddress')
  poolInfo(@Param('poolAddress') poolAddress: string) {
    return this.appService.poolInfo(poolAddress);
  }

  @Post('init-pool')
  @UseGuards(AuthGuard)
  initPool(@Body() pool: InitPoolDto) {
    return this.appService.initPool(pool.poolAddress);
  }

  @Post('create-position')
  @UseGuards(AuthGuard)
  createPosition(@Body() position: CreatePositionDto) {
    return this.appService.createPosition(
      position.poolAddress,
      position.tickLower,
      position.tickUpper,
      BigInt(position.amount),
      position.data,
      position.deadline,
      position.gasPrice
    );
  }
}
