import {Module} from '@nestjs/common';
import {ReservationsService} from './reservations.service.js';
import {ReservationsController} from './reservations.controller.js';
import {
    AUTH_PACKAGE_NAME,
    AUTH_SERVICE,
    DatabaseModule,
    HealthModule,
    LoggerModule, PAYMENTS_PACKAGE_NAME,
    PAYMENTS_SERVICE, PAYMENTS_SERVICE_NAME
} from '@app/common';
import {ReservationRepository} from './reservation.repository.js';
import {ReservationDocument, ReservationSchema} from './models/reservation.schema.js';
import {ConfigModule, ConfigService} from '@nestjs/config';
import Joi from 'joi';
import {ClientsModule, Transport} from '@nestjs/microservices';
import {join} from 'path';

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
                    transport: Transport.GRPC,
                    options: {
						package: AUTH_PACKAGE_NAME,
                        protoPath: join(__dirname, '../../../proto/auth.proto'),
                        url: configService.getOrThrow('AUTH_GRPC_URL'),
                    }
                }),
                inject: [ConfigService],
            },
            {
                name: PAYMENTS_SERVICE,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: PAYMENTS_PACKAGE_NAME,
                        protoPath: join(__dirname, '../../../proto/payments.proto'),
                        url: configService.getOrThrow('PAYMENTS_GRPC_URL'),
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
        ReservationRepository,
    ],
})
export class ReservationsModule {
}
