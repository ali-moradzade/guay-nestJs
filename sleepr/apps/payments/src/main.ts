import {NestFactory} from '@nestjs/core';
import {PaymentsModule} from './payments.module.js';
import {Transport} from '@nestjs/microservices';
import {ConfigService} from '@nestjs/config';
import {Logger} from 'nestjs-pino';
import {NOTIFICATIONS_PACKAGE_NAME, PAYMENTS_PACKAGE_NAME} from '@app/common';
import {join} from 'path';

async function bootstrap() {
    const app = await NestFactory.create(PaymentsModule, {rawBody: true});
    const configService = app.get<ConfigService>(ConfigService);

    app.connectMicroservice({
        transport: Transport.GRPC,
        options: {
            package: PAYMENTS_PACKAGE_NAME,
            protoPath: join(__dirname, '../../../proto/payments.proto'),
            url: configService.getOrThrow('PAYMENTS_GRPC_URL'),
        }
    });
    app.useLogger(app.get(Logger));

    await app.startAllMicroservices();
    await app.listen(configService.getOrThrow<number>('HTTP_PORT'))
}

await bootstrap();
