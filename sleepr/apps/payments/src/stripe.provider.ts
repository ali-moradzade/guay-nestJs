import {Stripe} from 'stripe';
import {ConfigService} from '@nestjs/config';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const StripeProvider = {
    provide: STRIPE_CLIENT,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): Stripe => {
        return new Stripe(
            configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
        );
    },
};
