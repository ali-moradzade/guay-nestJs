import {Module} from '@nestjs/common';
import {ReservationsService} from './reservations.service.js';
import {ReservationsController} from './reservations.controller.js';
import {AUTH_SERVICE, DatabaseModule, LoggerModule, PAYMENTS_SERVICE} from '@app/common';
import {ReservationRepository} from './reservation.repository.js';
import {ReservationDocument, ReservationSchema} from './models/reservation.schema.js';
import {ConfigModule, ConfigService} from '@nestjs/config';
import Joi from 'joi';
import {ClientsModule, Transport} from '@nestjs/microservices';

@Module({
    imports: [
        DatabaseModule,
        DatabaseModule.forFeature([
            {name: ReservationDocument.name, schema: ReservationSchema}
        ]),
        LoggerModule,
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                MONGODB_URI: Joi.string().required(),
                PORT: Joi.number().required(),
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
                    transport: Transport.TCP,
                    options: {
                        host: configService.getOrThrow('AUTH_HOST'),
                        port: configService.getOrThrow('AUTH_PORT')
                    }
                }),
                inject: [ConfigService],
            },
            {
                name: PAYMENTS_SERVICE,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.TCP,
                    options: {
                        host: configService.getOrThrow('PAYMENTS_HOST'),
                        port: configService.getOrThrow('PAYMENTS_PORT')
                    }
                }),
                inject: [ConfigService],
            },
        ])
    ],
    controllers: [ReservationsController],
    providers: [
        ReservationsService,
        ReservationRepository,
    ],
})
export class ReservationsModule {
}
