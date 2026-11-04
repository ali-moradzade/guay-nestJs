import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {AbstractDocument} from '@app/common';

export const RESERVATION_STATUSES = [
    'pending',
    'confirmed',
    'cancelled',
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

@Schema({
    versionKey: false
})
export class ReservationDocument extends AbstractDocument {
    @Prop()
    timestamp: Date;

    @Prop()
    startDate: Date;

    @Prop()
    endDate: Date;

    @Prop()
    userId: string;

    @Prop()
    invoiceId?: string;

    @Prop()
    amount: number;

    @Prop()
    checkoutSessionId?: string;

    @Prop({
        type: String,
        enum: RESERVATION_STATUSES,
        default: 'pending',
    })
    status: ReservationStatus;
}

export const ReservationSchema = SchemaFactory.createForClass(ReservationDocument);
