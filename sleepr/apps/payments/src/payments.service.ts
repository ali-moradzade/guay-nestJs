import {Inject, Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Stripe} from 'stripe';
import {NOTIFICATIONS_SERVICE} from '@app/common';
import {ClientProxy} from '@nestjs/microservices';
import {PaymentsCreateChargeDto} from './dtos/payments-create-charge.dto.js';

@Injectable()
export class PaymentsService {
    private readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        @Inject(NOTIFICATIONS_SERVICE) private readonly notificationsService: ClientProxy,
    ) {
        this.stripe = new Stripe(this.configService.getOrThrow('STRIPE_SECRET_KEY'), {
            apiVersion: '2026-09-30.endive',
        });
    }

    async createCharge({card, amount, email}: PaymentsCreateChargeDto) {
        // ************ UNCOMMENT FOR REAL USE *************
        //
        // const paymentMethod = await this.stripe.paymentMethods.create({
        //     type: 'card',
        //     card,
        // });
        //
        // return await this.stripe.paymentIntents.create({
        //     payment_method: paymentMethod.id,
        //     amount: amount * 100,
        //     confirm: true,
        //     allowed_payment_method_types: ['card'],
        //     currency: 'usd',
        // });

        this.notificationsService.emit('notify_email', {
            email,
            text: `Your payment of $${amount} has completed successfully.`
        });

        return Promise.resolve(
            {
                payment_method: '123',
                amount: amount * 100,
                confirm: true,
                allowed_payment_method_types: ['card'],
                currency: 'usd',
            }
        );
    }
}
