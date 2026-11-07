import {CardDto} from './card.dto.js';
import {IsNotEmptyObject, IsNumber, IsOptional, IsPositive, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {Field, InputType} from '@nestjs/graphql';

@InputType()
export class CreateChargeDto {
    @IsOptional()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => CardDto)
    @Field(() => CardDto)
    card?: CardDto;

    @IsNumber({maxDecimalPlaces: 2})
    @IsPositive()
    @Field()
    amount: number;
}
