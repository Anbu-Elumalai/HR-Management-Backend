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
import { Location } from "../../entity/Location";
import { CreateLocationDto, UpdateLocationDto } from "../../dto/admin/Location.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/locations")
@UseBefore(AuthMiddleware)
export class LocationController {
    private locationRepo = AppDataSource.getMongoRepository(Location);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateLocationDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if name already exists
            const existing = await this.locationRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Location already exists");
            }

            const location = new Location();
            location.name = body.name;
            location.isActive = 1;
            location.isDelete = 0;
            location.createdBy = new ObjectId(userId);
            location.updatedBy = new ObjectId(userId);

            const data = await this.locationRepo.save(location);
            return response(res, StatusCodes.CREATED, "Location created successfully", data);
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
                this.locationRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" }
                }),
                this.locationRepo.count({ where: match })
            ]);

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateLocationDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const location = await this.locationRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!location) {
                return response(res, StatusCodes.NOT_FOUND, "Location not found");
            }

            if (body.name !== undefined) {
                // Check if name already exists (excluding current id)
                const existing = await this.locationRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Location name already exists");
                }
                location.name = body.name;
            }

            location.updatedBy = new ObjectId(userId);
            const data = await this.locationRepo.save(location);

            return response(res, StatusCodes.OK, "Location updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const location = await this.locationRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!location) {
                return response(res, StatusCodes.NOT_FOUND, "Location not found");
            }

            location.isDelete = 1;
            await this.locationRepo.save(location);
            return response(res, StatusCodes.OK, "Location deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
