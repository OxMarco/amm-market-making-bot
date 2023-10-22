import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './guards/apikey';
import { InitPoolDto } from './dto/init-pool';

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

  @Post('init-pool')
  @UseGuards(AuthGuard)
  initPool(@Body() pool: InitPoolDto) {
    return this.appService.initPool(pool.poolAddress);
  }
}
