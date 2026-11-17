import {beforeEach, describe, vi} from 'vitest';
import {Test, TestingModule} from '@nestjs/testing';
import {ConfigService} from '@nestjs/config';
import {PinoLogger} from 'nestjs-pino';
import {PaymentsService} from './payments.service.js';
import {STRIPE_CLIENT} from './stripe.provider.js';
import {NOTIFICATIONS_SERVICE, PAYMENT_FAILED_EVENT, RESERVATIONS_SERVICE} from '@app/common';
import {PaymentsCreateChargeDto} from './dtos/payments-create-charge.dto.js';
import {Stripe} from 'stripe';

describe('PaymentsService', () => {
    let service: PaymentsService;

    let notificationsService: {
        emit: ReturnType<typeof vi.fn>;
    };

    let reservationsService: {
        emit: ReturnType<typeof vi.fn>;
    };

    let logger: {
        setContext: ReturnType<typeof vi.fn>;
        info: ReturnType<typeof vi.fn>;
        debug: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
    };

    let stripe: {
        paymentMethods: { create: ReturnType<typeof vi.fn> };
        paymentIntents: { create: ReturnType<typeof vi.fn> };
        checkout: {
            sessions: { create: ReturnType<typeof vi.fn> };
        };
        webhooks: { constructEvent: ReturnType<typeof vi.fn> };
    };

    let configService: {
        getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        notificationsService = {
            emit: vi.fn(),
        };

        reservationsService = {
            emit: vi.fn(),
        };

        logger = {
            setContext: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        stripe = {
            paymentMethods: {
                create: vi.fn(),
            },
            paymentIntents: {
                create: vi.fn(),
            },
            checkout: {
                sessions: {
                    create: vi.fn(),
                },
            },
            webhooks: {
                constructEvent: vi.fn(),
            },
        };

        configService = {
            getOrThrow: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentsService,
                {
                    provide: ConfigService,
                    useValue: configService,
                },
                {
                    provide: PinoLogger,
                    useValue: logger,
                },
                {
                    provide: STRIPE_CLIENT,
                    useValue: stripe,
                },
                {
                    provide: NOTIFICATIONS_SERVICE,
                    useValue: notificationsService,
                },
                {
                    provide: RESERVATIONS_SERVICE,
                    useValue: reservationsService,
                },
            ],
        }).compile();

        service = module.get<PaymentsService>(PaymentsService);
    });

    describe('createCharge', () => {
        it('should create a charge and send a notification email', async () => {
            const chargeDto: PaymentsCreateChargeDto = {
                amount: 25,
                email: 'customer@example.com',
            };

            const result = await service.createCharge(chargeDto);

            expect(result).toEqual({
                payment_method: '123',
                amount: 2500,
                confirm: true,
                allowed_payment_method_types: ['card'],
                currency: 'usd',
            });

            expect(notificationsService.emit).toHaveBeenCalledWith(
                'notify_email',
                {
                    email: 'customer@example.com',
                    text: 'Your payment of $25 has completed successfully.',
                },
            );
        });
    });

    describe('createCheckoutSession', () => {
        it('should return a checkout session', async () => {
            const result = await service.createCheckoutSession({
                amount: 100,
                email: 'test@example.com',
                reservationId: 'reservation-123',
            });

            expect(result).toEqual({
                id: '123',
                url: 'https://google.com',
            });
        });
    });

    describe('constructEvent', () => {
        it('should construct a Stripe event', () => {
            const payload = Buffer.from('{"type":"checkout.session.completed"}');
            const signature = 'stripe-signature';

            const expectedEvent = {
                id: 'evt_123',
                type: 'checkout.session.completed',
                data: {
                    object: {},
                },
            };

            vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
                expectedEvent as Stripe.Event,
            );

            configService.getOrThrow.mockReturnValue('webhook-secret');

            const result = service.constructEvent(payload, signature);

            expect(configService.getOrThrow).toHaveBeenCalledWith(
                'STRIPE_WEBHOOK_SECRET',
            );
            expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
                payload,
                signature,
                'webhook-secret',
            );

            expect(result).toBe(expectedEvent);
        });
    });

    describe('handleEvent', () => {
        it('should notify Reservations and Notifications when payment succeeds', () => {
            const event = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: 'cs_test_123',
                        metadata: {
                            reservationId: 'reservation-123',
                        },
                        payment_intent: 'pi_123',
                        amount_total: 10000,
                        customer_details: {
                            email: 'test@example.com',
                        },
                        customer_email: null,
                    },
                },
            } as unknown as Stripe.Event;

            service.handleEvent(event);

            expect(reservationsService.emit).toHaveBeenCalledWith(
                'PAYMENT_SUCCEEDED_EVENT',
                {
                    reservationId: 'reservation-123',
                    paymentIntentId: 'pi_123',
                },
            );

            expect(notificationsService.emit).toHaveBeenCalledWith(
                'notify_email',
                {
                    email: 'test@example.com',
                    text: 'Your payment of 100 has completed successfully ',
                },
            );
        });

        it('should not emit events when reservationId is missing', () => {
            const event = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: 'cs_test_123',
                        metadata: {},
                        payment_intent: 'pi_123',
                        amount_total: 10000,
                        customer_details: {
                            email: 'test@example.com',
                        },
                        customer_email: null,
                    },
                },
            } as Stripe.Event;

            service.handleEvent(event);

            expect(reservationsService.emit).not.toHaveBeenCalled();
            expect(notificationsService.emit).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Checkout session cs_test_123 completed without a reservation id',
            );
        });

        it('should use customer_email when customer_details.email is unavailable', () => {
            const event = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: 'cs_test_123',
                        metadata: {
                            reservationId: 'reservation-123',
                        },
                        payment_intent: 'pi_123',
                        amount_total: 10000,
                        customer_details: null,
                        customer_email: 'fallback@example.com',
                    },
                },
            } as unknown as Stripe.Event;

            service.handleEvent(event);

            expect(notificationsService.emit).toHaveBeenCalledWith(
                'notify_email',
                {
                    email: 'fallback@example.com',
                    text: 'Your payment of 100 has completed successfully ',
                },
            );
        });

        it('should notify Reservations when checkout session expires', () => {
            const event = {
                type: 'checkout.session.expired',
                data: {
                    object: {
                        id: 'cs_test_123',
                        metadata: {
                            reservationId: 'reservation-123',
                        },
                    },
                },
            } as unknown as Stripe.Event;

            service.handleEvent(event);

            expect(reservationsService.emit).toHaveBeenCalledWith(
                PAYMENT_FAILED_EVENT,
                {
                    reservationId: 'reservation-123',
                    reason: 'checkout.session.expired',
                },
            );

            expect(notificationsService.emit).not.toHaveBeenCalled();
        });

        it('should not emit events when expired session has no reservationId', () => {
            const event = {
                type: 'checkout.session.expired',
                data: {
                    object: {
                        id: 'cs_test_123',
                        metadata: {},
                    },
                },
            } as unknown as Stripe.Event;

            service.handleEvent(event);

            expect(reservationsService.emit).not.toHaveBeenCalled();
            expect(notificationsService.emit).not.toHaveBeenCalled();
        });
    });
});

