import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.convertBigInt(data)));
  }

  convertBigInt(data: any): any {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        if (typeof data[key] === 'bigint') {
          data[key] = data[key].toString();
        } else if (typeof data[key] === 'object') {
          this.convertBigInt(data[key]);
        }
      });
    }
    return data;
  }
}
