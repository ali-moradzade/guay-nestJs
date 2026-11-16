import {NestFactory} from '@nestjs/core';
import {NotificationsModule} from './notifications.module.js';
import {Transport} from '@nestjs/microservices';
import {Logger} from 'nestjs-pino';
import {resolve} from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
    path: resolve(process.cwd(), 'apps/notifications/.env'),
});

async function bootstrap() {
    const app = await NestFactory.createMicroservice(NotificationsModule, {
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URI!],
            queue: 'notifications',
        },
    });

    app.useLogger(app.get(Logger));

    await app.listen();
}

await bootstrap();
