import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("offers")
export class Offer {

    @ObjectIdColumn()
    id!: ObjectId;

    @Column()
    offerCode!: string;

    @Column()
    candidateId!: ObjectId;

    @Column()
    vacancyId!: ObjectId;

    @Column()
    departmentId!: ObjectId;

    @Column()
    reportingManager!: ObjectId;

    @Column()
    workLocationId!: ObjectId;

    @Column()
    workMode!: string;

    @Column()
    joiningDate!: Date;

    @Column()
    offerExpiryDate!: Date;

    @Column()
    ctc!: number;

    @Column({ default: 'Pending Approval' })
    status!: string;

    @Column({ default: 'Pending' })
    candidateResponse!: string;

    @Column({ nullable: true })
    termsAndConditions?: string;

    @Column({ nullable: true })
    notes?: string;

    @Column("simple-json")
    salaryBreakdown!: {
        basic: number;
        hra: number;
        specialAllowance: number;
        pf: number;
        gratuity: number;
        medicalInsurance: number;
    };

    @Column({ nullable: true })
    offerLetterUrl?: string;

    @Column()
    createdBy!: ObjectId;

    @Column()
    updatedBy!: ObjectId;

    @Column({ default: 1 })
    isActive!: number;

    @Column({ default: 0 })
    isDelete!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
