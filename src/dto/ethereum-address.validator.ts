import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ethers } from 'ethers';

@ValidatorConstraint({ async: false })
export class IsEthereumAddress implements ValidatorConstraintInterface {
  validate(address: string, args: ValidationArguments) {
    return ethers.isAddress(address);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid Ethereum address`;
  }
}
