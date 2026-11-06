import {Module} from '@nestjs/common';
import {PaymentsController} from './payments.controller.js';
import {PaymentsService} from './payments.service.js';
import {ConfigModule, ConfigService} from '@nestjs/config';
import Joi from 'joi';
import {LoggerModule, NOTIFICATIONS_PACKAGE_NAME, NOTIFICATIONS_SERVICE_NAME, RESERVATIONS_SERVICE} from '@app/common';
import {ClientsModule, Transport} from '@nestjs/microservices';
import {StripeWebhookController} from './stripe-webhook.controller.js';
import {join} from 'path';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                TCP_PORT: Joi.number().required(),
                HTTP_PORT: Joi.number().required(),
                STRIPE_SECRET_KEY: Joi.string().required(),
                NOTIFICATIONS_HOST: Joi.string().required(),
                NOTIFICATIONS_PORT: Joi.number().required(),
                STRIPE_SUCCESS_URL: Joi.string().uri().required(),
                STRIPE_CANCEL_URL: Joi.string().uri().required(),
                STRIPE_WEBHOOK_SECRET: Joi.string().required(),
                RESERVATIONS_HOST: Joi.string().required(),
                RESERVATIONS_PORT: Joi.number().required(),
            })
        }),
        LoggerModule,
        ClientsModule.registerAsync([
            {
                name: NOTIFICATIONS_SERVICE_NAME,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: NOTIFICATIONS_PACKAGE_NAME,
                        protoPath: join(__dirname, '../../../proto/notifications.proto'),
                        url: configService.getOrThrow('NOTIFICATIONS_GRPC_URL'),
                    }
                }),
                inject: [ConfigService],
            },
            {
                name: RESERVATIONS_SERVICE,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            configService.getOrThrow<string>('RABBITMQ_URI')
                        ],
                        queue: 'reservations',
                    }
                }),
                inject: [ConfigService],
            }
        ])
    ],
    controllers: [PaymentsController, StripeWebhookController],
    providers: [PaymentsService],
})
export class PaymentsModule {
}
