import {Module} from '@nestjs/common';
import {PaymentsController} from './payments.controller.js';
import {PaymentsService} from './payments.service.js';
import {ConfigModule} from '@nestjs/config';
import Joi from 'joi';
import {LoggerModule} from '@app/common';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                PORT: Joi.number().required(),
                STRIPE_SECRET_KEY: Joi.string().required(),
            })
        }),
        LoggerModule
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
})
export class PaymentsModule {
}
