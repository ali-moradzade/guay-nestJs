import {Module} from '@nestjs/common';
import {NotificationsController} from './notifications.controller.js';
import {NotificationsService} from './notifications.service.js';
import {ConfigModule} from '@nestjs/config';
import Joi from 'joi';
import {LoggerModule} from '@app/common';
import {resolve} from 'node:path';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: resolve(process.cwd(), 'apps/notifications/.env'),
            validationSchema: Joi.object({
                RABBITMQ_URI: Joi.string().required(),
                ELASTICSEARCH_NODE: Joi.string().required(),
                ELASTICSEARCH_INDEX: Joi.string().required(),
            })
        }),
        LoggerModule
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
})
export class NotificationsModule {
}
