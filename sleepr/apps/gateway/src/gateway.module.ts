import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {AUTH_SERVICE, LoggerModule} from '@app/common';
import {resolve} from 'node:path';
import {GraphQLModule} from '@nestjs/graphql';
import {ApolloGatewayDriver, ApolloGatewayDriverConfig} from '@nestjs/apollo';
import {IntrospectAndCompose, RemoteGraphQLDataSource} from '@apollo/gateway';
import {ClientsModule, Transport} from '@nestjs/microservices';
import {authContext} from './auth.context.js';
import Joi from 'joi';
import {forwardUserContext} from './user-context';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(process.cwd(), 'apps/gateway/.env'),
            validationSchema: Joi.object({
                RESERVATIONS_GRAPHQL_URL: Joi.string().required(),
                AUTH_GRAPHQL_URL: Joi.string().required(),
                PAYMENTS_GRAPHQL_URL: Joi.string().required(),
                RABBITMQ_URI: Joi.string().required(),
                ELASTICSEARCH_NODE: Joi.string().required(),
                ELASTICSEARCH_INDEX: Joi.string().required(),
            }),
        }),
        LoggerModule,
        GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
            driver: ApolloGatewayDriver,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                server: {
                    context: authContext,
                },
                gateway: {
                    supergraphSdl: new IntrospectAndCompose({
                        subgraphs: [
                            {
                                name: 'reservations',
                                url: configService.getOrThrow<string>('RESERVATIONS_GRAPHQL_URL'),
                            },
                            {
                                name: 'auth',
                                url: configService.getOrThrow<string>('AUTH_GRAPHQL_URL'),
                            },
                            {
                                name: 'payments',
                                url: configService.getOrThrow<string>('PAYMENTS_GRAPHQL_URL'),
                            },
                        ]
                    }),
                    buildService({url}) {
                        return new RemoteGraphQLDataSource({
                            url,
                            willSendRequest: forwardUserContext,
                        });
                    }
                }
            }),
        }),
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
            }
        ])
    ],
    controllers: [],
    providers: [],
})
export class GatewayModule {
}
