import {Inject, Injectable, Logger, NotFoundException} from '@nestjs/common';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {PaymentFailedDto, PAYMENTS_SERVICE, PaymentSucceededDto} from '@app/common';
import type {User} from '@app/common';
import {ClientProxy} from '@nestjs/microservices';
import {lastValueFrom} from 'rxjs';
import {PrismaService} from './prisma.service.js';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);

    constructor(
        private readonly prismaService: PrismaService,
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

        // return this.createWithCheckoutSession(createReservationDto, user);
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
        return this.prismaService.reservation.create({
            data: {
                startDate: createReservationDto.startDate,
                endDate: createReservationDto.endDate,
                timestamp: new Date(),
                amount: charge.amount,
                status: 'confirmed',
                // invoiceId: paymentIntent.id, // TO USE REAL STRIPE UNCOMMENT THIS
                invoiceId: '12345',
                userId,
            }
        });
    }

    // private async createWithCheckoutSession(
    //     {charge, ...createReservationDto}: CreateReservationDto,
    //     {email, id: userId}: User,
    // ) {
    //     const reservation = await this.prismaService.reservation.create({
    //         data: {
    //             ...createReservationDto,
    //             amount: charge.amount,
    //             timestamp: new Date(),
    //             userId,
    //             status: 'pending',
    //         }
    //     });
    //
    //     const session = await lastValueFrom(
    //         this.paymentsService.send<CheckoutSessionCreated>(
    //             'create_checkout_session',
    //             {
    //                 amount: charge.amount,
    //                 email,
    //                 reservationId: reservation._id.toHexString(),
    //             }
    //         )
    //     );
    //
    //     const updatedReservation = await this.repository.findOneAndUpdate(
    //         {_id: reservation._id},
    //         {$set: {checkoutSessionId: session.id}}
    //     );
    //
    //     return {
    //         ...updatedReservation,
    //         paymentUrl: session.url,
    //     };
    // }

    async findAll() {
        return this.prismaService.reservation.findMany({});
    }

    async findOne(id: number) {
        return this.prismaService.reservation.findUniqueOrThrow({where: {id}});
    }

    async update(id: number, updateReservationDto: UpdateReservationDto) {
        return this.prismaService.reservation.update({
            where: {id},
            data: updateReservationDto,
        });
    }

    async remove(id: number) {
        return this.prismaService.reservation.delete({
            where: {id},
        });
    }

    // async handlePaymentSucceeded({reservationId, paymentIntentId}: PaymentSucceededDto) {
    //     this.logger.log(`Payment succeeded for reservation ${reservationId}`);
    //     try {
    //         await this.prismaService.reservation.update({
    //             where: {id: reservationId},
    //             data: {status: 'confirmed', invoiceId: paymentIntentId}
    //         });
    //     } catch (error) {
    //         if (!(error instanceof NotFoundException)) {
    //             throw error;
    //         }
    //
    //         this.logger.warn(`Received payment for unknown reservation: ${reservationId}`);
    //     }
    // }
    //
    // async handlePaymentFailed({reservationId, reason}: PaymentFailedDto) {
    //     this.logger.log(`Payment failed for reservation ${reservationId}. ${reason}`);
    //     try {
    //         await this.prismaService.reservation.update({
    //             where: {id: reservationId},
    //             data: {status: 'cancelled'}
    //         });
    //     } catch (error) {
    //         if (!(error instanceof NotFoundException)) {
    //             throw error;
    //         }
    //     }
    // }
}
