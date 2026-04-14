import {
    JsonController,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Res,
    Req,
    UseBefore,
    HttpCode,
    QueryParams,
    Put
} from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { canAccess } from "../../middlewares/PermissionMiddleware";
import { AppDataSource } from "../../data-source";
import { Vacancy } from "../../entity/Vacancy";
import { Candidate } from "../../entity/Candidate";
import { Department } from "../../entity/Department";
import { Position } from "../../entity/Position";
import { EmploymentType } from "../../entity/EmploymentType";
import { AdminUser } from "../../entity/AdminUser";
import { Project } from "../../entity/Project";
import { ReasonRequisition } from "../../entity/ReasonRequisition";
import { Role } from "../../entity/Role.Permission";
import {
    CreateVacancyDto,
    UpdateVacancyDto,
    UpdateVacancyStatusDto,
    UpdateVacancyApprovalDto
} from "../../dto/admin/Vacancy.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { generateVacancyRequestNumber } from "../../utils/id.generator";
import imageService from "../../utils/upload";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/vacancies")
@UseBefore(AuthMiddleware)
export class VacancyController {
    private vacancyRepo = AppDataSource.getMongoRepository(Vacancy);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    @UseBefore(canAccess("vacancies", "add"))
    async create(
        @Body() body: CreateVacancyDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const departmentRepo = AppDataSource.getMongoRepository(Department);
            const positionRepo = AppDataSource.getMongoRepository(Position);
            const employmentTypeRepo = AppDataSource.getMongoRepository(EmploymentType);
            const adminUserRepo = AppDataSource.getMongoRepository(AdminUser);
            const projectRepo = AppDataSource.getMongoRepository(Project);
            const reasonRepo = AppDataSource.getMongoRepository(ReasonRequisition);

            const validations = await Promise.all([
                departmentRepo.findOneBy({ _id: new ObjectId(body.departmentId), isDelete: 0 }),
                positionRepo.findOneBy({ _id: new ObjectId(body.positionId), isDelete: 0 }),
                employmentTypeRepo.findOneBy({ _id: new ObjectId(body.employeeTypeId), isDelete: 0 }),
                body.reportingToId
                    ? adminUserRepo.findOneBy({ _id: new ObjectId(body.reportingToId), isDelete: 0 })
                    : Promise.resolve(undefined),
                body.projectCode
                    ? projectRepo.findOneBy({ _id: new ObjectId(body.projectCode), isDelete: 0 })
                    : Promise.resolve(undefined),
                reasonRepo.findOneBy({ _id: new ObjectId(body.reasonForRequisition), isDelete: 0 })
            ]);

            const [dept, position, empType, reportingTo, project, reason] = validations;

            if (!dept || !position || !empType || !reason) {
                return response(
                    res,
                    StatusCodes.BAD_REQUEST,
                    "One or more required referenced records do not exist or are inactive (department, position, employee type, reason)"
                );
            }

            if (body.reportingToId && !reportingTo) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid reportingToId - user not found or inactive");
            }

            if (body.projectCode && !project) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid projectCode - project not found or inactive");
            }

            const duplicateCheck = await this.vacancyRepo.findOne({
                where: {
                    departmentId: new ObjectId(body.departmentId),
                    positionId: new ObjectId(body.positionId),
                    reasonForRequisition: new ObjectId(body.reasonForRequisition),
                    status: { $in: ["draft", "open"] },
                    isDelete: 0
                } as any
            });

            if (duplicateCheck) {
                return response(
                    res,
                    StatusCodes.CONFLICT,
                    `A similar active vacancy (${duplicateCheck.requestNumber}) already exists for this department, position, and reason. Please review before creating duplicate.`
                );
            }

            if (body?.salaryRangeFrom > body?.salaryRangeTo) {
                return response(res, StatusCodes.BAD_REQUEST, "salaryRangeFrom must be less than or equal to salaryRangeTo");
            }

            if (
                body.experienceMin !== undefined &&
                body.experienceMax !== undefined &&
                body.experienceMin > body.experienceMax
            ) {
                return response(res, StatusCodes.BAD_REQUEST, "experienceMin must be less than or equal to experienceMax");
            }

            if (
                body.applicationDeadline &&
                body.requiredDate &&
                new Date(body.applicationDeadline) < new Date(body.requiredDate)
            ) {
                return response(res, StatusCodes.BAD_REQUEST, "applicationDeadline must be on or after requiredDate");
            }

            const similarVacancies = await this.vacancyRepo.find({
                where: {
                    departmentId: new ObjectId(body.departmentId),
                    positionId: new ObjectId(body.positionId),
                    isDelete: 0,
                    status: { $in: ["draft", "open"] }
                } as any
            });

            const potentialDuplicates = similarVacancies.filter((v: any) => {
                const existingRequiredDate = v.requiredDate ? new Date(v.requiredDate) : null;
                const newRequiredDate = body.requiredDate ? new Date(body.requiredDate) : null;

                if (!existingRequiredDate || !newRequiredDate) return false;

                const dateDiff = Math.abs(existingRequiredDate.getTime() - newRequiredDate.getTime());
                const daysDiff = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

                const salaryFrom = Math.min(v.salaryRangeFrom || 0, v.salaryRangeTo || 0);
                const salaryTo = Math.max(v.salaryRangeFrom || 0, v.salaryRangeTo || 0);
                const newFrom = Math.min(body.salaryRangeFrom || 0, body.salaryRangeTo || 0);
                const newTo = Math.max(body.salaryRangeFrom || 0, body.salaryRangeTo || 0);

                const salaryOverlap = salaryFrom <= newTo && salaryTo >= newFrom;
                const salarySimilarity = Math.abs(salaryFrom - newFrom) / (salaryFrom || 1) < 0.2;

                return daysDiff <= 30 && (salaryOverlap || salarySimilarity);
            });

            if (potentialDuplicates.length > 0) {
                const duplicateNumbers = potentialDuplicates.map((v: any) => v.requestNumber).join(", ");
                console.log(`Warning: Potential duplicates detected for new vacancy: ${duplicateNumbers}`);
            }

            const vacancy = new Vacancy();
            vacancy.requestNumber = await generateVacancyRequestNumber();
            vacancy.requisitionDate = body.requisitionDate ? new Date(body.requisitionDate) : undefined;
            vacancy.departmentId = new ObjectId(body.departmentId);
            vacancy.positionId = new ObjectId(body.positionId);
            vacancy.reportingToId = body.reportingToId ? new ObjectId(body.reportingToId) : undefined;
            vacancy.employeeTypeId = new ObjectId(body.employeeTypeId);
            vacancy.gender = body.gender || "any";
            vacancy.numberOfVacancy = body.numberOfVacancy || 1;
            vacancy.requiredDate = body.requiredDate ? new Date(body.requiredDate) : undefined;
            vacancy.preferredEducation = body.preferredEducation || undefined;
            vacancy.qualification = body.qualification || undefined;
            vacancy.reasonForRequisition = new ObjectId(body.reasonForRequisition);
            vacancy.salaryRangeFrom = body.salaryRangeFrom || undefined;
            vacancy.salaryRangeTo = body.salaryRangeTo || undefined;
            vacancy.projectCode = body.projectCode ? new ObjectId(body.projectCode) : undefined;
            vacancy.jobDescription = body.jobDescription || undefined;
            vacancy.createdBy = new ObjectId(userId);
            vacancy.updatedBy = new ObjectId(userId);
            vacancy.status = body.status || "draft";
            vacancy.approvalStatus = body.approvalStatus || "pending";
            vacancy.scheduleDate = body.scheduleDate ? new Date(body.scheduleDate) : undefined;
            vacancy.isActive = 1;
            vacancy.isDelete = 0;
            vacancy.skills = body.skills;
            vacancy.location = body.location;
            vacancy.recruiterId = body.recruiterId ? new ObjectId(body.recruiterId) : undefined;
            vacancy.priority = body.priority || "medium";
            vacancy.experienceMin = body.experienceMin !== undefined ? body.experienceMin : undefined;
            vacancy.experienceMax = body.experienceMax !== undefined ? body.experienceMax : undefined;
            vacancy.workLocationType = body.workLocationType || undefined;
            vacancy.remoteEligible = body.remoteEligible !== undefined ? body.remoteEligible : false;
            vacancy.applicationDeadline = body.applicationDeadline ? new Date(body.applicationDeadline) : undefined;
            vacancy.requiredSkills = body.requiredSkills || undefined;
            vacancy.benefits = body.benefits || undefined;
            vacancy.salaryCurrency = body.salaryCurrency || "INR";
            vacancy.externalPostingUrl = body.externalPostingUrl || undefined;
            vacancy.approverId = undefined;
            vacancy.approvalRemarks = undefined;

            const files = (req as any).files;
            if (files && files.file) {
                try {
                    const uploadedFile = files.file;
                    const fileName = `${Date.now()}_${uploadedFile.name}`;
                    const fileFolder = "vacancies";

                    await imageService.fileUpload(uploadedFile, fileFolder, fileName);

                    vacancy.file = {
                        fileName,
                        path: `public/${fileFolder}/${fileName}`,
                        originalName: uploadedFile.name
                    };
                } catch (uploadError) {
                    console.error("File upload failed:", uploadError);
                    return handleErrorResponse(uploadError, res);
                }
            }

            vacancy.statusHistory = [
                {
                    from: null,
                    to: vacancy.status,
                    changedBy: new ObjectId(userId),
                    changedAt: new Date(),
                    remarks: "Vacancy created"
                }
            ];

            vacancy.approvalHistory = [
                {
                    from: null,
                    to: vacancy.approvalStatus,
                    changedBy: new ObjectId(userId),
                    changedAt: new Date(),
                    remarks: "Initial approval status set"
                }
            ];

            const savedVacancy = await this.vacancyRepo.save(vacancy);

            this.updateHealthScore(savedVacancy.id).catch(console.error);

            return response(res, StatusCodes.CREATED, "Vacancy created successfully", savedVacancy);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/dashboard/stats")
    @UseBefore(canAccess("vacancies", "view"))
    async dashboardStats(@Res() res: Response) {
        try {
            const now = new Date();
            const currentPeriodStart = new Date();
            currentPeriodStart.setDate(now.getDate() - 30);

            const previousPeriodStart = new Date();
            previousPeriodStart.setDate(now.getDate() - 60);


            const pipeline: any[] = [
                { $match: { isDelete: 0 } },
                {
                    $facet: {
                        current: [
                            { $match: { createdAt: { $gte: currentPeriodStart } } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
                                    draft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
                                    pending: { $sum: { $cond: [{ $eq: ["$approvalStatus", "pending"] }, 1, 0] } },
                                    filled: { $sum: { $cond: [{ $eq: ["$status", "filled"] }, 1, 0] } },
                                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
                                }
                            }
                        ],
                        previous: [
                            { $match: { createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart } } },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
                                    draft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
                                    pending: { $sum: { $cond: [{ $eq: ["$approvalStatus", "pending"] }, 1, 0] } },
                                    filled: { $sum: { $cond: [{ $eq: ["$status", "filled"] }, 1, 0] } },
                                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
                                }
                            }
                        ],
                        overall: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
                                    draft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
                                    pending: { $sum: { $cond: [{ $eq: ["$approvalStatus", "pending"] }, 1, 0] } },
                                    filled: { $sum: { $cond: [{ $eq: ["$status", "filled"] }, 1, 0] } },
                                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
                                }
                            }
                        ]
                    }
                }
            ];

            const [result] = await this.vacancyRepo.aggregate(pipeline).toArray();

            const overall = result?.overall?.[0] || { total: 0, open: 0, draft: 0, pending: 0, filled: 0, cancelled: 0 };
            const current = result?.current?.[0] || { total: 0, open: 0, draft: 0, pending: 0, filled: 0, cancelled: 0 };
            const previous = result?.previous?.[0] || { total: 0, open: 0, draft: 0, pending: 0, filled: 0, cancelled: 0 };

            const calculateTrend = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return Math.round(((curr - prev) / prev) * 100);
            };

            const stats = {
                totalVacancies: {
                    count: overall.total,
                    trend: calculateTrend(current.total, previous.total)
                },
                openPositions: {
                    count: overall.open,
                    trend: calculateTrend(current.open, previous.open)
                },
                draftJobs: {
                    count: overall.draft,
                    trend: calculateTrend(current.draft, previous.draft)
                },
                pendingApproval: {
                    count: overall.pending,
                    trend: calculateTrend(current.pending, previous.pending)
                },
                filledJobs: {
                    count: overall.filled,
                    trend: calculateTrend(current.filled, previous.filled)
                },
                cancelled: {
                    count: overall.cancelled,
                    trend: calculateTrend(current.cancelled, previous.cancelled)
                }
            };

            return response(res, StatusCodes.OK, "Dashboard stats fetched successfully", stats);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/")
    @UseBefore(canAccess("vacancies", "view"))
    async list(
        @QueryParams() query: any,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
            const search = query.search?.toString();
            const match: any = { isDelete: 0 };

            if (query.vacancyCode) {
                match.requestNumber = { $regex: query.vacancyCode, $options: "i" };
            }

            if (query.vacancies) {
                match.numberOfVacancy = Number(query.vacancies);
            }

            if (query.targetDate) {
                try {
                    const targetDate = new Date(query.targetDate);
                    if (!isNaN(targetDate.getTime())) {
                        const startOfDay = new Date(targetDate);
                        startOfDay.setHours(0, 0, 0, 0);
                        const endOfDay = new Date(targetDate);
                        endOfDay.setHours(23, 59, 59, 999);
                        match.requiredDate = { $gte: startOfDay, $lte: endOfDay };
                    }
                } catch (e) {
                    console.error("Invalid targetDate format:", query.targetDate);
                }
            }

            if (query.approval) {
                match.approvalStatus = { $regex: query.approval, $options: "i" };
            }

            if (query.status) {
                match.status = { $regex: query.status, $options: "i" };
            }

            if (query.priority) {
                match.priority = { $regex: query.priority, $options: "i" };
            }

            if (query.locationFilter) {
                match.location = { $regex: query.locationFilter, $options: "i" };
            }

            if (query.departmentId) match.departmentId = new ObjectId(query.departmentId);
            if (query.positionId) match.positionId = new ObjectId(query.positionId);
            if (query.employeeTypeId) match.employeeTypeId = new ObjectId(query.employeeTypeId);
            if (query.gender) match.gender = query.gender;

            if (query.isActive !== undefined && !query.status) {
                match.isActive = query.isActive === "true" || query.isActive === "1" || query.isActive === 1 ? 1 : 0;
            }

            const pipeline: any[] = [
                { $match: match },
                {
                    $lookup: {
                        from: "departments",
                        localField: "departmentId",
                        foreignField: "_id",
                        as: "department"
                    }
                },
                { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "positions",
                        localField: "positionId",
                        foreignField: "_id",
                        as: "position"
                    }
                },
                { $unwind: { path: "$position", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "employment_types",
                        localField: "employeeTypeId",
                        foreignField: "_id",
                        as: "employeeType"
                    }
                },
                { $unwind: { path: "$employeeType", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "reportingToId",
                        foreignField: "_id",
                        as: "reportingTo"
                    }
                },
                { $unwind: { path: "$reportingTo", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "projects",
                        localField: "projectCode",
                        foreignField: "_id",
                        as: "projectData"
                    }
                },
                { $unwind: { path: "$projectData", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "candidates",
                        localField: "_id",
                        foreignField: "vacancyId",
                        as: "candidates"
                    }
                },
                {
                    $addFields: {
                        filledPositions: {
                            $size: {
                                $filter: {
                                    input: "$candidates",
                                    as: "candidate",
                                    cond: { $in: ["$$candidate.status", ["hired", "offered"]] }
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        remainingPositions: { $subtract: ["$numberOfVacancy", "$filledPositions"] },
                        appliedApplicants: { $size: "$candidates" },
                        openings: {
                            $concat: [
                                { $toString: { $ifNull: ["$filledPositions", 0] } },
                                " / ",
                                { $toString: { $ifNull: ["$numberOfVacancy", 0] } }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        candidates: 0
                    }
                }
            ];

            const postMatch: any = {};

            if (search) {
                postMatch.$or = [
                    { requestNumber: { $regex: search, $options: "i" } },
                    { "position.name": { $regex: search, $options: "i" } },
                    { "department.name": { $regex: search, $options: "i" } },
                    { "employeeType.name": { $regex: search, $options: "i" } },
                    { "projectData.name": { $regex: search, $options: "i" } },
                    { location: { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } },
                    { approvalStatus: { $regex: search, $options: "i" } }
                ];
            }

            if (query.position) postMatch["position.name"] = { $regex: query.position, $options: "i" };
            if (query.department) postMatch["department.name"] = { $regex: query.department, $options: "i" };
            if (query.hiringType) postMatch["employeeType.name"] = { $regex: query.hiringType, $options: "i" };
            if (query.project) postMatch["projectData.name"] = { $regex: query.project, $options: "i" };

            if (query.filled !== undefined && query.filled !== "") postMatch.filledPositions = Number(query.filled);
            if (query.remaining !== undefined && query.remaining !== "") postMatch.remainingPositions = Number(query.remaining);

            if (Object.keys(postMatch).length > 0) {
                pipeline.push({ $match: postMatch });
            }

            pipeline.push({ $sort: { createdAt: -1 } });
            pipeline.push({
                $facet: {
                    data: [{ $skip: page * limit }, { $limit: limit }],
                    meta: [{ $count: "total" }]
                }
            });

            const [result] = await this.vacancyRepo.aggregate(pipeline).toArray();
            const data = result?.data || [];
            const total = result?.meta?.[0]?.total || 0;

            return res.status(StatusCodes.OK).send({
                data,
                total,
                page,
                limit
            });
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/:id")
    @UseBefore(canAccess("vacancies", "view"))
    async getOne(@Param("id") id: string, @Res() res: Response) {
        try {
            const data = await this.getAggregatedVacancy(new ObjectId(id));
            if (!data) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }
            return response(res, StatusCodes.OK, "Vacancy fetched successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/:id")
    @UseBefore(canAccess("vacancies", "edit"))
    async update(
        @Param("id") id: string,
        @Body() body: UpdateVacancyDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const vacancy = await this.vacancyRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!vacancy) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }

            const isOwner = vacancy.createdBy?.toString() === userId;
            const isHiringManager = vacancy.reportingToId?.toString() === userId;
            const userRole = req.user.role as Role;
            const isAdmin = userRole?.permissions?.some((p: any) => p.actions?.edit) || false;

            if (!isOwner && !isHiringManager && !isAdmin) {
                return response(res, StatusCodes.FORBIDDEN, "Not authorized to edit this vacancy");
            }

            if (["closed", "filled", "cancelled"].includes(vacancy.status)) {
                return response(res, StatusCodes.BAD_REQUEST, `Cannot edit vacancy with status '${vacancy.status}'`);
            }

            const departmentRepo = AppDataSource.getMongoRepository(Department);
            const positionRepo = AppDataSource.getMongoRepository(Position);
            const employmentTypeRepo = AppDataSource.getMongoRepository(EmploymentType);
            const adminUserRepo = AppDataSource.getMongoRepository(AdminUser);
            const projectRepo = AppDataSource.getMongoRepository(Project);
            const reasonRepo = AppDataSource.getMongoRepository(ReasonRequisition);

            if (body.departmentId !== undefined) {
                const dept = await departmentRepo.findOneBy({ _id: new ObjectId(body.departmentId), isDelete: 0 });
                if (!dept) return response(res, StatusCodes.BAD_REQUEST, "Invalid departmentId");
                vacancy.departmentId = new ObjectId(body.departmentId);
            }

            if (body.positionId !== undefined) {
                const pos = await positionRepo.findOneBy({ _id: new ObjectId(body.positionId), isDelete: 0 });
                if (!pos) return response(res, StatusCodes.BAD_REQUEST, "Invalid positionId");
                vacancy.positionId = new ObjectId(body.positionId);
            }

            if (body.employeeTypeId !== undefined) {
                const empType = await employmentTypeRepo.findOneBy({ _id: new ObjectId(body.employeeTypeId), isDelete: 0 });
                if (!empType) return response(res, StatusCodes.BAD_REQUEST, "Invalid employeeTypeId");
                vacancy.employeeTypeId = new ObjectId(body.employeeTypeId);
            }

            if (body.reportingToId !== undefined) {
                if (body.reportingToId) {
                    const user = await adminUserRepo.findOneBy({ _id: new ObjectId(body.reportingToId), isDelete: 0 });
                    if (!user) return response(res, StatusCodes.BAD_REQUEST, "Invalid reportingToId - user not found or inactive");
                    vacancy.reportingToId = new ObjectId(body.reportingToId);
                } else {
                    vacancy.reportingToId = null;
                }
            }

            if (body.projectCode !== undefined) {
                if (body.projectCode) {
                    const proj = await projectRepo.findOneBy({ _id: new ObjectId(body.projectCode), isDelete: 0 });
                    if (!proj) return response(res, StatusCodes.BAD_REQUEST, "Invalid projectCode");
                    vacancy.projectCode = new ObjectId(body.projectCode);
                } else {
                    vacancy.projectCode = null;
                }
            }

            if (body.reasonForRequisition !== undefined) {
                if (body.reasonForRequisition) {
                    const reason = await reasonRepo.findOneBy({ _id: new ObjectId(body.reasonForRequisition), isDelete: 0 });
                    if (!reason) return response(res, StatusCodes.BAD_REQUEST, "Invalid reasonForRequisition");
                    vacancy.reasonForRequisition = new ObjectId(body.reasonForRequisition);
                } else {
                    vacancy.reasonForRequisition = null;
                }
            }

            if (body.requisitionDate !== undefined) vacancy.requisitionDate = new Date(body.requisitionDate);
            if (body.gender !== undefined) vacancy.gender = body.gender;
            if (body.numberOfVacancy !== undefined) vacancy.numberOfVacancy = body.numberOfVacancy;
            if (body.requiredDate !== undefined) vacancy.requiredDate = new Date(body.requiredDate);
            if (body.preferredEducation !== undefined) vacancy.preferredEducation = body.preferredEducation;
            if (body.qualification !== undefined) vacancy.qualification = body.qualification;
            if (body.salaryRangeFrom !== undefined) vacancy.salaryRangeFrom = body.salaryRangeFrom;
            if (body.salaryRangeTo !== undefined) vacancy.salaryRangeTo = body.salaryRangeTo;
            if (body.jobDescription !== undefined) vacancy.jobDescription = body.jobDescription;
            if (body.isActive !== undefined) vacancy.isActive = body.isActive;
            if (body.skills !== undefined) vacancy.skills = body.skills;
            if (body.location !== undefined) vacancy.location = body.location;

            if (body.recruiterId !== undefined) {
                vacancy.recruiterId = body.recruiterId ? new ObjectId(body.recruiterId) : null;
            }

            if (body.priority !== undefined) vacancy.priority = body.priority;
            if (body.experienceMin !== undefined) vacancy.experienceMin = body.experienceMin;
            if (body.experienceMax !== undefined) vacancy.experienceMax = body.experienceMax;
            if (body.workLocationType !== undefined) vacancy.workLocationType = body.workLocationType;
            if (body.remoteEligible !== undefined) vacancy.remoteEligible = body.remoteEligible;

            if (body.applicationDeadline !== undefined) {
                vacancy.applicationDeadline = body.applicationDeadline ? new Date(body.applicationDeadline) : null;
            }

            if (body.requiredSkills !== undefined) vacancy.requiredSkills = body.requiredSkills;
            if (body.benefits !== undefined) vacancy.benefits = body.benefits;
            if (body.salaryCurrency !== undefined) vacancy.salaryCurrency = body.salaryCurrency;
            if (body.externalPostingUrl !== undefined) vacancy.externalPostingUrl = body.externalPostingUrl;

            if (vacancy.salaryRangeFrom > vacancy.salaryRangeTo) {
                return response(res, StatusCodes.BAD_REQUEST, "salaryRangeFrom must be less than or equal to salaryRangeTo");
            }

            if (
                vacancy.experienceMin !== null &&
                vacancy.experienceMax !== null &&
                vacancy.experienceMin > vacancy.experienceMax
            ) {
                return response(res, StatusCodes.BAD_REQUEST, "experienceMin must be less than or equal to experienceMax");
            }

            if (
                vacancy.applicationDeadline &&
                vacancy.requiredDate &&
                vacancy.applicationDeadline < vacancy.requiredDate
            ) {
                return response(res, StatusCodes.BAD_REQUEST, "applicationDeadline must be on or after requiredDate");
            }

            if (body.status !== undefined) {
                const allowedTransitions: Record<string, string[]> = {
                    draft: ["open", "cancelled"],
                    open: ["closed", "filled"],
                    closed: ["filled"],
                    filled: [],
                    cancelled: []
                };

                if (!allowedTransitions[vacancy.status]?.includes(body.status)) {
                    return response(
                        res,
                        StatusCodes.BAD_REQUEST,
                        `Cannot change status from '${vacancy.status}' to '${body.status}'. Allowed: ${allowedTransitions[vacancy.status]?.join(", ") || "none"}`
                    );
                }

                if (body.status === "open" && vacancy.approvalStatus !== "approved") {
                    return response(res, StatusCodes.BAD_REQUEST, "Vacancy must be approved before opening");
                }

                vacancy.status = body.status;
            }

            if (body.approvalStatus !== undefined) {
                const validApprovalStatus = ["pending", "approved", "rejected", "cancelled"];
                if (!validApprovalStatus.includes(body.approvalStatus)) {
                    return response(res, StatusCodes.BAD_REQUEST, "Invalid approvalStatus");
                }
                vacancy.approvalStatus = body.approvalStatus;
            }

            if (body.scheduleDate !== undefined) {
                vacancy.scheduleDate = body.scheduleDate ? new Date(body.scheduleDate) : null;
            }

            const files = (req as any).files;
            if (files && files.file) {
                try {
                    const uploadedFile = files.file;
                    const fileName = `${Date.now()}_${uploadedFile.name}`;
                    const fileFolder = "vacancies";

                    await imageService.fileUpload(uploadedFile, fileFolder, fileName, vacancy.file?.fileName);

                    vacancy.file = {
                        fileName,
                        path: `public/${fileFolder}/${fileName}`,
                        originalName: uploadedFile.name
                    };
                } catch (uploadError) {
                    console.error("File upload failed:", uploadError);
                    return handleErrorResponse(uploadError, res);
                }
            }

            vacancy.updatedBy = new ObjectId(userId);

            const result = await this.vacancyRepo.save(vacancy);

            this.updateHealthScore(new ObjectId(id)).catch(console.error);

            return response(res, StatusCodes.OK, "Vacancy updated successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id/status")
    @UseBefore(canAccess("vacancies", "edit"))
    async updateStatus(
        @Param("id") id: string,
        @Body() body: UpdateVacancyStatusDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const vacancy = await this.vacancyRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!vacancy) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }

            const isOwner = vacancy.createdBy?.toString() === userId;
            const isHiringManager = vacancy.reportingToId?.toString() === userId;
            const userRole = req.user.role as Role;
            const isAdmin = userRole?.permissions?.some((p: any) => p.actions?.edit) || false;

            if (!isOwner && !isHiringManager && !isAdmin) {
                return response(res, StatusCodes.FORBIDDEN, "Not authorized to change status of this vacancy");
            }

            const allowedTransitions: Record<string, string[]> = {
                draft: ["open", "cancelled"],
                open: ["closed", "filled"],
                closed: ["filled"],
                filled: [],
                cancelled: []
            };

            const currentStatus = vacancy.status;
            if (!allowedTransitions[currentStatus]?.includes(body.status)) {
                return response(
                    res,
                    StatusCodes.BAD_REQUEST,
                    `Cannot change status from '${currentStatus}' to '${body.status}'. Allowed transitions: ${allowedTransitions[currentStatus]?.join(", ") || "none"}`
                );
            }

            if (body.status === "open" && vacancy.approvalStatus !== "approved") {
                return response(res, StatusCodes.BAD_REQUEST, "Vacancy must be approved before opening. Please approve first.");
            }

            const statusHistory = vacancy.statusHistory || [];
            statusHistory.push({
                from: currentStatus,
                to: body.status,
                changedBy: new ObjectId(userId),
                changedAt: new Date(),
                remarks: `Status changed via PATCH /status`
            });

            vacancy.status = body.status;
            vacancy.statusHistory = statusHistory;

            if (body.scheduleDate !== undefined) {
                vacancy.scheduleDate = body.scheduleDate ? new Date(body.scheduleDate) : null;
            }

            if (body.status === "open" && !vacancy.openedAt) {
                vacancy.openedAt = new Date();
            }

            if (body.status === "filled" && !vacancy.filledAt) {
                vacancy.filledAt = new Date();
            }

            vacancy.updatedBy = new ObjectId(userId);

            const result = await this.vacancyRepo.save(vacancy);

            this.updateHealthScore(new ObjectId(id)).catch(console.error);

            return response(res, StatusCodes.OK, "Vacancy status updated successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id/approval")
    @UseBefore(canAccess("vacancies", "approve"))
    async updateApprovalStatus(
        @Param("id") id: string,
        @Body() body: UpdateVacancyApprovalDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const vacancy = await this.vacancyRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!vacancy) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }

            const approvalHistory = vacancy.approvalHistory || [];
            approvalHistory.push({
                from: vacancy.approvalStatus,
                to: body.approvalStatus,
                changedBy: new ObjectId(userId),
                changedAt: new Date(),
                remarks: `Approval status changed to ${body.approvalStatus}`
            });

            vacancy.approvalStatus = body.approvalStatus;
            vacancy.approverId = new ObjectId(userId);
            vacancy.approvalRemarks = body.remarks || null;
            vacancy.approvalHistory = approvalHistory;

            if (body.approvalStatus === "approved") {
                vacancy.approvedAt = new Date();
            }

            vacancy.updatedBy = new ObjectId(userId);

            const result = await this.vacancyRepo.save(vacancy);

            this.updateHealthScore(new ObjectId(id)).catch(console.error);

            return response(res, StatusCodes.OK, "Vacancy approval status updated successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    @UseBefore(canAccess("vacancies", "delete"))
    async delete(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
        try {
            const { userId } = req.user;
            const vacancy = await this.vacancyRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!vacancy) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }

            const isOwner = vacancy.createdBy?.toString() === userId;
            const isHiringManager = vacancy.reportingToId?.toString() === userId;
            const userRole = req.user.role as Role;
            const isAdmin = userRole?.permissions?.some((p: any) => p.actions?.delete) || false;

            if (!isOwner && !isHiringManager && !isAdmin) {
                return response(res, StatusCodes.FORBIDDEN, "Not authorized to delete this vacancy");
            }

            const candidateCount = await AppDataSource.getMongoRepository(Candidate).count({
                where: { vacancyId: new ObjectId(id), isDelete: 0 }
            });

            if (candidateCount > 0) {
                console.log(`Warning: Deleting vacancy ${id} with ${candidateCount} linked candidates`);
            }

            vacancy.isDelete = 1;
            vacancy.updatedBy = new ObjectId(userId);

            const statusHistory = vacancy.statusHistory || [];
            statusHistory.push({
                from: vacancy.status,
                to: vacancy.status,
                changedBy: new ObjectId(userId),
                changedAt: new Date(),
                remarks: `Vacancy soft-deleted (isDelete=1)`
            });
            vacancy.statusHistory = statusHistory;

            await this.vacancyRepo.save(vacancy);

            return response(res, StatusCodes.OK, "Vacancy deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/code/generate")
    @UseBefore(canAccess("vacancies", "view"))
    async generateCode(@Res() res: Response) {
        try {
            const code = await generateVacancyRequestNumber();
            return response(res, StatusCodes.OK, "Vacancy code generated successfully", code);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/duplicates/detect")
    @UseBefore(canAccess("vacancies", "view"))
    async detectDuplicates(@QueryParams() query: any, @Res() res: Response) {
        try {
            const daysThreshold = Math.min(Number(query.days) || 30, 90);
            const includeClosed = query.includeClosed === "true";

            const match: any = { isDelete: 0 };
            if (!includeClosed) {
                match.status = { $in: ["draft", "open"] };
            }

            const pipeline: any[] = [
                { $match: match },
                {
                    $lookup: {
                        from: "departments",
                        localField: "departmentId",
                        foreignField: "_id",
                        as: "department"
                    }
                },
                { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "positions",
                        localField: "positionId",
                        foreignField: "_id",
                        as: "position"
                    }
                },
                { $unwind: { path: "$position", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        requestNumber: 1,
                        createdAt: 1,
                        status: 1,
                        departmentId: 1,
                        positionId: 1,
                        reasonForRequisition: 1,
                        salaryRangeFrom: 1,
                        salaryRangeTo: 1,
                        requiredDate: 1,
                        departmentName: "$department.name",
                        positionName: "$position.name"
                    }
                }
            ];

            const vacancies = await this.vacancyRepo.aggregate(pipeline).toArray();

            const groups = new Map<string, any[]>();
            for (const v of vacancies) {
                const key = `${v.departmentId}_${v.positionId}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(v);
            }

            const duplicates: any[] = [];

            for (const [, vacs] of groups.entries()) {
                if (vacs.length < 2) continue;

                for (let i = 0; i < vacs.length; i++) {
                    for (let j = i + 1; j < vacs.length; j++) {
                        const v1 = vacs[i];
                        const v2 = vacs[j];

                        if (!v1.requiredDate || !v2.requiredDate) continue;

                        const dateDiff = Math.abs(new Date(v1.requiredDate).getTime() - new Date(v2.requiredDate).getTime());
                        const daysDiff = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

                        if (daysDiff <= daysThreshold) {
                            const reasonMatch =
                                v1.reasonForRequisition?.toString() === v2.reasonForRequisition?.toString();

                            duplicates.push({
                                vacancyA: {
                                    id: v1._id,
                                    requestNumber: v1.requestNumber,
                                    createdAt: v1.createdAt,
                                    status: v1.status,
                                    department: v1.departmentName,
                                    position: v1.positionName
                                },
                                vacancyB: {
                                    id: v2._id,
                                    requestNumber: v2.requestNumber,
                                    createdAt: v2.createdAt,
                                    status: v2.status,
                                    department: v2.departmentName,
                                    position: v2.positionName
                                },
                                daysDiff,
                                reasonMatch,
                                similarSalary: this.isSalaryRangeOverlapping(v1, v2)
                            });
                        }
                    }
                }
            }

            return response(res, StatusCodes.OK, "Duplicate detection completed", {
                totalVacancies: vacancies.length,
                duplicateGroups: duplicates.length,
                duplicates,
                criteria: { daysThreshold, includeClosed }
            });
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    private isSalaryRangeOverlapping(v1: any, v2: any): boolean {
        const min1 = Math.min(v1.salaryRangeFrom || 0, v1.salaryRangeTo || 0);
        const max1 = Math.max(v1.salaryRangeFrom || 0, v1.salaryRangeTo || 0);
        const min2 = Math.min(v2.salaryRangeFrom || 0, v2.salaryRangeTo || 0);
        const max2 = Math.max(v2.salaryRangeFrom || 0, v2.salaryRangeTo || 0);

        return min1 <= max2 && max1 >= min2;
    }

    private calculateHealthScore(vacancy: any): number {
        const now = new Date();
        let score = 0;

        const requiredFields = [
            "departmentId",
            "positionId",
            "employeeTypeId",
            "gender",
            "numberOfVacancy",
            "requiredDate",
            "jobDescription",
            "salaryRangeFrom",
            "salaryRangeTo"
        ];

        const optionalFields = [
            "recruiterId",
            "priority",
            "experienceMin",
            "experienceMax",
            "workLocationType",
            "applicationDeadline",
            "requiredSkills"
        ];

        const filledRequired = requiredFields.filter((f) => vacancy[f] != null).length;
        const filledOptional = optionalFields.filter((f) => vacancy[f] != null).length;

        const completenessScore =
            (filledRequired / requiredFields.length) * 20 + (filledOptional / optionalFields.length) * 5;

        score += completenessScore;

        const referenceDate = vacancy.openedAt || vacancy.createdAt || new Date();
        const daysOpen = Math.max(
            Math.floor((now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)),
            1
        );

        const applicantCount = vacancy.applicantCount || 0;
        const applicantsPerDay = applicantCount / daysOpen;

        let velocityScore = 0;
        if (applicantsPerDay >= 5) velocityScore = 25;
        else if (applicantsPerDay >= 3) velocityScore = 20;
        else if (applicantsPerDay >= 1) velocityScore = 15;
        else if (applicantsPerDay >= 0.5) velocityScore = 10;
        else velocityScore = 5;

        score += velocityScore;

        const createdAt = vacancy.createdAt ? new Date(vacancy.createdAt) : new Date();
        const daysInCurrentStatus = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        let timeScore = 0;
        if (daysInCurrentStatus <= 7) timeScore = 20;
        else if (daysInCurrentStatus <= 14) timeScore = 15;
        else if (daysInCurrentStatus <= 30) timeScore = 10;
        else if (daysInCurrentStatus <= 60) timeScore = 5;
        else timeScore = 0;

        score += timeScore;

        const filledCount = vacancy.filledCount || 0;
        const fillRate = vacancy.numberOfVacancy > 0 ? filledCount / vacancy.numberOfVacancy : 0;
        const fillScore = fillRate >= 1 ? 20 : fillRate * 20;
        score += fillScore;

        const priorityWeight: Record<string, number> = {
            urgent: 10,
            high: 7,
            medium: 5,
            low: 3
        };

        score += priorityWeight[vacancy.priority] || 5;

        return Math.round(score);
    }

    private async updateHealthScore(vacancyId: ObjectId) {
        const vacancy = await this.vacancyRepo.findOneBy({ _id: vacancyId });
        if (!vacancy) return;

        const score = this.calculateHealthScore(vacancy);

        await this.vacancyRepo.updateOne(
            { _id: vacancyId },
            { $set: { healthScore: score } }
        );
    }

    private async getAggregatedVacancy(id: ObjectId) {
        const pipeline: any[] = [
            { $match: { _id: id, isDelete: 0 } },
            {
                $lookup: {
                    from: "departments",
                    localField: "departmentId",
                    foreignField: "_id",
                    as: "department"
                }
            },
            { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "positions",
                    localField: "positionId",
                    foreignField: "_id",
                    as: "position"
                }
            },
            { $unwind: { path: "$position", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "employment_types",
                    localField: "employeeTypeId",
                    foreignField: "_id",
                    as: "employeeType"
                }
            },
            { $unwind: { path: "$employeeType", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "adminusers",
                    localField: "reportingToId",
                    foreignField: "_id",
                    as: "reportingTo"
                }
            },
            { $unwind: { path: "$reportingTo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "adminusers",
                    localField: "recruiterId",
                    foreignField: "_id",
                    as: "recruiter"
                }
            },
            { $unwind: { path: "$recruiter", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "reason_requisitions",
                    localField: "reasonForRequisition",
                    foreignField: "_id",
                    as: "reason"
                }
            },
            { $unwind: { path: "$reason", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "projects",
                    localField: "projectCode",
                    foreignField: "_id",
                    as: "projectData"
                }
            },
            { $unwind: { path: "$projectData", preserveNullAndEmptyArrays: true } }
        ];

        const [result] = await this.vacancyRepo.aggregate(pipeline).toArray();
        return result || null;
    }
}