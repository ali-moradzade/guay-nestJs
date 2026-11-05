import {Inject, Injectable, Logger, NotFoundException} from '@nestjs/common';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {ReservationRepository} from './reservation.repository.js';
import {CheckoutSessionCreated, PaymentFailedDto, PAYMENTS_SERVICE, PaymentSucceededDto, User} from '@app/common';
import {ClientProxy} from '@nestjs/microservices';
import {lastValueFrom} from 'rxjs';
import {Reservation} from './models/reservation.entity.js';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);

    constructor(
        private readonly repository: ReservationRepository,
        @Inject(PAYMENTS_SERVICE) private readonly paymentsService: ClientProxy,
    ) {
    }

    async create(
        createReservationDto: CreateReservationDto,
        user: User,
    ) {
        if (createReservationDto.charge.card) {
            return this.createWithDirectCharge(createReservationDto, user);
        }

        return this.createWithCheckoutSession(createReservationDto, user);
    }

    private async createWithDirectCharge(
        {charge, ...createReservationDto}: CreateReservationDto,
        {email, id: userId}: User,
    ) {
        const paymentIntent = await lastValueFrom(
            this.paymentsService.send<{ id: string }>('create_charge', {
                ...charge,
                email,
            })
        );
        const reservation = new Reservation({
            ...createReservationDto,
            timestamp: new Date(),
            amount: charge.amount,
            status: 'confirmed',
            // invoiceId: paymentIntent.id, // TO USE REAL STRIPE UNCOMMENT THIS
            invoiceId: '12345',
            userId,
        });

        return this.repository.create(reservation);
    }

    private async createWithCheckoutSession(
        {charge, ...createReservationDto}: CreateReservationDto,
        {email, id: userId}: User,
    ) {
        const reservation = new Reservation({
            ...createReservationDto,
            amount: charge.amount,
            timestamp: new Date(),
            userId,
            status: 'pending',
        });
        await this.repository.create(reservation);

        const session = await lastValueFrom(
            this.paymentsService.send<CheckoutSessionCreated>(
                'create_checkout_session',
                {
                    amount: charge.amount,
                    email,
                    reservationId: reservation.id,
                }
            )
        );

        const updatedReservation = await this.repository.findOneAndUpdate(
            {id: reservation.id},
            {checkoutSessionId: session.id}
        );

        return {
            ...updatedReservation,
            paymentUrl: session.url,
        };
    }

    async findAll() {
        return this.repository.find({});
    }

    async findOne(id: number) {
        return this.repository.findOne({id});
    }

    async update(id: number, updateReservationDto: UpdateReservationDto) {
        return this.repository.findOneAndUpdate({id}, updateReservationDto);
    }

    async remove(id: number) {
        return this.repository.findOneAndDelete({id});
    }

    async handlePaymentSucceeded({reservationId, paymentIntentId}: PaymentSucceededDto) {
        this.logger.log(`Payment succeeded for reservation ${reservationId}`);
        try {
            await this.repository.findOneAndUpdate(
                // {id: reservationId},
                {id: 123},
                {status: 'confirmed', invoiceId: paymentIntentId}
            );
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error;
            }

            this.logger.warn(`Received payment for unknown reservation: ${reservationId}`);
        }
    }

    async handlePaymentFailed({reservationId, reason}: PaymentFailedDto) {
        this.logger.log(`Payment failed for reservation ${reservationId}. ${reason}`);
        try {
            await this.repository.findOneAndUpdate(
                // {id: reservationId, status: 'pending'},
                {id: 123, status: 'pending'},
                {status: 'cancelled'}
            );
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error;
            }
        }
    }
}
