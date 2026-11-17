import {NestFactory} from '@nestjs/core';
import {GatewayModule} from './gateway.module.js';
import {Logger} from 'nestjs-pino';
import {ConfigService} from '@nestjs/config';
import {setApp} from './app.js';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(GatewayModule);

    app.use(cookieParser());
    app.useLogger(app.get(Logger));

    const configService = app.get(ConfigService)

    setApp(app);

    await app.listen(configService.getOrThrow<number>('PORT'));
}

bootstrap();
