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

  @Get('chain-data')
  chainData() {
    return this.appService.getChainData();
  }
}
