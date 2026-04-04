import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("companies")
export class Company {

    @ObjectIdColumn()
    id!: ObjectId;

    @Column()
    name!: string;

    @Column()
    email!: string;

    @Column()
    phoneNumber!: string;

    @Column()
    address!: string;

    @Column()
    logo!: string;

    @Column()
    website!: string;

    @Column()
    description!: string;

    @Column()
    industry!: string;

    @Column()
    companySize!: string;

    @Column()
    location!: string;

    @Column()
    country!: string;

    @Column()
    state!: string;

    @Column()
    city!: string;

    @Column()
    zipCode!: string;

    @Column()
    timezone!: string;

    @Column({ default: 1 })
    isActive!: number;

    @Column({ default: 0 })
    isDelete!: number;

    @Column()
    createdBy!: ObjectId;

    @Column()
    updatedBy!: ObjectId;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
