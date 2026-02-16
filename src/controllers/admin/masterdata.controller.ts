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
import { MasterData } from "../../entity/MasterData";
import { CreateMasterDataDto, UpdateMasterDataDto } from "../../dto/admin/MasterData.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/master-data/categories")
@UseBefore(AuthMiddleware)
export class MasterDataController {
    private masterDataRepo = AppDataSource.getMongoRepository(MasterData);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateMasterDataDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if name already exists
            const existing = await this.masterDataRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Master data with this name already exists");
            }

            const masterData = new MasterData();
            masterData.name = body.name;
            masterData.isActive = 1;
            masterData.isDelete = 0;
            masterData.createdBy = new ObjectId(userId);
            masterData.updatedBy = new ObjectId(userId);

            const data = await this.masterDataRepo.save(masterData);
            return response(res, StatusCodes.CREATED, "Master data created successfully", data);
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
                this.masterDataRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" }
                }),
                this.masterDataRepo.count({ where: match })
            ]);

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateMasterDataDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const masterData = await this.masterDataRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!masterData) {
                return response(res, StatusCodes.NOT_FOUND, "Master data not found");
            }

            if (body.name !== undefined) {
                // Check if name already exists (excluding current id)
                const existing = await this.masterDataRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Master data name already exists");
                }
                masterData.name = body.name;
            }

            if (body.isActive !== undefined) {
                masterData.isActive = body.isActive;
            }

            masterData.updatedBy = new ObjectId(userId);
            const data = await this.masterDataRepo.save(masterData);

            return response(res, StatusCodes.OK, "Master data updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const masterData = await this.masterDataRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!masterData) {
                return response(res, StatusCodes.NOT_FOUND, "Master data not found");
            }

            masterData.isDelete = 1;
            await this.masterDataRepo.save(masterData);
            return response(res, StatusCodes.OK, "Master data deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
