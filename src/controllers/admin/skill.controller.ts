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
import { Skill } from "../../entity/Skill";
import { CreateSkillDto, UpdateSkillDto } from "../../dto/admin/Skill.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/skills")
@UseBefore(AuthMiddleware)
export class SkillController {
    private skillRepo = AppDataSource.getMongoRepository(Skill);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateSkillDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if name already exists
            const existing = await this.skillRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Skill already exists");
            }

            const skill = new Skill();
            skill.name = body.name;
            skill.isActive = 1;
            skill.isDelete = 0;
            skill.createdBy = new ObjectId(userId);
            skill.updatedBy = new ObjectId(userId);

            const data = await this.skillRepo.save(skill);
            return response(res, StatusCodes.CREATED, "Skill created successfully", data);
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
                this.skillRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" }
                }),
                this.skillRepo.count({ where: match })
            ]);

            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateSkillDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const skill = await this.skillRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!skill) {
                return response(res, StatusCodes.NOT_FOUND, "Skill not found");
            }

            if (body.name !== undefined) {
                // Check if name already exists (excluding current id)
                const existing = await this.skillRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Skill name already exists");
                }
                skill.name = body.name;
            }

            skill.updatedBy = new ObjectId(userId);
            const data = await this.skillRepo.save(skill);

            return response(res, StatusCodes.OK, "Skill updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const skill = await this.skillRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!skill) {
                return response(res, StatusCodes.NOT_FOUND, "Skill not found");
            }

            skill.isDelete = 1;
            await this.skillRepo.save(skill);
            return response(res, StatusCodes.OK, "Skill deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
