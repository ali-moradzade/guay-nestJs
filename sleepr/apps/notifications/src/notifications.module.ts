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
                PORT: Joi.number().required(),
                SMTP_USER: Joi.string().required(),
                GOOGLE_OAUTH_CLIENT_ID: Joi.string().required(),
                GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().required(),
                GOOGLE_OAUTH_REFRESH_TOKEN: Joi.string().required(),
            })
        }),
        LoggerModule
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
})
export class NotificationsModule {
}
