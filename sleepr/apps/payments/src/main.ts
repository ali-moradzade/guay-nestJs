import {NestFactory} from '@nestjs/core';
import {PaymentsModule} from './payments.module.js';
import {Transport} from '@nestjs/microservices';
import {ConfigService} from '@nestjs/config';
import {Logger} from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(PaymentsModule, {rawBody: true});
    const configService = app.get<ConfigService>(ConfigService);

    app.connectMicroservice({
        transport: Transport.RMQ,
        options: {
            urls: [
                configService.getOrThrow('RABBITMQ_URI')
            ],
            noAck: false,
            queue: 'payments',
        }
    });
    app.useLogger(app.get(Logger));

    await app.startAllMicroservices();
    await app.listen(configService.getOrThrow<number>('HTTP_PORT'))
}

await bootstrap();
