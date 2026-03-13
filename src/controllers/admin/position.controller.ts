
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
import { Position } from "../../entity/Position";
import { CreatePositionDto, UpdatePositionDto } from "../../dto/admin/Position.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/positions")
@UseBefore(AuthMiddleware)
export class PositionController {
    private positionRepo = AppDataSource.getMongoRepository(Position);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreatePositionDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if name already exists
            const existing = await this.positionRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Position already exists");
            }

            const position = new Position();
            position.name = body.name;
            position.isActive = 1;
            position.isDelete = 0;
            position.createdBy = new ObjectId(userId);
            position.updatedBy = new ObjectId(userId);

            const data = await this.positionRepo.save(position);
            return response(res, StatusCodes.CREATED, "Position created successfully", data);
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
                this.positionRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" as any }
                }),
                this.positionRepo.count({ where: match })
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
            const position = await this.positionRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!position) {
                return response(res, StatusCodes.NOT_FOUND, "Position not found");
            }
            return response(res, StatusCodes.OK, "Position fetched successfully", position);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }


    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdatePositionDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            if (!ObjectId.isValid(id)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid ID format");
            }
            const position = await this.positionRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!position) {
                return response(res, StatusCodes.NOT_FOUND, "Position not found");
            }

            if (body.name !== undefined) {
                // Check if name already exists (excluding current id)
                const existing = await this.positionRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Position name already exists");
                }
                position.name = body.name;
            }

            position.updatedBy = new ObjectId(userId);
            const data = await this.positionRepo.save(position);

            return response(res, StatusCodes.OK, "Position updated successfully", data);
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
            const position = await this.positionRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!position) {
                return response(res, StatusCodes.NOT_FOUND, "Position not found");
            }

            position.isDelete = 1;
            await this.positionRepo.save(position);
            return response(res, StatusCodes.OK, "Position deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
