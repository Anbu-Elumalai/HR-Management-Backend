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
    Put
} from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { Candidate } from "../../entity/Candidate";
import { CreateCandidateDto, UpdateCandidateDto } from "../../dto/admin/Candidate.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { generateCandidateCode } from "../../utils/id.generator";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/candidates")
@UseBefore(AuthMiddleware)
export class CandidateController {
    private candidateRepo = AppDataSource.getMongoRepository(Candidate);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateCandidateDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const candidate = new Candidate();
            candidate.candidateCode = await generateCandidateCode();
            candidate.name = body.name;
            candidate.email = body.email;
            candidate.phone = body.phone;
            candidate.role = body.role;
            candidate.vacancyId = new ObjectId(body.vacancyId);
            candidate.departmentId = new ObjectId(body.departmentId);
            candidate.experience = body.experience;
            candidate.noticePeriod = body.noticePeriod;
            candidate.status = body.status || 'New';
            candidate.source = body.source;
            candidate.currentCompany = body.currentCompany;
            candidate.currentLocation = new ObjectId(body.currentLocation);
            candidate.currentCTC = body.currentCTC;
            candidate.expectedCTC = body.expectedCTC;
            candidate.skills = body.skills ? body.skills.split(',').map(id => new ObjectId(id.trim())) : [];
            candidate.remarks = body.remarks;
            candidate.linkedinUrl = body.linkedinUrl;
            candidate.portfolioUrl = body.portfolioUrl;
            candidate.githubUrl = body.githubUrl;
            candidate.highestQualification = body.highestQualification;
            candidate.preferredLocation = body.preferredLocation ? body.preferredLocation.split(',').map(id => new ObjectId(id.trim())) : [];
            candidate.availableToJoin = new Date(body.availableToJoin);
            candidate.dob = new Date(body.dob);
            candidate.gender = body.gender;
            candidate.address = body.address;
            candidate.resumeFile = body.resumeFile;

            candidate.createdBy = new ObjectId(userId);
            candidate.updatedBy = new ObjectId(userId);
            candidate.isActive = 1;
            candidate.isDelete = 0;

            const savedCandidate = await this.candidateRepo.save(candidate);

            return response(res, StatusCodes.CREATED, "Candidate created successfully", savedCandidate);
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

            // --- Column Filters (Direct Entity Matches) ---
            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { candidateCode: { $regex: search, $options: "i" } }
                ];
            }

            if (query.candidateId) {
                match.candidateCode = { $regex: query.candidateId, $options: "i" };
            }
            if (query.name) {
                match.name = { $regex: query.name, $options: "i" };
            }
            if (query.email) {
                match.email = { $regex: query.email, $options: "i" };
            }
            if (query.experience) {
                match.experience = { $regex: query.experience, $options: "i" };
            }
            if (query.appliedFor) {
                match.role = { $regex: query.appliedFor, $options: "i" };
            }
            if (query.status) {
                match.status = { $regex: query.status, $options: "i" };
            }
            if (query.noticePeriod) {
                match.noticePeriod = { $regex: query.noticePeriod, $options: "i" };
            }

            if (query.vacancyId) match.vacancyId = new ObjectId(query.vacancyId);
            if (query.departmentId) match.departmentId = new ObjectId(query.departmentId);
            if (query.gender) match.gender = query.gender;

            const pipeline: any[] = [
                { $match: match },
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
                        from: "departments",
                        localField: "departmentId",
                        foreignField: "_id",
                        as: "department"
                    }
                },
                { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "locations",
                        localField: "currentLocation",
                        foreignField: "_id",
                        as: "currentLocationData"
                    }
                },
                { $unwind: { path: "$currentLocationData", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "skills",
                        localField: "skills",
                        foreignField: "_id",
                        as: "skillsData"
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "preferredLocation",
                        foreignField: "_id",
                        as: "preferredLocationData"
                    }
                },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.candidateRepo.aggregate(pipeline).toArray();
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
                        from: "vacancies",
                        localField: "vacancyId",
                        foreignField: "_id",
                        as: "vacancy"
                    }
                },
                { $unwind: { path: "$vacancy", preserveNullAndEmptyArrays: true } },
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
                        from: "locations",
                        localField: "currentLocation",
                        foreignField: "_id",
                        as: "currentLocationData"
                    }
                },
                { $unwind: { path: "$currentLocationData", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "skills",
                        localField: "skills",
                        foreignField: "_id",
                        as: "skillsData"
                    }
                },
                {
                    $lookup: {
                        from: "locations",
                        localField: "preferredLocation",
                        foreignField: "_id",
                        as: "preferredLocationData"
                    }
                }
            ];

            const [data] = await this.candidateRepo.aggregate(pipeline).toArray();
            
            if (!data) {
                return response(res, StatusCodes.NOT_FOUND, "Candidate not found");
            }
            return response(res, StatusCodes.OK, "Candidate fetched successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateCandidateDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const candidate = await this.candidateRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!candidate) {
                return response(res, StatusCodes.NOT_FOUND, "Candidate not found");
            }

            if (body.name) candidate.name = body.name;
            if (body.email) candidate.email = body.email;
            if (body.phone) candidate.phone = body.phone;
            if (body.role) candidate.role = body.role;
            if (body.vacancyId) candidate.vacancyId = new ObjectId(body.vacancyId);
            if (body.departmentId) candidate.departmentId = new ObjectId(body.departmentId);
            if (body.experience) candidate.experience = body.experience;
            if (body.noticePeriod) candidate.noticePeriod = body.noticePeriod;
            if (body.status) candidate.status = body.status;
            if (body.source) candidate.source = body.source;
            if (body.currentCompany) candidate.currentCompany = body.currentCompany;
            if (body.currentLocation) candidate.currentLocation = new ObjectId(body.currentLocation);
            if (body.currentCTC) candidate.currentCTC = body.currentCTC;
            if (body.expectedCTC) candidate.expectedCTC = body.expectedCTC;
            if (body.skills !== undefined) {
                candidate.skills = body.skills ? body.skills.split(',').map(id => new ObjectId(id.trim())) : [];
            }
            if (body.remarks !== undefined) candidate.remarks = body.remarks;
            if (body.linkedinUrl !== undefined) candidate.linkedinUrl = body.linkedinUrl;
            if (body.portfolioUrl !== undefined) candidate.portfolioUrl = body.portfolioUrl;
            if (body.githubUrl !== undefined) candidate.githubUrl = body.githubUrl;
            if (body.highestQualification) candidate.highestQualification = body.highestQualification;
            if (body.preferredLocation !== undefined) {
                candidate.preferredLocation = body.preferredLocation ? body.preferredLocation.split(',').map(id => new ObjectId(id.trim())) : [];
            }
            if (body.availableToJoin) candidate.availableToJoin = new Date(body.availableToJoin);
            if (body.dob) candidate.dob = new Date(body.dob);
            if (body.gender) candidate.gender = body.gender;
            if (body.address) candidate.address = body.address;
            if (body.resumeFile) candidate.resumeFile = body.resumeFile;
            if (body.isActive !== undefined) candidate.isActive = body.isActive;

            candidate.updatedBy = new ObjectId(userId);

            const result = await this.candidateRepo.save(candidate);

            return response(res, StatusCodes.OK, "Candidate updated successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const candidate = await this.candidateRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!candidate) {
                return response(res, StatusCodes.NOT_FOUND, "Candidate not found");
            }

            candidate.isDelete = 1;
            // Optionally set active to 0 as well
            candidate.isActive = 0;
            
            await this.candidateRepo.save(candidate);
            return response(res, StatusCodes.OK, "Candidate deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get('/code/generate')
    async generateCode(@Res() res: Response) {
        try {
            const code = await generateCandidateCode();
            return response(res, StatusCodes.OK, "Candidate code generated successfully", code);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
