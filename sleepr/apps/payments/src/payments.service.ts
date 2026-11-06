import {Inject, Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Stripe} from 'stripe';
import {
    CheckoutSessionCreated,
    CreateCheckoutSessionDto,
    NOTIFICATIONS_SERVICE_NAME,
    NotificationsServiceClient,
    PAYMENT_FAILED_EVENT,
    RESERVATIONS_SERVICE
} from '@app/common';
import type {ClientGrpc, ClientProxy} from '@nestjs/microservices';
import {PaymentsCreateChargeDto} from './dtos/payments-create-charge.dto.js';

@Injectable()
export class PaymentsService {
    private readonly stripe: Stripe;
    private readonly logger = new Logger(PaymentsService.name);
    private notificationsService: NotificationsServiceClient;

    constructor(
        private readonly configService: ConfigService,
        @Inject(NOTIFICATIONS_SERVICE_NAME) private readonly client: ClientGrpc,
        @Inject(RESERVATIONS_SERVICE) private readonly reservationsService: ClientProxy,
    ) {
        // this.stripe = new Stripe(this.configService.getOrThrow('STRIPE_SECRET_KEY'), {
        //     apiVersion: '2026-09-30.endive',
        // });
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

        if (!this.notificationsService) {
            this.notificationsService = this.client.getService<NotificationsServiceClient>(NOTIFICATIONS_SERVICE_NAME);
        }

        this.notificationsService.notifyEmail({
            email,
            text: `Your payment of $${amount} has completed successfully.`
        }).subscribe(() => {});

        return Promise.resolve(
            {
                id: '1234',
                payment_method: '123',
                amount: amount * 100,
                confirm: true,
                allowed_payment_method_types: ['card'],
                currency: 'usd',
            }
        );
    }

    async createCheckoutSession({
                                    amount,
                                    email,
                                    reservationId
                                }: CreateCheckoutSessionDto): Promise<CheckoutSessionCreated> {
        // const session = await this.stripe.checkout.sessions.create({
        //     mode: 'payment',
        //     line_items: [
        //         {
        //             quantity: 1,
        //             price_data: {
        //                 currency: 'usd',
        //                 unit_amount: Math.round(amount * 100),
        //                 product_data: {
        //                     name: 'Sleepr reservation'
        //                 }
        //             }
        //         }
        //     ],
        //     success_url: this.configService.getOrThrow('STRIPE_SUCCESS_URL'),
        //     cancel_url: this.configService.getOrThrow('STRIPE_CANCEL_URL'),
        //     metadata: {reservationId},
        //     customer_email: email,
        //     client_reference_id: reservationId,
        // });

        return {
            // id: session.id,
            // url: session.url!,
            id: '123',
            url: 'https://google.com',
        };
    }

    constructEvent(payload: Buffer, signature: string): Stripe.Event {
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.configService.getOrThrow('STRIPE_WEBHOOK_SECRET')
        );
    }

    handleEvent(event: Stripe.Event) {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                this.handlePaymentSucceeded(session);
                break;
            }
            case 'checkout.session.expired': {
                this.handlePaymentFailed(event.data.object, event.type);
                break;
            }
            default: {
                this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
            }
        }
    }

    private handlePaymentSucceeded(session: Stripe.Checkout.Session) {
        const reservationId = session.metadata?.reservationId;
        if (!reservationId) {
            this.logger.warn(`Checkout session ${session.id} completed without a reservation id`);
            return;
        }

        this.reservationsService.emit('PAYMENT_SUCCEEDED_EVENT', {
            reservationId,
            paymentIntentId: session.payment_intent,
        });

        const email = session.customer_details?.email ?? session.customer_email;
        if (email) {
            this.notificationsService.notifyEmail({
                email,
                text: `Your payment of ${(session.amount_total ?? 0) / 100} has completed successfully `
            });
        }
    }

    private handlePaymentFailed(session: Stripe.Checkout.Session, reason: string) {
        const reservationId = session.metadata?.reservationId;
        if (!reservationId) {
            return;
        }

        this.reservationsService.emit(PAYMENT_FAILED_EVENT, {
            reservationId,
            reason,
        });
    }
}
