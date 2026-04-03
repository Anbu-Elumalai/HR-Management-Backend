import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("interview_rounds")
export class InterviewRound {

    @ObjectIdColumn()
    id!: ObjectId;

    @Column()
    name!: string;

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
