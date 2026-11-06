import {Inject, Injectable, Logger, NotFoundException, OnModuleInit} from '@nestjs/common';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {ReservationRepository} from './reservation.repository.js';
import {
    PaymentFailedDto,
    PAYMENTS_SERVICE_NAME,
    PaymentsServiceClient,
    PaymentSucceededDto,
    UserDto
} from '@app/common';
import type {ClientGrpc} from '@nestjs/microservices';
import {lastValueFrom} from 'rxjs';

@Injectable()
export class ReservationsService implements OnModuleInit {
    private readonly logger = new Logger(ReservationsService.name);
    private paymentsService: PaymentsServiceClient;

    constructor(
        private readonly repository: ReservationRepository,
        @Inject(PAYMENTS_SERVICE_NAME) private readonly client: ClientGrpc,
    ) {
    }

    onModuleInit(): any {
        this.paymentsService = this.client.getService<PaymentsServiceClient>(PAYMENTS_SERVICE_NAME);
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
            this.paymentsService.createCharge({
                ...charge,
                email,
                card: charge.card,
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
            this.paymentsService.createCharge(
                {
                    amount: charge.amount,
                    email,
                    // reservationId: reservation._id.toHexString(),
                    card: charge.card
                }
            )
        );

        const updatedReservation = await this.repository.findOneAndUpdate(
            {_id: reservation._id},
            {$set: {checkoutSessionId: session.id}}
        );

        return {
            ...updatedReservation,
            // paymentUrl: session.url,
            paymentUrl: 'https://www.google.com/',
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
