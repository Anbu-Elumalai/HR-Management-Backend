
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
import { ReasonRequisition } from "../../entity/ReasonRequisition";
import { CreateReasonRequisitionDto, UpdateReasonRequisitionDto } from "../../dto/admin/ReasonRequisition.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/reason-requisition")
@UseBefore(AuthMiddleware)
export class ReasonRequisitionController {
    private reasonRepo = AppDataSource.getMongoRepository(ReasonRequisition);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateReasonRequisitionDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if name already exists
            const existing = await this.reasonRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Reason already exists");
            }

            const reason = new ReasonRequisition();
            reason.name = body.name;
            reason.isActive = 1;
            reason.isDelete = 0;
            reason.createdBy = new ObjectId(userId);
            reason.updatedBy = new ObjectId(userId);

            const data = await this.reasonRepo.save(reason);
            return response(res, StatusCodes.CREATED, "Reason created successfully", data);
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

            if (search) {
                match.name = { $regex: search, $options: "i" };
            }

            if (query.isActive !== undefined) {
                match.isActive = (query.isActive === "true" || query.isActive === "1" || query.isActive === 1) ? 1 : 0;
            }

            const [data, total] = await Promise.all([
                this.reasonRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" as any }
                }),
                this.reasonRepo.count({ where: match })
            ]);

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
            if (!ObjectId.isValid(id)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid ID format");
            }
            const reason = await this.reasonRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!reason) {
                return response(res, StatusCodes.NOT_FOUND, "Reason not found");
            }
            return response(res, StatusCodes.OK, "Reason fetched successfully", reason);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }


    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateReasonRequisitionDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            if (!ObjectId.isValid(id)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid ID format");
            }
            const reason = await this.reasonRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!reason) {
                return response(res, StatusCodes.NOT_FOUND, "Reason not found");
            }

            if (body.name !== undefined) {
                // Check if name already exists (excluding current id)
                const existing = await this.reasonRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Reason name already exists");
                }
                reason.name = body.name;
            }

            reason.updatedBy = new ObjectId(userId);
            const data = await this.reasonRepo.save(reason);

            return response(res, StatusCodes.OK, "Reason updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            if (!ObjectId.isValid(id)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid ID format");
            }
            const reason = await this.reasonRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!reason) {
                return response(res, StatusCodes.NOT_FOUND, "Reason not found");
            }

            reason.isDelete = 1;
            await this.reasonRepo.save(reason);
            return response(res, StatusCodes.OK, "Reason deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
