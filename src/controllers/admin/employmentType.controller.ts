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
import { EmploymentType } from "../../entity/EmploymentType";
import { CreateEmploymentTypeDto, UpdateEmploymentTypeDto } from "../../dto/admin/EmploymentType.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/employment-types")
@UseBefore(AuthMiddleware)
export class EmploymentTypeController {
    private empTypeRepo = AppDataSource.getMongoRepository(EmploymentType);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateEmploymentTypeDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const existing = await this.empTypeRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Employment Type already exists");
            }

            const empType = new EmploymentType();
            empType.name = body.name;
            empType.isActive = 1;
            empType.isDelete = 0;
            empType.createdBy = new ObjectId(userId);
            empType.updatedBy = new ObjectId(userId);

            const data = await this.empTypeRepo.save(empType);
            return response(res, StatusCodes.CREATED, "Employment Type created successfully", data);
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
                this.empTypeRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" }
                }),
                this.empTypeRepo.count({ where: match })
            ]);

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateEmploymentTypeDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const empType = await this.empTypeRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!empType) {
                return response(res, StatusCodes.NOT_FOUND, "Employment Type not found");
            }

            if (body.name !== undefined) {
                const existing = await this.empTypeRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Employment Type name already exists");
                }
                empType.name = body.name;
            }

            empType.updatedBy = new ObjectId(userId);
            const data = await this.empTypeRepo.save(empType);

            return response(res, StatusCodes.OK, "Employment Type updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const empType = await this.empTypeRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!empType) {
                return response(res, StatusCodes.NOT_FOUND, "Employment Type not found");
            }

            empType.isDelete = 1;
            await this.empTypeRepo.save(empType);
            return response(res, StatusCodes.OK, "Employment Type deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
