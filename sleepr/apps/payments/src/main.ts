import {NestFactory} from '@nestjs/core';
import {PaymentsModule} from './payments.module.js';
import {Transport} from '@nestjs/microservices';
import {ConfigService} from '@nestjs/config';
import {Logger} from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(PaymentsModule);
    const configService = app.get<ConfigService>(ConfigService);

    app.connectMicroservice({
        transport: Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: configService.getOrThrow('PORT')
        }
    });
    app.useLogger(app.get(Logger));

    await app.startAllMicroservices();
}

await bootstrap();
