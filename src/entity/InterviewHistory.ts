import { Entity, ObjectIdColumn, Column, CreateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("interview_history")
export class InterviewHistory {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    interviewId: ObjectId

    @Column()
    status: string

    @Column({ nullable: true })
    interviewStatus: string

    @Column({ nullable: true })
    feedback: string

    @Column({ nullable: true })
    interviewResult: string

    @Column({ nullable: true })
    reason: string

    @Column()
    updatedBy: ObjectId

    @CreateDateColumn()
    createdAt: Date
}
