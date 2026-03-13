
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
    QueryParams
} from "routing-controllers";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { Vacancy } from "../../entity/Vacancy";
import { CreateVacancyDto, UpdateVacancyDto } from "../../dto/admin/Vacancy.dto";
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
    async create(
        @Body() body: CreateVacancyDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const vacancy = new Vacancy();
            vacancy.requestNumber = await generateVacancyRequestNumber();
            vacancy.requisitionDate = new Date(body.requisitionDate);
            vacancy.departmentId = new ObjectId(body.departmentId);
            vacancy.positionId = new ObjectId(body.positionId);
            vacancy.reportingToName = body.reportingToName;
            vacancy.reportingCode = body.reportingCode;
            vacancy.employeeTypeId = new ObjectId(body.employeeTypeId);
            vacancy.gender = body.gender;
            vacancy.numberOfVacancy = body.numberOfVacancy;
            vacancy.requiredDate = new Date(body.requiredDate);
            vacancy.preferredEducation = body.preferredEducation;
            vacancy.qualification = body.qualification;
            vacancy.reasonForRequisition = body.reasonForRequisition;
            vacancy.salaryRangeFrom = body.salaryRangeFrom;
            vacancy.salaryRangeTo = body.salaryRangeTo;
            vacancy.projectCode = body.projectCode ? new ObjectId(body.projectCode) : null;
            vacancy.jobDescription = body.jobDescription;
            vacancy.createdBy = new ObjectId(userId);
            vacancy.updatedBy = new ObjectId(userId);
            vacancy.isActive = 1;
            vacancy.isDelete = 0;

            const files = (req as any).files;
            if (files && files.file) {
                const uploadedFile = files.file;
                const fileName = `${Date.now()}_${uploadedFile.name}`;
                const fileFolder = "vacancies";

                await imageService.fileUpload(uploadedFile, fileFolder, fileName);

                vacancy.file = {
                    fileName: fileName,
                    path: `public/${fileFolder}/${fileName}`,
                    originalName: uploadedFile.name
                };
            }

            const savedVacancy = await this.vacancyRepo.save(vacancy);

            return response(res, StatusCodes.CREATED, "Vacancy created successfully", savedVacancy);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/")
    async list(
        @QueryParams() query: any,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.max(Number(query.limit) || 10, 1);
            const search = query.search?.toString();

            const match: any = { isDelete: 0 };

            if (search) {
                match.$or = [
                    { requestNumber: { $regex: search, $options: "i" } },
                    { reportingToName: { $regex: search, $options: "i" } },
                    { reportingCode: { $regex: search, $options: "i" } },
                    { projectCode: { $regex: search, $options: "i" } },
                    { projectName: { $regex: search, $options: "i" } }
                ];
            }

            if (query.departmentId) match.departmentId = new ObjectId(query.departmentId);
            if (query.positionId) match.positionId = new ObjectId(query.positionId);
            if (query.employeeTypeId) match.employeeTypeId = new ObjectId(query.employeeTypeId);
            if (query.gender) match.gender = query.gender;

            if (query.status) {
                const status = query.status.toLowerCase();
                if (status === "active") match.isActive = 1;
                else if (status === "inactive") match.isActive = 0;
            }
            if (query.isActive !== undefined && !query.status) {
                match.isActive = (query.isActive === "true" || query.isActive === "1" || query.isActive === 1) ? 1 : 0;
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
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.vacancyRepo.aggregate(pipeline).toArray();
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
            const data = await this.getAggregatedVacancy(new ObjectId(id));
            if (!data) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }
            return response(res, StatusCodes.OK, "Vacancy fetched successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
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

            if (body.requisitionDate) vacancy.requisitionDate = new Date(body.requisitionDate);
            if (body.departmentId) vacancy.departmentId = new ObjectId(body.departmentId);
            if (body.positionId) vacancy.positionId = new ObjectId(body.positionId);
            if (body.reportingToName) vacancy.reportingToName = body.reportingToName;
            if (body.reportingCode) vacancy.reportingCode = body.reportingCode;
            if (body.employeeTypeId) vacancy.employeeTypeId = new ObjectId(body.employeeTypeId);
            if (body.gender) vacancy.gender = body.gender;
            if (body.numberOfVacancy) vacancy.numberOfVacancy = body.numberOfVacancy;
            if (body.requiredDate) vacancy.requiredDate = new Date(body.requiredDate);
            if (body.preferredEducation) vacancy.preferredEducation = body.preferredEducation;
            if (body.qualification) vacancy.qualification = body.qualification;
            if (body.reasonForRequisition) vacancy.reasonForRequisition = body.reasonForRequisition;
            if (body.salaryRangeFrom) vacancy.salaryRangeFrom = body.salaryRangeFrom;
            if (body.salaryRangeTo) vacancy.salaryRangeTo = body.salaryRangeTo;
            if (body.projectCode !== undefined) {
                vacancy.projectCode = body.projectCode ? new ObjectId(body.projectCode) : null;
            }
            if (body.jobDescription) vacancy.jobDescription = body.jobDescription;
            if (body.isActive !== undefined) vacancy.isActive = body.isActive;

            const files = (req as any).files;
            if (files && files.file) {
                const uploadedFile = files.file;
                const fileName = `${Date.now()}_${uploadedFile.name}`;
                const fileFolder = "vacancies";

                await imageService.fileUpload(uploadedFile, fileFolder, fileName, vacancy.file?.fileName);

                vacancy.file = {
                    fileName: fileName,
                    path: `public/${fileFolder}/${fileName}`,
                    originalName: uploadedFile.name
                };
            }

            vacancy.updatedBy = new ObjectId(userId);

            const result = await this.vacancyRepo.save(vacancy);

            // const data = await this.getAggregatedVacancy(new ObjectId(id));
            return response(res, StatusCodes.OK, "Vacancy updated successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const vacancy = await this.vacancyRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!vacancy) {
                return response(res, StatusCodes.NOT_FOUND, "Vacancy not found");
            }

            vacancy.isDelete = 1;
            await this.vacancyRepo.save(vacancy);
            return response(res, StatusCodes.OK, "Vacancy deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
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
            { $unwind: { path: "$employeeType", preserveNullAndEmptyArrays: true } }
        ];

        const [result] = await this.vacancyRepo.aggregate(pipeline).toArray();
        return result || null;
    }
}
