import {AbstractEntity} from '@app/common';
import {Column, Entity, JoinTable, ManyToMany} from 'typeorm';
import {Role} from './role.entity.js';

@Entity()
export class User extends AbstractEntity<User> {
    @Column({unique: true})
    email: string;

    @Column()
    password: string;

    @ManyToMany(() => Role, {cascade: true})
    @JoinTable()
    roles?: Role[];

    constructor(user?: Partial<User>) {
        super();
        Object.assign(this, user);
    }
}
