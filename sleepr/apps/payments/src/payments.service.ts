import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Stripe} from 'stripe';
import {CreateChargeDto} from '@app/common/dtos/create-charge.dto.js';

@Injectable()
export class PaymentsService {
    private readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.getOrThrow('STRIPE_SECRET_KEY'), {
            apiVersion: '2026-09-30.endive',
        });
    }

    async createCharge({card, amount}: CreateChargeDto) {
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
