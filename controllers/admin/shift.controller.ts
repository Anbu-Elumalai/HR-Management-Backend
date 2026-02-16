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
import { Shift } from "../../entity/Shift";
import { CreateShiftDto, UpdateShiftDto } from "../../dto/admin/Shift.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/shifts")
@UseBefore(AuthMiddleware)
export class ShiftController {
    private shiftRepo = AppDataSource.getMongoRepository(Shift);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateShiftDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const existing = await this.shiftRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Shift already exists");
            }

            const shift = new Shift();
            shift.name = body.name;
            shift.isActive = 1;
            shift.isDelete = 0;
            shift.createdBy = new ObjectId(userId);
            shift.updatedBy = new ObjectId(userId);

            const data = await this.shiftRepo.save(shift);
            return response(res, StatusCodes.CREATED, "Shift created successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/")
    async list(
        @QueryParams() query: any,
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
                this.shiftRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" }
                }),
                this.shiftRepo.count({ where: match })
            ]);

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateShiftDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const shift = await this.shiftRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!shift) {
                return response(res, StatusCodes.NOT_FOUND, "Shift not found");
            }

            if (body.name !== undefined) {
                const existing = await this.shiftRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Shift name already exists");
                }
                shift.name = body.name;
            }

            shift.updatedBy = new ObjectId(userId);
            const data = await this.shiftRepo.save(shift);

            return response(res, StatusCodes.OK, "Shift updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const shift = await this.shiftRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!shift) {
                return response(res, StatusCodes.NOT_FOUND, "Shift not found");
            }

            shift.isDelete = 1;
            await this.shiftRepo.save(shift);
            return response(res, StatusCodes.OK, "Shift deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
