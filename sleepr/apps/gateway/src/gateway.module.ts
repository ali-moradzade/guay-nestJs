import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {AUTH_SERVICE, LoggerModule} from '@app/common';
import {resolve} from 'node:path';
import {GraphQLModule} from '@nestjs/graphql';
import {ApolloGatewayDriver, ApolloGatewayDriverConfig} from '@nestjs/apollo';
import {IntrospectAndCompose, RemoteGraphQLDataSource} from '@apollo/gateway';
import {ClientsModule, Transport} from '@nestjs/microservices';
import {authContext} from './auth.context.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(process.cwd(), 'apps/gateway/.env'),
        }),
        LoggerModule,
        GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
            driver: ApolloGatewayDriver,
            useFactory: (configService: ConfigService) => ({
                server: {
                    context: authContext,
                },
                gateway: {
                    supergraphSdl: new IntrospectAndCompose({
                        subgraphs: [
                            {
                                name: 'reservations',
                                url: configService.getOrThrow('RESERVATIONS_GRAPHQL_URL'),
                            },
                            {
                                name: 'auth',
                                url: configService.getOrThrow('AUTH_GRAPHQL_URL'),
                            },
                            {
                                name: 'payments',
                                url: configService.getOrThrow('PAYMENTS_GRAPHQL_URL'),
                            },
                        ]
                    }),
                    buildService({url}) {
                        return new RemoteGraphQLDataSource({
                            url,
                            willSendRequest({request, context}) {
                                request.http?.headers.set(
                                    'user',
                                    context.user ? JSON.stringify(context.user) : '',
                                );
                            }
                        });
                    }
                }
            }),
            inject: [ConfigService],
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
            }
        ])
    ],
    controllers: [],
    providers: [],
})
export class GatewayModule {
}
