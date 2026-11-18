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
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(process.cwd(), 'apps/reservations/.env'),
            validationSchema: Joi.object({
                SERVICE_NAME: Joi.string().required(),
                MONGODB_URI: Joi.string().required(),
                HTTP_PORT: Joi.number().required(),
                RABBITMQ_URI: Joi.string().required(),
                ELASTICSEARCH_NODE: Joi.string().required(),
                ELASTICSEARCH_INDEX: Joi.string().required(),
            })
        }),
        LoggerModule,
        ClientsModule.registerAsync([
            {
                name: AUTH_SERVICE,
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            configService.getOrThrow<string>('RABBITMQ_URI')
                        ],
                        queue: 'auth',
                    }
                }),
            },
            {
                name: PAYMENTS_SERVICE,
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            configService.getOrThrow<string>('RABBITMQ_URI')
                        ],
                        queue: 'payments',
                    }
                }),
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
