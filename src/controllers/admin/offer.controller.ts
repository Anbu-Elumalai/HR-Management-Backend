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
import { AppDataSource } from "../../data-source";
import { Offer } from "../../entity/Offer";
import { CreateOfferDto, UpdateOfferDto, UpdateOfferStatusDto } from "../../dto/admin/Offer.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { generateOfferCode } from "../../utils/id.generator";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/offers")
@UseBefore(AuthMiddleware)
export class OfferController {
    private offerRepo = AppDataSource.getMongoRepository(Offer);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateOfferDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const offer = new Offer();
            offer.offerCode = body.offerCode || await generateOfferCode();
            offer.candidateId = new ObjectId(body.candidateId);
            offer.vacancyId = new ObjectId(body.vacancyId);
            offer.departmentId = new ObjectId(body.departmentId);
            offer.reportingManager = new ObjectId(body.reportingManager);
            offer.workLocationId = new ObjectId(body.workLocationId);
            offer.workMode = body.workMode;
            offer.joiningDate = new Date(body.joiningDate);
            offer.offerExpiryDate = new Date(body.offerExpiryDate);
            offer.ctc = Number(body.ctc);
            offer.status = body.status || 'Pending Approval';
            offer.candidateResponse = body.candidateResponse || 'Pending';
            offer.termsAndConditions = body.termsAndConditions;
            offer.notes = body.notes;
            offer.salaryBreakdown = body.salaryBreakdown;

            offer.isActive = 1;
            offer.isDelete = 0;
            offer.createdBy = new ObjectId(userId);
            offer.updatedBy = new ObjectId(userId);

            const data = await this.offerRepo.save(offer);
            return response(res, StatusCodes.CREATED, "Offer created successfully", data);
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
            const postMatch: any = {};

            if (search) {
                match.$or = [
                    { offerCode: { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } }
                ];
            }

            // --- Column Filters ---
            if (query.offerCode) match.offerCode = { $regex: query.offerCode, $options: "i" };
            if (query.status) match.status = { $regex: query.status, $options: "i" };
            if (query.candidateResponse) match.candidateResponse = { $regex: query.candidateResponse, $options: "i" };
            if (query.ctc) match.ctc = Number(query.ctc);
            
            if (query.joiningDate) {
                const date = new Date(query.joiningDate);
                match.joiningDate = {
                    $gte: new Date(date.setHours(0, 0, 0, 0)),
                    $lte: new Date(date.setHours(23, 59, 59, 999))
                };
            }
            if (query.offerExpiryDate) {
                const date = new Date(query.offerExpiryDate);
                match.offerExpiryDate = {
                    $gte: new Date(date.setHours(0, 0, 0, 0)),
                    $lte: new Date(date.setHours(23, 59, 59, 999))
                };
            }
            if (query.offerDate) {
                const date = new Date(query.offerDate);
                match.createdAt = {
                    $gte: new Date(date.setHours(0, 0, 0, 0)),
                    $lte: new Date(date.setHours(23, 59, 59, 999))
                };
            }

            if (query.candidateId) {
                match.candidateId = new ObjectId(query.candidateId);
            }

            // Post-Lookup Filters
            if (query.candidateName) postMatch.candidateName = { $regex: query.candidateName, $options: "i" };
            if (query.vacancyTitle) postMatch.vacancyTitle = { $regex: query.vacancyTitle, $options: "i" };
            if (query.departmentName) postMatch.departmentName = { $regex: query.departmentName, $options: "i" };

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
                        from: "departments",
                        localField: "departmentId",
                        foreignField: "_id",
                        as: "department"
                    }
                },
                { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        offerCode: 1,
                        candidateId: 1,
                        candidateName: "$candidate.name",
                        vacancyTitle: {
                            $cond: {
                                if: { $and: ["$vacancy.requestNumber", "$position.name"] },
                                then: { $concat: ["$vacancy.requestNumber", " - ", "$position.name"] },
                                else: { $ifNull: ["$vacancy.requestNumber", { $ifNull: ["$position.name", "N/A"] }] }
                            }
                        },
                        departmentName: "$department.name",
                        ctc: 1,
                        createdAt: 1,
                        joiningDate: 1,
                        offerExpiryDate: 1,
                        candidateResponse: 1,
                        status: 1
                    }
                }
            ];

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

            const [result] = await this.offerRepo.aggregate(pipeline).toArray();
            const data = result?.data || [];
            const total = result?.meta[0]?.total || 0;

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/:id")
    async getOne(@Param("id") id: string, @Res() res: Response) {
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
                        from: "departments",
                        localField: "departmentId",
                        foreignField: "_id",
                        as: "department"
                    }
                },
                { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "reportingManager",
                        foreignField: "_id",
                        as: "reportingManagerData"
                    }
                },
                { $unwind: { path: "$reportingManagerData", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "locations",
                        localField: "workLocationId",
                        foreignField: "_id",
                        as: "workLocation"
                    }
                },
                { $unwind: { path: "$workLocation", preserveNullAndEmptyArrays: true } }
            ];

            const [offer] = await this.offerRepo.aggregate(pipeline).toArray();

            if (!offer) {
                return response(res, StatusCodes.NOT_FOUND, "Offer not found");
            }

            return response(res, StatusCodes.OK, "Offer fetched successfully", offer);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Put("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateOfferDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const offer = await this.offerRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!offer) {
                return response(res, StatusCodes.NOT_FOUND, "Offer not found");
            }

            if (body.candidateId) offer.candidateId = new ObjectId(body.candidateId);
            if (body.vacancyId) offer.vacancyId = new ObjectId(body.vacancyId);
            if (body.departmentId) offer.departmentId = new ObjectId(body.departmentId);
            if (body.reportingManager) offer.reportingManager = new ObjectId(body.reportingManager);
            if (body.workLocationId) offer.workLocationId = new ObjectId(body.workLocationId);
            if (body.workMode) offer.workMode = body.workMode;
            if (body.joiningDate) offer.joiningDate = new Date(body.joiningDate);
            if (body.offerExpiryDate) offer.offerExpiryDate = new Date(body.offerExpiryDate);
            if (body.ctc !== undefined) offer.ctc = Number(body.ctc);
            if (body.status) offer.status = body.status;
            if (body.candidateResponse) offer.candidateResponse = body.candidateResponse;
            if (body.termsAndConditions !== undefined) offer.termsAndConditions = body.termsAndConditions;
            if (body.notes !== undefined) offer.notes = body.notes;
            if (body.salaryBreakdown) offer.salaryBreakdown = body.salaryBreakdown;
            if (body.isActive !== undefined) offer.isActive = body.isActive;

            offer.updatedBy = new ObjectId(userId);
            const data = await this.offerRepo.save(offer);

            return response(res, StatusCodes.OK, "Offer updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id/status")
    async updateStatus(
        @Param("id") id: string,
        @Body() body: UpdateOfferStatusDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const offer = await this.offerRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!offer) {
                return response(res, StatusCodes.NOT_FOUND, "Offer not found");
            }

            offer.status = body.status;
            offer.updatedBy = new ObjectId(userId);

            const data = await this.offerRepo.save(offer);
            return response(res, StatusCodes.OK, "Offer status updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const offer = await this.offerRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!offer) {
                return response(res, StatusCodes.NOT_FOUND, "Offer not found");
            }

            offer.isDelete = 1;
            await this.offerRepo.save(offer);
            return response(res, StatusCodes.OK, "Offer deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get('/code/generate')
    async generateCode(@Res() res: Response) {
        try {
            const code = await generateOfferCode();
            return response(res, StatusCodes.OK, "Offer code generated successfully", code);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
