import {NestFactory} from '@nestjs/core';
import {NotificationsModule} from './notifications.module.js';
import {ConfigService} from '@nestjs/config';
import {Transport} from '@nestjs/microservices';
import {Logger} from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(NotificationsModule);
    const configService = app.get<ConfigService>(ConfigService);

    app.enableShutdownHooks();

    app.connectMicroservice({
        transport: Transport.RMQ,
        options: {
            urls: [
                configService.getOrThrow('RABBITMQ_URI')
            ],
            queue: 'notifications',
        }
    });
    app.useLogger(app.get(Logger));

    await app.startAllMicroservices();
}

await bootstrap();
