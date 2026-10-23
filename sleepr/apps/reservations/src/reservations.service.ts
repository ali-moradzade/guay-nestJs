import {Inject, Injectable} from '@nestjs/common';
import {CreateReservationDto} from './dto/create-reservation.dto.js';
import {UpdateReservationDto} from './dto/update-reservation.dto.js';
import {ReservationRepository} from './reservation.repository.js';
import {PAYMENTS_SERVICE} from '@app/common';
import {ClientProxy} from '@nestjs/microservices';
import {map} from 'rxjs';

@Injectable()
export class ReservationsService {
    constructor(
        private readonly repository: ReservationRepository,
        @Inject(PAYMENTS_SERVICE) private readonly paymentsService: ClientProxy,
    ) {
    }

    async create(createReservationDto: CreateReservationDto, userId: string) {
        return this.paymentsService
            .send('create_charge', createReservationDto.charge)
            .pipe(
                map((res) => {
                    return this.repository.create({
                        ...createReservationDto,
                        timestamp: new Date(),
                        // invoiceId: res.id, // TO USE REAL STRIPE UNCOMMENT THIS
                        invoiceId: '12345',
                        userId,
                    });
                })
            );
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
}
