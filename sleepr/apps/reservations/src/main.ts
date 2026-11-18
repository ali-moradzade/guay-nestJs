import {NestFactory} from '@nestjs/core';
import {ReservationsModule} from './reservations.module.js';
import {ValidationPipe} from '@nestjs/common';
import {Logger} from 'nestjs-pino';
import {ConfigService} from '@nestjs/config';
import cookieParser from 'cookie-parser';
import {Transport} from '@nestjs/microservices';

async function bootstrap() {
    const app = await NestFactory.create(ReservationsModule);

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
    }));
    app.useLogger(app.get(Logger))
    app.use(cookieParser())

    const configService = app.get<ConfigService>(ConfigService);

    app.connectMicroservice({
        transport: Transport.RMQ,
        options: {
            urls: [
                configService.getOrThrow('RABBITMQ_URI')
            ],
            queue: 'reservations',
        }
    })

    await app.startAllMicroservices();
    await app.listen(configService.getOrThrow('HTTP_PORT'));
}

await bootstrap();
