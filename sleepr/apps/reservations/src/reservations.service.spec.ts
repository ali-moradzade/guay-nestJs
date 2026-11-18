import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Test, TestingModule} from '@nestjs/testing';
import {PinoLogger} from 'nestjs-pino';

import {ReservationsService} from './reservations.service.js';
import {ReservationRepository} from './reservation.repository.js';
import {PAYMENTS_SERVICE, UserDto} from '@app/common';
import {of} from 'rxjs';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {NotFoundException} from '@nestjs/common';

describe('ReservationsService', () => {
    let service: ReservationsService;

    const repository = {
        create: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
        findOneAndDelete: vi.fn(),
    };

    const paymentsService = {
        send: vi.fn(),
    };

    const logger = {
        setContext: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReservationsService,
                {
                    provide: ReservationRepository,
                    useValue: repository,
                },
                {
                    provide: PAYMENTS_SERVICE,
                    useValue: paymentsService,
                },
                {
                    provide: PinoLogger,
                    useValue: logger,
                },
            ],
        }).compile();

        service = module.get<ReservationsService>(ReservationsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });


    describe('create', () => {
        it('should create a confirmed reservation using a direct charge', async () => {
            const createReservationDto = {
                startDate: new Date('2026-12-01'),
                endDate: new Date('2026-12-05'),
                charge: {
                    amount: 150,
                    card: {},
                },
            } as CreateReservationDto;

            const user = {
                _id: 'user-123',
                email: 'test@example.com',
            } as UserDto;

            const createdReservation = {
                _id: 'reservation-123',
                ...createReservationDto,
            };

            paymentsService.send.mockReturnValue(
                of({id: 'payment-123'}),
            );

            repository.create.mockResolvedValue(createdReservation);

            const result = await service.create(createReservationDto, user);

            expect(paymentsService.send).toHaveBeenCalledWith(
                'create_charge',
                {
                    ...createReservationDto.charge,
                    email: user.email,
                },
            );

            expect(repository.create).toHaveBeenCalledWith({
                startDate: createReservationDto.startDate,
                endDate: createReservationDto.endDate,
                timestamp: expect.any(Date),
                amount: 150,
                status: 'confirmed',
                invoiceId: '12345',
                userId: user._id,
            });

            expect(result).toEqual(createdReservation);
        });

        it('should create a pending reservation using a checkout session', async () => {
            const createReservationDto = {
                startDate: new Date('2026-12-01'),
                endDate: new Date('2026-12-05'),
                charge: {
                    amount: 150,
                }
            } as CreateReservationDto;


            const user = {
                _id: 'user-123',
                email: 'test@example.com',
            } as UserDto;

            const reservation = {
                _id: {
                    toHexString: () => 'reservation-123',
                },
                startDate: createReservationDto.startDate,
                endDate: createReservationDto.endDate,
                amount: 150,
                status: 'pending',
                userId: user._id,
            };

            const updatedReservation = {
                ...reservation,
                checkoutSessionId: 'session-123',
            };

            paymentsService.send.mockReturnValue(
                of({
                    id: 'session-123',
                    url: 'https://checkout.stripe.com/session-123',
                }),
            );

            repository.create.mockResolvedValue(reservation);
            repository.findOneAndUpdate.mockResolvedValue(updatedReservation);

            const result = await service.create(createReservationDto, user);

            expect(repository.create).toHaveBeenCalledWith({
                startDate: createReservationDto.startDate,
                endDate: createReservationDto.endDate,
                amount: 150,
                timestamp: expect.any(Date),
                userId: user._id,
                status: 'pending',
            });

            expect(paymentsService.send).toHaveBeenCalledWith(
                'create_checkout_session',
                {
                    amount: 150,
                    email: user.email,
                    reservationId: 'reservation-123',
                },
            );

            expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
                {_id: reservation._id},
                {$set: {checkoutSessionId: 'session-123'}},
            );

            expect(result).toEqual({
                ...updatedReservation,
                paymentUrl: 'https://checkout.stripe.com/session-123',
            });
        });
    });

    describe('findAll', () => {
        it('should return all reservations', async () => {
            const reservations = [
                {_id: 'reservation-1'},
                {_id: 'reservation-2'},
            ];

            repository.find.mockResolvedValue(reservations);

            const result = await service.findAll();

            expect(repository.find).toHaveBeenCalledWith({});
            expect(result).toEqual(reservations);
        });
    });

    describe('findOne', () => {
        it('should return a reservation by id', async () => {
            const reservation = {
                _id: 'reservation-123'
            };

            repository.findOne.mockResolvedValue(reservation);

            const result = await service.findOne(reservation._id);

            expect(repository.findOne).toHaveBeenCalledWith(reservation);
            expect(result).toEqual(reservation);
        });
    });

    describe('update', () => {
        it('should update a reservation', async () => {
            const updateReservationDto = {
                startDate: new Date('2026-12-10')
            };

            const updateReservation = {
                _id: 'reservation-123',
                startDate: updateReservationDto.startDate,
            };

            repository.findOneAndUpdate.mockResolvedValue(updateReservation);

            const result = await service.update(updateReservation._id, updateReservationDto);

            expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
                {_id: updateReservation._id},
                {$set: updateReservationDto}
            );

            expect(result).toEqual(updateReservation);
        });
    });

    describe('remove', () => {
        it('should delete a reservation', async () => {
            const deletedReservation = {
                _id: 'reservation-123',
            };

            repository.findOneAndDelete.mockResolvedValue(deletedReservation);

            const result = await service.remove('reservation-123');

            expect(repository.findOneAndDelete).toHaveBeenCalledWith({
                _id: 'reservation-123',
            });

            expect(result).toEqual(deletedReservation);
        });
    });

    describe('handlePaymentSucceeded', () => {
        it('should confirm a reservation after successful payment', async () => {
            const paymentData = {
                reservationId: 'reservation-123',
                paymentIntentId: 'payment-123',
            };

            repository.findOneAndUpdate.mockResolvedValue({
                _id: paymentData.reservationId,
                status: 'confirmed',
                invoiceId: paymentData.paymentIntentId,
            });

            await service.handlePaymentSucceeded(paymentData);

            expect(logger.info).toHaveBeenCalledWith('Payment succeeded for reservation reservation-123');
            expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
                {_id: paymentData.reservationId},
                {
                    $set: {
                        status: 'confirmed',
                        invoiceId: paymentData.paymentIntentId,
                    },
                },
            );
        });

        it('should log a warning when the reservation does not exist', async () => {
            const paymentData = {
                reservationId: 'unknown-reservation',
                paymentIntentId: 'payment-123',
            };

            repository.findOneAndUpdate.mockRejectedValue(
                new NotFoundException('Document was not found')
            );

            await expect(
                service.handlePaymentSucceeded(paymentData),
            ).resolves.toBeUndefined();

            expect(logger.warn).toHaveBeenCalledWith(
                'Received payment for unknown reservation: unknown-reservation',
            );
        });

        it('should propagate unexpected errors', async () => {
            const paymentData = {
                reservationId: 'reservation-123',
                paymentIntentId: 'payment-123',
            };

            const error = new Error('Database connection failed');

            repository.findOneAndUpdate.mockRejectedValue(error);

            await expect(
                service.handlePaymentSucceeded(paymentData),
            ).rejects.toThrow(error);
        });
    });

    describe('handlePaymentFailed', () => {
        it('should cancel a pending reservation after payment failure', async () => {
            const paymentData = {
                reservationId: 'reservation-123',
                reason: 'checkout.session.expired',
            };

            repository.findOneAndUpdate.mockResolvedValue({
                _id: paymentData.reservationId,
                status: 'cancelled',
            });

            await service.handlePaymentFailed(paymentData);

            expect(logger.info).toHaveBeenCalledWith(
                'Payment failed for reservation reservation-123. checkout.session.expired',
            );

            expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: paymentData.reservationId,
                    status: 'pending',
                },
                {
                    $set: {
                        status: 'cancelled',
                    },
                },
            );
        });

        it('should ignore a missing reservation', async () => {
            const paymentData = {
                reservationId: 'unknown-reservation',
                reason: 'checkout.session.expired',
            };

            repository.findOneAndUpdate.mockRejectedValue(
                new NotFoundException('Document was not found'),
            );

            await expect(
                service.handlePaymentFailed(paymentData),
            ).resolves.toBeUndefined();
        });

        it('should propagate unexpected errors', async () => {
            const paymentData = {
                reservationId: 'reservation-123',
                reason: 'checkout.session.expired',
            };

            const error = new Error('Database connection failed');

            repository.findOneAndUpdate.mockRejectedValue(error);

            await expect(
                service.handlePaymentFailed(paymentData),
            ).rejects.toThrow(error);
        });
    });
});
