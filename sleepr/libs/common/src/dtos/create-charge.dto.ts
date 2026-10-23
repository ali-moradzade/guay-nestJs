import {CardDto} from './card.dto.js'
import {IsDefined, IsNotEmptyObject, IsNumber, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

export class CreateChargeDto {
    @IsDefined()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => CardDto)
    card: CardDto;

    @IsNumber()
    amount: number;
}
