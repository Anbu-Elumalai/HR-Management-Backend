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
import { InterviewRound } from "../../entity/InterviewRound";
import { CreateInterviewRoundDto, UpdateInterviewRoundDto } from "../../dto/admin/InterviewRound.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/interview-rounds")
@UseBefore(AuthMiddleware)
export class InterviewRoundController {
    private interviewRoundRepo = AppDataSource.getMongoRepository(InterviewRound);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateInterviewRoundDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if name already exists
            const existing = await this.interviewRoundRepo.findOne({
                where: { name: body.name, isDelete: 0 }
            });
            if (existing) {
                return response(res, StatusCodes.CONFLICT, "Interview round already exists");
            }

            const interviewRound = new InterviewRound();
            interviewRound.name = body.name;
            interviewRound.isActive = 1;
            interviewRound.isDelete = 0;
            interviewRound.createdBy = new ObjectId(userId);
            interviewRound.updatedBy = new ObjectId(userId);

            const data = await this.interviewRoundRepo.save(interviewRound);
            return response(res, StatusCodes.CREATED, "Interview round created successfully", data);
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
                this.interviewRoundRepo.find({
                    where: match,
                    take: limit,
                    skip: page * limit,
                    order: { createdAt: "DESC" as any }
                }),
                this.interviewRoundRepo.count({ where: match })
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
            const interviewRound = await this.interviewRoundRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interviewRound) {
                return response(res, StatusCodes.NOT_FOUND, "Interview round not found");
            }
            return response(res, StatusCodes.OK, "Interview round fetched successfully", interviewRound);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateInterviewRoundDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            if (!ObjectId.isValid(id)) {
                return response(res, StatusCodes.BAD_REQUEST, "Invalid ID format");
            }
            const interviewRound = await this.interviewRoundRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interviewRound) {
                return response(res, StatusCodes.NOT_FOUND, "Interview round not found");
            }

            if (body.name !== undefined) {
                // Check if name already exists (excluding current id)
                const existing = await this.interviewRoundRepo.findOne({
                    where: {
                        name: body.name,
                        isDelete: 0,
                        _id: { $ne: new ObjectId(id) }
                    }
                });
                if (existing) {
                    return response(res, StatusCodes.CONFLICT, "Interview round name already exists");
                }
                interviewRound.name = body.name;
            }

            interviewRound.updatedBy = new ObjectId(userId);
            const data = await this.interviewRoundRepo.save(interviewRound);

            return response(res, StatusCodes.OK, "Interview round updated successfully", data);
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
            const interviewRound = await this.interviewRoundRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!interviewRound) {
                return response(res, StatusCodes.NOT_FOUND, "Interview round not found");
            }

            interviewRound.isDelete = 1;
            await this.interviewRoundRepo.save(interviewRound);
            return response(res, StatusCodes.OK, "Interview round deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
