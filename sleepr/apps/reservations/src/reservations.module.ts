import {Module} from '@nestjs/common';
import {ReservationsService} from './reservations.service.js';
import {ReservationsController} from './reservations.controller.js';
import {AUTH_SERVICE, DatabaseModule, HealthModule, LoggerModule, PAYMENTS_SERVICE} from '@app/common';
import {ReservationRepository} from './reservation.repository.js';
import {ReservationDocument, ReservationSchema} from './models/reservation.schema.js';
import {ConfigModule, ConfigService} from '@nestjs/config';
import Joi from 'joi';
import {ClientsModule, Transport} from '@nestjs/microservices';
import {GraphQLModule} from '@nestjs/graphql';
import {ApolloFederationDriver, ApolloFederationDriverConfig} from '@nestjs/apollo';
import {ReservationsResolver} from './reservations.resolver.js';
import {resolve} from 'node:path';

@Module({
    imports: [
        DatabaseModule,
        DatabaseModule.forFeature([
            {name: ReservationDocument.name, schema: ReservationSchema}
        ]),
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
            driver: ApolloFederationDriver,
            autoSchemaFile: {
                federation: 2
            },

        }),
        LoggerModule,
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(process.cwd(), 'apps/reservations/.env'),
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
        ReservationRepository,
        ReservationsResolver,
    ],
})
export class ReservationsModule {
}
