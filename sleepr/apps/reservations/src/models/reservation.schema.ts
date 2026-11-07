import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {AbstractDocument} from '@app/common';
import {
    Field,
    ObjectType,
    registerEnumType,
} from '@nestjs/graphql';
export const RESERVATION_STATUSES = [
    'pending',
    'confirmed',
    'cancelled',
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

registerEnumType(
    {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        CANCELLED: 'cancelled',
    },
    {
        name: 'ReservationStatus',
    },
);

@Schema({
    versionKey: false
})
@ObjectType()
export class ReservationDocument extends AbstractDocument {
    @Prop()
    @Field()
    timestamp: Date;

    @Prop()
    @Field()
    startDate: Date;

    @Prop()
    @Field()
    endDate: Date;

    @Prop()
    @Field()
    userId: string;

    @Prop()
    @Field()
    invoiceId?: string;

    @Prop()
    @Field()
    amount: number;

    @Prop()
    @Field()
    checkoutSessionId?: string;

    @Prop({
        type: String,
        enum: RESERVATION_STATUSES,
        default: 'pending',
    })
    @Field(() => String)
    status: ReservationStatus;
}

export const ReservationSchema = SchemaFactory.createForClass(ReservationDocument);
