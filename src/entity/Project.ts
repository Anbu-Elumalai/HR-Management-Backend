
import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("projects")
export class Project {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    name: string

    @Column()
    code: string

    @Column()
    description: string

    @Column()
    startDate: Date

    @Column()
    endDate: Date

    @Column()
    status: string

    @Column()
    manager: string

    @Column()
    location: string

    @Column()
    createdBy: ObjectId;

    @Column()
    updatedBy: ObjectId;

    @Column({ default: 1 })
    isActive: number

    @Column({ default: 0 })
    isDelete: number

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
