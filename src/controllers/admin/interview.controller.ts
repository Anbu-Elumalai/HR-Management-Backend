import {
    JsonController,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Res,
    Req,
    UseBefore,
    HttpCode,
    QueryParams,
    Put,
    Patch
} from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { Interview } from "../../entity/Interview";
import { InterviewHistory } from "../../entity/InterviewHistory";
import { CreateInterviewDto, UpdateInterviewDto, UpdateInterviewFeedbackDto, UpdateInterviewStatusDto } from "../../dto/admin/Interview.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { generateInterviewCode } from "../../utils/id.generator";
import { Candidate } from "../../entity/Candidate";
import { Vacancy } from "../../entity/Vacancy";
import { Position } from "../../entity/Position";
import { AdminUser } from "../../entity/AdminUser";
import { MailService } from "../../services/mail.service";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/interviews")
@UseBefore(AuthMiddleware)
export class InterviewController {
    private interviewRepo = AppDataSource.getMongoRepository(Interview);
    private historyRepo = AppDataSource.getMongoRepository(InterviewHistory);
    private candidateRepo = AppDataSource.getMongoRepository(Candidate);
    private vacancyRepo = AppDataSource.getMongoRepository(Vacancy);
    private positionRepo = AppDataSource.getMongoRepository(Position);
    private adminUserRepo = AppDataSource.getMongoRepository(AdminUser);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateInterviewDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const interview = new Interview();
            interview.interviewCode = await generateInterviewCode();
            interview.candidateId = new ObjectId(body.candidateId);
            interview.vacancyId = new ObjectId(body.vacancyId);
            interview.roundId = new ObjectId(body.round);
            interview.roundNumber = body.roundNumber || 1;
            interview.level = body.level;
            interview.type = body.type;
            interview.mode = body.mode;
            interview.scheduleDate = new Date(body.scheduleDate);
            interview.time = body.time;
            interview.duration = body.duration;
            interview.status = body.status || 'Scheduled';
            interview.email = body.email;
            interview.phone = body.phone;
            interview.timezone = body.timezone;
            interview.platform = body.platform;
            interview.location = body.location;
            interview.notes = body.notes;
            interview.candidateInstructions = body.candidateInstructions;
            interview.interviewResult = 'Pending';
            interview.panelMembers = body.panelMembers.map(member => ({
                interviewerType: member.interviewerType,
                employeeId: new ObjectId(member.employeeId),
                panelRole: member.panelRole
            }));

            interview.createdBy = new ObjectId(userId);
            interview.updatedBy = new ObjectId(userId);
            interview.isActive = 1;
            interview.isDelete = 0;

            const savedInterview = await this.interviewRepo.save(interview);

            // --- Send Emails asynchronously ---
            try {
                // Fetch basic info for emails
                const candidate = await this.candidateRepo.findOneBy({ _id: interview.candidateId });
                const vacancy = await this.vacancyRepo.findOneBy({ _id: interview.vacancyId });
                const position = vacancy ? await this.positionRepo.findOneBy({ _id: vacancy.positionId }) : null;
                const positionName = position?.name || "Unknown Role";

                // 1. Send to Candidate
                if (candidate?.email) {
                    await MailService.sendInterviewCandidateEmail({
                        name: candidate.name,
                        email: candidate.email,
                        interviewId: savedInterview.interviewCode,
                        vacancy: positionName,
                        date: body.scheduleDate,
                        time: body.time,
                        platform: body.platform,
                        location: body.location,
                        duration: body.duration
                    });
                }

                // 2. Send to Panel Members
                for (const member of interview.panelMembers) {
                    const panelMemberUser = await this.adminUserRepo.findOneBy({ _id: new ObjectId(member.employeeId) });
                    if (panelMemberUser?.email) {
                        await MailService.sendInterviewInterviewerEmail(panelMemberUser.email, {
                            interviewerName: panelMemberUser.name,
                            candidateName: candidate?.name || "Candidate",
                            vacancy: positionName,
                            date: body.scheduleDate,
                            time: body.time,
                            platform: body.platform,
                            location: body.location
                        });
                    }
                }
            } catch (mailError) {
                console.error("Failed to send some/all notification emails:", mailError);
                // We don't block the controller response if emails fail, but we log it.
            }

            // Save initial history record
            await this.historyRepo.save({
                interviewId: savedInterview.id,
                status: savedInterview.status,
                feedback: null,
                updatedBy: new ObjectId(userId)
            });

            // Update Candidate status to 'Interview'
            const candidate = await this.candidateRepo.findOneBy({ _id: interview.candidateId });
            if (candidate && candidate.isDelete === 0) {
                candidate.status = "Interview";
                await this.candidateRepo.save(candidate);
            }

            return response(res, StatusCodes.CREATED, "Interview scheduled successfully", savedInterview);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/")
    async list(
        @QueryParams() query: any,
        @Req() _req: Request,
        @Res() res: Response
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.max(Number(query.limit) || 10, 1);
            const search = query.search?.toString();

            const match: any = { isDelete: 0 };

            // General Search
            if (search) {
                match.$or = [
                    { interviewCode: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } }
                ];
            }

            // Specific Filters
            if (query.status) {
                match.status = { $regex: query.status, $options: "i" };
            }
            if (query.type) {
                match.type = { $regex: query.type, $options: "i" };
            }
            if (query.mode) {
                match.mode = { $regex: query.mode, $options: "i" };
            }
            if (query.feedback) {
                match.feedback = { $regex: query.feedback, $options: "i" };
            }
            if (query.interviewId) {
                match.interviewCode = { $regex: query.interviewId, $options: "i" };
            }

            // Date Range Filtering
            if (query.fromDate || query.toDate) {
                match.scheduleDate = {};
                if (query.fromDate) {
                    const from = new Date(query.fromDate);
                    if (!isNaN(from.getTime())) {
                        match.scheduleDate.$gte = from;
                    }
                }
                if (query.toDate) {
                    const to = new Date(query.toDate);
                    if (!isNaN(to.getTime())) {
                        // Set to end of day
                        to.setHours(23, 59, 59, 999);
                        match.scheduleDate.$lte = to;
                    }
                }
            } else if (query.date) {
                const searchDate = new Date(query.date);
                if (!isNaN(searchDate.getTime())) {
                    const start = new Date(searchDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(searchDate);
                    end.setHours(23, 59, 59, 999);
                    match.scheduleDate = { $gte: start, $lte: end };
                }
            }

            // Exact ID Filters
            if (query.candidateId && ObjectId.isValid(query.candidateId)) {
                match.candidateId = new ObjectId(query.candidateId);
            }
            if (query.vacancyId && ObjectId.isValid(query.vacancyId)) {
                match.vacancyId = new ObjectId(query.vacancyId);
            }
            if (query.roundId && ObjectId.isValid(query.roundId)) {
                match.roundId = new ObjectId(query.roundId);
            }

            const pipeline: any[] = [
                { $match: match },
                {
                    $lookup: {
                        from: "candidates",
                        localField: "candidateId",
                        foreignField: "_id",
                        as: "candidate"
                    }
                },
                { $unwind: { path: "$candidate", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "vacancies",
                        localField: "vacancyId",
                        foreignField: "_id",
                        as: "vacancy"
                    }
                },
                { $unwind: { path: "$vacancy", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "positions",
                        localField: "vacancy.positionId",
                        foreignField: "_id",
                        as: "position"
                    }
                },
                { $unwind: { path: "$position", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "interview_rounds",
                        localField: "roundId",
                        foreignField: "_id",
                        as: "roundData"
                    }
                },
                { $unwind: { path: "$roundData", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "panelMembers.employeeId",
                        foreignField: "_id",
                        as: "panelAdminInfo"
                    }
                },
                {
                    $lookup: {
                        from: "members", // Or "employees" if that's the collection
                        localField: "panelMembers.employeeId",
                        foreignField: "_id",
                        as: "panelEmployeeInfo"
                    }
                },
                // Post-Lookup Filters
                ...(query.candidate || query.position || query.round || query.interviewer ? [
                    {
                        $match: {
                            $and: [
                                query.candidate ? {
                                    $or: [
                                        { "candidate.name": { $regex: query.candidate, $options: "i" } },
                                        { "candidate.candidateCode": { $regex: query.candidate, $options: "i" } }
                                    ]
                                } : {},
                                query.position ? { "position.name": { $regex: query.position, $options: "i" } } : {},
                                query.round ? { "roundData.name": { $regex: query.round, $options: "i" } } : {},
                                query.interviewer ? {
                                    $or: [
                                        { "panelAdminInfo.name": { $regex: query.interviewer, $options: "i" } },
                                        { "panelEmployeeInfo.name": { $regex: query.interviewer, $options: "i" } }
                                    ]
                                } : {}
                            ].filter(cond => Object.keys(cond).length > 0)
                        }
                    }
                ] : []),
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        data: [
                            { $skip: page * limit },
                            { $limit: limit },
                            {
                                $project: {
                                    id: "$_id",
                                    interviewCode: 1,
                                    candidateName: "$candidate.name",
                                    candidateCode: "$candidate.candidateCode",
                                    appliedFor: "$position.name",
                                    round: "$roundData.name",
                                    roundNumber: 1,
                                    interviewers: {
                                        $map: {
                                            input: "$panelMembers",
                                            as: "member",
                                            in: {
                                                $cond: {
                                                    if: { $eq: ["$$member.interviewerType", "Admins Users"] },
                                                    then: {
                                                        $let: {
                                                            vars: {
                                                                admin: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: "$panelAdminInfo",
                                                                                as: "info",
                                                                                cond: { $eq: ["$$info._id", "$$member.employeeId"] }
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                }
                                                            },
                                                            in: "$$admin.name"
                                                        }
                                                    },
                                                    else: {
                                                        // Fallback to employee/member collection
                                                        $let: {
                                                            vars: {
                                                                employee: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: "$panelEmployeeInfo",
                                                                                as: "info",
                                                                                cond: { $eq: ["$$info._id", "$$member.employeeId"] }
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                }
                                                            },
                                                            in: "$$employee.name"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    dateTime: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDate" } }, " ", "$time"] },
                                    scheduleDate: 1,
                                    time: 1,
                                    type: 1,
                                    mode: 1,
                                    status: 1,
                                    feedback: 1
                                }
                            }
                        ],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.interviewRepo.aggregate(pipeline).toArray();
            const data = result?.data || [];
            const total = result?.meta[0]?.total || 0;

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/:id")
    async getOne(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            const pipeline: any[] = [
                { $match: { _id: new ObjectId(id), isDelete: 0 } },
                {
                    $lookup: {
                        from: "candidates",
                        localField: "candidateId",
                        foreignField: "_id",
                        as: "candidate"
                    }
                },
                { $unwind: { path: "$candidate", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "vacancies",
                        localField: "vacancyId",
                        foreignField: "_id",
                        as: "vacancy"
                    }
                },
                { $unwind: { path: "$vacancy", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "interview_rounds",
                        localField: "roundId",
                        foreignField: "_id",
                        as: "roundData"
                    }
                },
                { $unwind: { path: "$roundData", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "positions",
                        localField: "vacancy.positionId",
                        foreignField: "_id",
                        as: "position"
                    }
                },
                { $unwind: { path: "$position", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "panelMembers.employeeId",
                        foreignField: "_id",
                        as: "panelAdminInfo"
                    }
                },
                {
                    $lookup: {
                        from: "members",
                        localField: "panelMembers.employeeId",
                        foreignField: "_id",
                        as: "panelEmployeeInfo"
                    }
                },
                {
                    $lookup: {
                        from: "interview_history",
                        let: { intId: "$_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$interviewId", "$$intId"] } } },
                            {
                                $lookup: {
                                    from: "adminusers",
                                    localField: "updatedBy",
                                    foreignField: "_id",
                                    as: "updater"
                                }
                            },
                            { $unwind: { path: "$updater", preserveNullAndEmptyArrays: true } },
                            { $sort: { createdAt: -1 } },
                            {
                                $project: {
                                    id: "$_id",
                                    status: 1,
                                    interviewStatus: 1,
                                    interviewResult: 1,
                                    feedback: 1,
                                    reason: 1,
                                    updatedByName: "$updater.name",
                                    createdAt: 1
                                }
                            }
                        ],
                        as: "history"
                    }
                },
                {
                    $project: {
                        id: "$_id",
                        interviewCode: 1,
                        candidateName: "$candidate.name",
                        candidateCode: "$candidate.candidateCode",
                        appliedPosition: "$position.name",
                        currentStatus: "$status",
                        interviewRound: "$roundData.name",
                        assessmentLevel: "$level",
                        scheduledDate: 1,
                        scheduledTime: "$time",
                        duration: 1,
                        timezone: 1,
                        interviewMode: "$mode",
                        meetingLink: "$platform",
                        venueAddress: "$location",
                        notes: 1,
                        candidateInstructions: 1,
                        feedback: 1,
                        interviewStatus: 1, // Specific status
                        interviewResult: 1,
                        history: 1,
                        panelMembers: {
                            $map: {
                                input: "$panelMembers",
                                as: "member",
                                in: {
                                    interviewerType: "$$member.interviewerType",
                                    employeeId: "$$member.employeeId",
                                    panelRole: "$$member.panelRole",
                                    name: {
                                        $cond: {
                                            if: { $eq: ["$$member.interviewerType", "Admins Users"] },
                                            then: {
                                                $let: {
                                                    vars: {
                                                        admin: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: "$panelAdminInfo",
                                                                        as: "info",
                                                                        cond: { $eq: ["$$info._id", "$$member.employeeId"] }
                                                                    }
                                                                },
                                                                0
                                                            ]
                                                        }
                                                    },
                                                    in: "$$admin.name"
                                                }
                                            },
                                            else: {
                                                $let: {
                                                    vars: {
                                                        employee: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: "$panelEmployeeInfo",
                                                                        as: "info",
                                                                        cond: { $eq: ["$$info._id", "$$member.employeeId"] }
                                                                    }
                                                                },
                                                                0
                                                            ]
                                                        }
                                                    },
                                                    in: "$$employee.name"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            const [data] = await this.interviewRepo.aggregate(pipeline).toArray();

            if (!data) {
                return response(res, StatusCodes.NOT_FOUND, "Interview not found");
            }
            return response(res, StatusCodes.OK, "Interview fetched successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateInterviewDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const interview = await this.interviewRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interview) {
                return response(res, StatusCodes.NOT_FOUND, "Interview not found");
            }

            if (body.candidateId) {
                const newCandidateId = new ObjectId(body.candidateId);
                // If candidate ID is changing, update both old and new candidate status as needed
                // But for simplicity, we just ensure the new candidate is marked as 'Interview'
                const candidate = await this.candidateRepo.findOneBy({ _id: newCandidateId });
                if (candidate && candidate.isDelete === 0) {
                    candidate.status = "Interview";
                    await this.candidateRepo.save(candidate);
                }
                interview.candidateId = newCandidateId;
            }
            if (body.vacancyId) interview.vacancyId = new ObjectId(body.vacancyId);
            if (body.round) interview.roundId = new ObjectId(body.round);
            if (body.roundNumber !== undefined) interview.roundNumber = body.roundNumber;
            if (body.level) interview.level = body.level;
            if (body.type) interview.type = body.type;
            if (body.mode) interview.mode = body.mode;
            if (body.scheduleDate) interview.scheduleDate = new Date(body.scheduleDate);
            if (body.time) interview.time = body.time;
            if (body.duration) interview.duration = body.duration;
            if (body.status) interview.status = body.status;
            if (body.email) interview.email = body.email;
            if (body.phone) interview.phone = body.phone;
            if (body.timezone) interview.timezone = body.timezone;
            if (body.platform) interview.platform = body.platform;
            if (body.location !== undefined) interview.location = body.location;
            if (body.notes !== undefined) interview.notes = body.notes;
            if (body.candidateInstructions !== undefined) interview.candidateInstructions = body.candidateInstructions;
            if (body.interviewResult) interview.interviewResult = body.interviewResult;

            let historyRecordNeeded = false;
            if (body.status && body.status !== interview.status) {
                interview.status = body.status;
                historyRecordNeeded = true;
            }
            if (body.feedback && body.feedback !== interview.feedback) {
                interview.feedback = body.feedback;
                historyRecordNeeded = true;
            }

            if (body.panelMembers) {
                interview.panelMembers = body.panelMembers.map(member => ({
                    interviewerType: member.interviewerType,
                    employeeId: new ObjectId(member.employeeId),
                    panelRole: member.panelRole
                }));
            }
            if (body.isActive !== undefined) interview.isActive = body.isActive;

            interview.updatedBy = new ObjectId(userId);

            const result = await this.interviewRepo.save(interview);

            // Save history record
            if (historyRecordNeeded) {
                await this.historyRepo.save({
                    interviewId: interview.id,
                    status: interview.status,
                    feedback: interview.feedback,
                    updatedBy: new ObjectId(userId)
                });
            }

            return response(res, StatusCodes.OK, "Interview updated successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id/status")
    async updateStatus(
        @Param("id") id: string,
        @Body() body: UpdateInterviewStatusDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const interview = await this.interviewRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interview) {
                return response(res, StatusCodes.NOT_FOUND, "Interview not found");
            }

            interview.status = body.status;
            if (body.scheduleDate) interview.scheduleDate = new Date(body.scheduleDate);
            if (body.time) interview.time = body.time;

            interview.updatedBy = new ObjectId(userId);
            await this.interviewRepo.save(interview);

            // Record history
            await this.historyRepo.save({
                interviewId: interview.id,
                status: interview.status,
                feedback: interview.feedback,
                reason: body.reason, // Track the reason here
                updatedBy: new ObjectId(userId)
            });

            return response(res, StatusCodes.OK, "Interview status updated successfully", interview);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id/feedback")
    async updateFeedback(
        @Param("id") id: string,
        @Body() body: UpdateInterviewFeedbackDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const interview = await this.interviewRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interview) {
                return response(res, StatusCodes.NOT_FOUND, "Interview not found");
            }

            interview.feedback = body.feedback;
            interview.interviewResult = body.interviewResult;

            interview.updatedBy = new ObjectId(userId);
            await this.interviewRepo.save(interview);

            // Update Candidate status based on interview result
            const candidate = await this.candidateRepo.findOneBy({ _id: interview.candidateId });
            if (candidate && candidate.isDelete === 0) {
                const result = body.interviewResult?.toLowerCase();
                if (result === 'rejected' || result === 'reject' || result === 'Failed') {
                    candidate.status = "Rejected";
                } else if (result === 'offer sent') {
                    candidate.status = "Offer Sent";
                } else if (result === 'hired' || result === 'hire') {
                    candidate.status = "Hired";
                } else if (result === 'on hold') {
                    candidate.status = "On Hold";
                } else if (result === 'passed') {
                    candidate.status = "Passed";
                } else if (result === 'failed') {
                    candidate.status = "Failed";
                } else if (result === 'move to offer') {
                    candidate.status = "Move to Offer";
                } else {
                    candidate.status = "Interview";
                }
                await this.candidateRepo.save(candidate);
            }

            // Record history
            await this.historyRepo.save({
                interviewId: interview.id,
                status: interview.status,
                feedback: interview.feedback,
                interviewResult: interview.interviewResult,
                updatedBy: new ObjectId(userId)
            });

            return response(res, StatusCodes.OK, "Interview feedback updated successfully", interview);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/:id/history")
    async getHistory(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            const pipeline: any[] = [
                { $match: { interviewId: new ObjectId(id) } },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "updatedBy",
                        foreignField: "_id",
                        as: "updater"
                    }
                },
                { $unwind: { path: "$updater", preserveNullAndEmptyArrays: true } },
                { $sort: { createdAt: -1 } },
                {
                    $project: {
                        id: "$_id",
                        status: 1,
                        feedback: 1,
                        reason: 1,
                        updatedByName: "$updater.name",
                        createdAt: 1
                    }
                }
            ];

            const data = await this.historyRepo.aggregate(pipeline).toArray();
            return response(res, StatusCodes.OK, "Interview history fetched successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const interview = await this.interviewRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interview) {
                return response(res, StatusCodes.NOT_FOUND, "Interview not found");
            }

            interview.isDelete = 1;
            interview.isActive = 0;

            await this.interviewRepo.save(interview);
            return response(res, StatusCodes.OK, "Interview deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get('/code/generate')
    async generateCode(@Res() res: Response) {
        try {
            const code = await generateInterviewCode();
            return response(res, StatusCodes.OK, "Interview code generated successfully", code);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
