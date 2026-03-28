import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("interviews")
export class Interview {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    interviewCode: string

    @Column()
    candidateId: ObjectId

    @Column()
    vacancyId: ObjectId

    @Column()
    roundId: ObjectId

    @Column({ default: 1 })
    roundNumber: number

    @Column()
    level: string

    @Column()
    type: string

    @Column({ nullable: true })
    mode: string

    @Column()
    scheduleDate: Date

    @Column()
    time: string

    @Column()
    duration: number

    @Column({ default: 'Scheduled' })
    status: string

    @Column({ nullable: true })
    interviewStatus: string

    @Column()
    email: string

    @Column()
    phone: string

    @Column()
    timezone: string

    @Column()
    platform: string

    @Column({ nullable: true })
    location: string

    @Column({ nullable: true })
    notes: string

    @Column({ nullable: true })
    candidateInstructions: string

    @Column({ nullable: true })
    feedback: string

    @Column({ nullable: true })
    interviewResult: string

    @Column("simple-json", { nullable: true })
    panelMembers: {
        interviewerType: string;
        employeeId: ObjectId;
        panelRole?: string;
    }[];

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
