import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("candidates")
export class Candidate {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    candidateCode: string

    @Column()
    name: string

    @Column()
    email: string

    @Column()
    phone: string

    @Column()
    role: string

    @Column()
    vacancyId: ObjectId

    @Column()
    departmentId: ObjectId

    @Column()
    experience: string

    @Column()
    noticePeriod: string

    @Column({ default: 'New' })
    status: string

    @Column()
    source: string

    @Column()
    currentCompany: string

    @Column()
    currentLocation: ObjectId

    @Column()
    currentCTC: string

    @Column()
    expectedCTC: string

    @Column({ nullable: true })
    skills: ObjectId[]

    @Column({ nullable: true })
    remarks: string

    @Column({ nullable: true })
    linkedinUrl: string

    @Column({ nullable: true })
    portfolioUrl: string

    @Column({ nullable: true })
    githubUrl: string

    @Column()
    highestQualification: string

    @Column({ nullable: true })
    preferredLocation: ObjectId[]

    @Column()
    availableToJoin: Date

    @Column()
    dob: Date

    @Column()
    gender: string

    @Column()
    address: string

    @Column("simple-json", { nullable: true })
    resumeFile?: {
        field?: string;
        fileName?: string;
        originalName?: string;
        path?: string;
        url?: string;
    };

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
