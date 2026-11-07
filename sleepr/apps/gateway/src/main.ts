import {NestFactory} from '@nestjs/core';
import {GatewayModule} from './gateway.module.js';
import {Logger} from 'nestjs-pino';
import {ConfigService} from '@nestjs/config';
import {setApp} from './app.js';

async function bootstrap() {
    const app = await NestFactory.create(GatewayModule);

    app.useLogger(app.get(Logger));
    const configService = app.get(ConfigService)

    await app.listen(configService.getOrThrow<number>('PORT'));

    setApp(app);
}

await bootstrap();
