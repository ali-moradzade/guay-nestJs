import {Module} from '@nestjs/common';
import {ReservationsService} from './reservations.service.js';
import {ReservationsController} from './reservations.controller.js';
import {AUTH_SERVICE, HealthModule, LoggerModule, PAYMENTS_SERVICE} from '@app/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import Joi from 'joi';
import {ClientsModule, Transport} from '@nestjs/microservices';
import {PrismaService} from './prisma.service.js';
import {resolve} from 'node:path';

@Module({
    imports: [
        LoggerModule,
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(process.cwd(), 'apps/reservations/.env'),
            validationSchema: Joi.object({
                DATABASE_URL: Joi.string().required(),
                HTTP_PORT: Joi.number().required(),
                TCP_PORT: Joi.number().required(),
                AUTH_HOST: Joi.string().required(),
                AUTH_PORT: Joi.number().required(),
                PAYMENTS_HOST: Joi.string().required(),
                PAYMENTS_PORT: Joi.number().required(),
            })
        }),
        ClientsModule.registerAsync([
            {
                name: AUTH_SERVICE,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            configService.getOrThrow<string>('RABBITMQ_URI')
                        ],
                        queue: 'auth',
                    }
                }),
                inject: [ConfigService],
            },
            {
                name: PAYMENTS_SERVICE,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            configService.getOrThrow<string>('RABBITMQ_URI')
                        ],
                        queue: 'payments',
                    }
                }),
                inject: [ConfigService],
            },
        ]),
        HealthModule,
    ],
    controllers: [ReservationsController],
    providers: [
        ReservationsService,
        PrismaService,
    ],
})
export class ReservationsModule {
}
