import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Render PORT fallback to 3000 for local dev
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
