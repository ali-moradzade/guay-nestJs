import {NestFactory} from '@nestjs/core';
import {PaymentsModule} from './payments.module.js';
import {Transport} from '@nestjs/microservices';
import {ConfigService} from '@nestjs/config';
import {Logger} from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(PaymentsModule, {rawBody: true});
    const configService = app.get<ConfigService>(ConfigService);

    app.connectMicroservice({
        transport: Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: configService.getOrThrow('TCP_PORT')
        }
    });
    app.useLogger(app.get(Logger));

    await app.startAllMicroservices();
    await app.listen(configService.getOrThrow<number>('HTTP_PORT'))
}

await bootstrap();
