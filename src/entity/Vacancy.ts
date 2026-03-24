
import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("vacancies")
export class Vacancy {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    requestNumber: string

    @Column()
    requisitionDate: Date

    @Column()
    departmentId: ObjectId

    @Column()
    positionId: ObjectId

    @Column()
    reportingToId: ObjectId

    @Column()
    employeeTypeId: ObjectId

    @Column()
    gender: string

    @Column()
    numberOfVacancy: number

    @Column()
    requiredDate: Date

    @Column()
    preferredEducation: string

    @Column()
    qualification: string

    @Column()
    reasonForRequisition: ObjectId

    @Column()
    salaryRangeFrom: number

    @Column()
    salaryRangeTo: number

    @Column("simple-json", { nullable: true })
    file?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @Column()
    projectCode: ObjectId

    @Column()
    jobDescription: string

    @Column()
    createdBy: ObjectId;

    @Column()
    updatedBy: ObjectId;

    @Column({ default: 1 })
    isActive: number

    @Column({ default: 0 })
    isDelete: number

    @Column({ default: 'draft' })
    status: string

    @Column({ default: 'pending' })
    approvalStatus: string

    @Column({ default: null })
    scheduleDate: Date

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
