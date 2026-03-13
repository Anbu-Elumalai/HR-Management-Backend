
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
import { Project } from "../../entity/Project";
import { CreateProjectDto, UpdateProjectDto } from "../../dto/admin/Project.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { generateProjectCode } from "../../utils/id.generator";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/projects")
@UseBefore(AuthMiddleware)
export class ProjectController {
    private projectRepo = AppDataSource.getMongoRepository(Project);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateProjectDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            const project = new Project();
            project.code = await generateProjectCode();
            project.name = body.name;
            project.description = body.description || "";
            project.startDate = new Date(body.startDate);
            project.endDate = new Date(body.endDate);
            project.status = body.status;
            project.manager = body.manager;
            project.location = body.location;
            project.createdBy = new ObjectId(userId);
            project.updatedBy = new ObjectId(userId);
            project.isActive = 1;
            project.isDelete = 0;

            const savedProject = await this.projectRepo.save(project);

            return response(res, StatusCodes.CREATED, "Project created successfully", savedProject);
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
                    { name: { $regex: search, $options: "i" } },
                    { code: { $regex: search, $options: "i" } },
                    { manager: { $regex: search, $options: "i" } },
                    { location: { $regex: search, $options: "i" } }
                ];
            }

            if (query.manager) match.manager = { $regex: query.manager, $options: "i" };
            if (query.location) match.location = { $regex: query.location, $options: "i" };
            if (query.status) match.status = query.status;

            if (query.isActive !== undefined && !query.status) { // Only if status param isn't hijacking it
                match.isActive = (query.isActive === "true" || query.isActive === "1" || query.isActive === 1) ? 1 : 0;
            }

            const total = await this.projectRepo.countBy(match);
            const data = await this.projectRepo.find({
                where: match,
                skip: page * limit,
                take: limit,
                order: { createdAt: "DESC" as any }
            });

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
            const project = await this.projectRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!project) {
                return response(res, StatusCodes.NOT_FOUND, "Project not found");
            }
            return response(res, StatusCodes.OK, "Project fetched successfully", project);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateProjectDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            if (!ObjectId.isValid(id)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid ID format");
            }
            const project = await this.projectRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!project) {
                return response(res, StatusCodes.NOT_FOUND, "Project not found");
            }

            if (body.name) project.name = body.name;
            if (body.description !== undefined) project.description = body.description;
            if (body.startDate) project.startDate = new Date(body.startDate);
            if (body.endDate) project.endDate = new Date(body.endDate);
            if (body.status) project.status = body.status;
            if (body.manager) project.manager = body.manager;
            if (body.location) project.location = body.location;
            if (body.isActive !== undefined) project.isActive = body.isActive;

            project.updatedBy = new ObjectId(userId);

            await this.projectRepo.save(project);

            return response(res, StatusCodes.OK, "Project updated successfully", project);
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
            const project = await this.projectRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!project) {
                return response(res, StatusCodes.NOT_FOUND, "Project not found");
            }

            project.isDelete = 1;
            await this.projectRepo.save(project);
            return response(res, StatusCodes.OK, "Project deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
