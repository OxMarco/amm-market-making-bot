import { IsNotEmpty, IsNumber, IsPositive, IsString, Validate } from 'class-validator';
import { IsEthereumAddress } from './ethereum-address.validator';
import { IsBigInt } from './bigint.validator';

export class CreatePositionDto {
  @IsNotEmpty()
  @Validate(IsEthereumAddress)
  poolAddress: string;

  @IsNumber()
  @IsPositive()
  tickLower: number;

  @IsNumber()
  @IsPositive()
  tickUpper: number;

  @Validate(IsBigInt)
  amount: bigint;

  @IsNotEmpty()
  @IsString()
  data: string;

  @IsNumber()
  @IsPositive()
  deadline: number;

  @IsNumber()
  @IsPositive()
  gasPrice: number;
}
