import {Inject, Injectable, Logger, NotFoundException} from '@nestjs/common';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {ReservationRepository} from './reservation.repository.js';
import {CheckoutSessionCreated, PaymentFailedDto, PAYMENTS_SERVICE, PaymentSucceededDto, UserDto} from '@app/common';
import {ClientProxy} from '@nestjs/microservices';
import {lastValueFrom} from 'rxjs';

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
        user: UserDto,
    ) {
        if (createReservationDto.charge.card) {
            return this.createWithDirectCharge(createReservationDto, user);
        }

        return this.createWithCheckoutSession(createReservationDto, user);
    }

    private async createWithDirectCharge(
        {charge, ...createReservationDto}: CreateReservationDto,
        {email, _id: userId}: UserDto,
    ) {
        const paymentIntent = await lastValueFrom(
            this.paymentsService.send<{ id: string }>('create_charge', {
                ...charge,
                email,
            })
        );
        return this.repository.create({
            ...createReservationDto,
            timestamp: new Date(),
            amount: charge.amount,
            status: 'confirmed',
            // invoiceId: paymentIntent.id, // TO USE REAL STRIPE UNCOMMENT THIS
            invoiceId: '12345',
            userId,
        });
    }

    private async createWithCheckoutSession(
        {charge, ...createReservationDto}: CreateReservationDto,
        {email, _id: userId}: UserDto,
    ) {
        const reservation = await this.repository.create({
            ...createReservationDto,
            amount: charge.amount,
            timestamp: new Date(),
            userId,
            status: 'pending',
        });

        const session = await lastValueFrom(
            this.paymentsService.send<CheckoutSessionCreated>(
                'create_checkout_session',
                {
                    amount: charge.amount,
                    email,
                    reservationId: reservation._id.toHexString(),
                }
            )
        );

        const updatedReservation = await this.repository.findOneAndUpdate(
            {_id: reservation._id},
            {$set: {checkoutSessionId: session.id}}
        );

        return {
            ...updatedReservation,
            paymentUrl: session.url,
        };
    }

    async findAll() {
        return this.repository.find({});
    }

    async findOne(_id: string) {
        return this.repository.findOne({_id});
    }

    async update(_id: string, updateReservationDto: UpdateReservationDto) {
        return this.repository.findOneAndUpdate({_id}, {$set: updateReservationDto});
    }

    async remove(_id: string) {
        return this.repository.findOneAndDelete({_id});
    }

    async handlePaymentSucceeded({reservationId, paymentIntentId}: PaymentSucceededDto) {
        this.logger.log(`Payment succeeded for reservation ${reservationId}`);
        try {
            await this.repository.findOneAndUpdate(
                {_id: reservationId},
                {$set: {status: 'confirmed', invoiceId: paymentIntentId}}
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
                {_id: reservationId, status: 'pending'},
                {$set: {status: 'cancelled'}}
            );
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error;
            }
        }
    }
}
