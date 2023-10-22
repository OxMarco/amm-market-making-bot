import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // do not remove unknown properties
      transform: true, // auto-transform request payloads to DTO instances
    }),
  );
  await app.listen(3000);
}
bootstrap();
