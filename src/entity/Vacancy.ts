
import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"
import { ObjectId } from "mongodb";

@Entity("vacancies")
export class Vacancy {

    @ObjectIdColumn()
    id!: ObjectId;

    @Column()
    @Index()
    companyId!: ObjectId;

    @Index(["departmentId", "status"])
    @Index(["positionId", "status"])
    @Index(["recruiterId", "status"])
    @Index(["createdAt"])
    @Index(["approvalStatus", "status"])
    @Index(["priority", "status"])
    @Index(["status", "isDelete"])

    @Column()
    requestNumber!: string;

    @Column()
    requisitionDate!: Date | undefined;

    @Column()
    departmentId!: ObjectId;

    @Column()
    positionId!: ObjectId;

    @Column()
    reportingToId: ObjectId | undefined;

    @Column()
    employeeTypeId!: ObjectId;

    @Column()
    gender!: string;

    @Column()
    numberOfVacancy!: number;

    @Column()
    requiredDate!: Date | null | undefined;

    @Column()
    preferredEducation!: string | null | undefined;

    @Column()
    qualification!: string  | null | undefined;

    @Column()
    reasonForRequisition!: ObjectId;

    @Column()
    salaryRangeFrom!: number;

    @Column()
    salaryRangeTo!: number;

    @Column("simple-json", { nullable: true })
    file?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };

    @Column({ nullable: true })
    skills?: string;

    @Column({ nullable: true })
    location?: string;

    @Column({ nullable: true })
    recruiterId: ObjectId | undefined; // Assigned HR/recruiter

    @Column({ default: "medium" })
    priority!: "low" | "medium" | "high" | "urgent";

    @Column({ type: "int", nullable: true })
    experienceMin!: number; // Minimum years of experience

    @Column({ type: "int", nullable: true })
    experienceMax!: number | undefined; // Maximum years of experience

    @Column({ type: "varchar", length: 50, nullable: true })
    workLocationType!: "onsite" | "hybrid" | "remote" | "flexible" | null;

    @Column({ default: false })
    remoteEligible!: boolean;

    @Column({ nullable: true })
    applicationDeadline!: Date | undefined; // Last date to apply, separate from requiredDate

    @Column("simple-json", { nullable: true })
    requiredSkills?: {
        skillId?: ObjectId;
        name?: string;
        proficiency?: "beginner" | "intermediate" | "expert";
        required: boolean;
        yearsOfExperience?: number;
    }[];

    @Column({ type: "text", nullable: true })
    benefits?: string[]; // List of benefits/perks

    @Column({ default: "INR" })
    salaryCurrency!: string; // Default currency

    @Column({ nullable: true })
    externalPostingUrl?: string; // Link to career portal

    @Column()
    projectCode!: ObjectId | null | undefined; // Optional project association

    @Column()
    jobDescription!: string | null | undefined; // Detailed job description text

    @Column()
    createdBy!: ObjectId;

    @Column()
    updatedBy!: ObjectId;

    @Column({ default: 1 })
    isActive!: number;

    @Column({ default: 0 })
    isDelete!: number;

    // Applicant and interview tracking
    @Column({ default: 0 })
    applicantCount!: number;

    @Column({ default: 0 })
    interviewCount!: number;

    @Column({ default: 0 })
    offerCount!: number;

    @Column({ default: 0 })
    filledCount!: number;

    // Workflow timestamps
    @Column({ nullable: true })
    approvedAt!: Date;

    @Column({ nullable: true })
    openedAt!: Date;

    @Column({ nullable: true })
    filledAt!: Date;

    // Approval and status history
    @Column("simple-json", { nullable: true })
    statusHistory?: {
        from: string | null;
        to: string;
        changedBy: ObjectId;
        changedAt: Date;
        remarks?: string;
    }[];

    @Column("simple-json", { nullable: true })
    approvalHistory?: {
        from: string | null;
        to: string;
        changedBy: ObjectId;
        changedAt: Date;
        remarks?: string;
    }[];

    @Column({ nullable: true })
    approverId!: ObjectId | undefined; // Final approver for the vacancy

    @Column({ type: "text", nullable: true })
    approvalRemarks?: string;

    @Column({ default: 0 })
    agingDays!: number;

    @Column({ default: 0, type: "smallint" })
    healthScore!: number;

    @Column({ default: 'draft' })
    status!: string;

    @Column({ default: 'pending' })
    approvalStatus!: string;

    @Column({ default: null })
    scheduleDate: Date | null | undefined;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
