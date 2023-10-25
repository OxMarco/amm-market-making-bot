import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsBigInt', async: false })
export class IsBigInt implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    try {
      const bigIntValue = BigInt(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid bigint`;
  }
}
