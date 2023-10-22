import { IsNotEmpty, Validate } from 'class-validator';
import { IsEthereumAddress } from './ethereum-address.validator';

export class InitPoolDto {
  @IsNotEmpty()
  @Validate(IsEthereumAddress)
  poolAddress: string;
}
