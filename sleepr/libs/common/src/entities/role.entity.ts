import {Column, Entity} from 'typeorm';
import {AbstractEntity} from '@app/common';

@Entity()
export class Role extends AbstractEntity<Role> {
    @Column()
    name: string;

    constructor(role?: Partial<Role>) {
        super();
        Object.assign(this, role);
    }
}
