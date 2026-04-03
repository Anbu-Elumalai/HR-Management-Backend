import {
    Entity,
    ObjectIdColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";
import { ObjectId } from "mongodb";
@Entity('modules')
export class Modules {
    @ObjectIdColumn()
    _id!: ObjectId;

    @Column()
    key!: string;

    @Column()
    name!: string;

    @Column()
    group!: string;

    @Column()
    sortOrder!: number;

    @Column()
    isActive!: number;

    @Column()
    isDelete!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
