import {Query, Resolver} from '@nestjs/graphql';
import {PaymentIntent} from './payment-intent.entity.js';
import {PaymentsService} from './payments.service.js';

@Resolver(() => PaymentIntent)
export class PaymentsResolver {
    constructor(
        private readonly paymentsService: PaymentsService,
    ) {
    }

    @Query(() => [PaymentIntent], {name: 'payments'})
    findAll() {
        return this.paymentsService.getPayments();
    }
}
