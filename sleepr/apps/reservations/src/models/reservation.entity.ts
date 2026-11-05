import {AbstractEntity} from '@app/common';
import {Column, CreateDateColumn, Entity} from 'typeorm';

export const RESERVATION_STATUSES = [
    'pending',
    'confirmed',
    'cancelled',
] as const;

export type ReservationStatus =
    (typeof RESERVATION_STATUSES)[number];

@Entity()
export class Reservation extends AbstractEntity<Reservation> {
    @CreateDateColumn()
    timestamp: Date;

    @Column()
    startDate: Date;

    @Column()
    endDate: Date;

    @Column()
    userId: number;

    @Column()
    invoiceId?: string;

    @Column()
    amount: number;

    @Column({nullable: true})
    checkoutSessionId?: string;

    @Column({
        type: 'enum',
        enum: RESERVATION_STATUSES,
        default: 'pending',
    })
    status: ReservationStatus;

    constructor(reservation?: Partial<Reservation>) {
        super();
        Object.assign(this, reservation);
    }
}
