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
import bcrypt from "bcryptjs";
import { AuthMiddleware, AuthPayload } from "../../middlewares/AuthMiddleware";
import { AppDataSource } from "../../data-source";
import { AdminUser } from "../../entity/AdminUser";
import { CreateAdminUserDto, UpdateAdminUserDto } from "../../dto/admin/AdminUser.dto";
import { handleErrorResponse, pagination, response } from "../../utils";
import { generateAdminUserId } from "../../utils/id.generator";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/admin-users")
@UseBefore(AuthMiddleware)
export class UserController {
    private userRepo = AppDataSource.getMongoRepository(AdminUser);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateAdminUserDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;

            // Check if user already exists with phone number
            const existingUser = await this.userRepo.findOne({
                where: { phoneNumber: body.phoneNumber, isDelete: 0 }
            });
            if (existingUser) {
                return response(res, StatusCodes.CONFLICT, "Phone number already registered");
            }

            const user = new AdminUser();
            user.userId = await generateAdminUserId();
            user.name = body.name;
            user.email = body.email;
            user.companyName = body.companyName;
            user.phoneNumber = body.phoneNumber;
            user.isActive = body.isActive ?? 1;
            user.isDelete = 0;
            user.roleId = new ObjectId(body.roleId);
            user.createdBy = new ObjectId(userId);
            user.updatedBy = new ObjectId(userId);

            // Hash PIN
            const salt = await bcrypt.genSalt(10);
            user.pin = await bcrypt.hash(body.pin, salt);

            if (body.profileImage) {
                user.profileImage = body.profileImage;
            }

            const savedUser = await this.userRepo.save(user);

            // Return aggregated user
            const data = await this.getAggregatedUser(savedUser.id);
            return response(res, StatusCodes.CREATED, "User created successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/")
    async listUsers(
        @QueryParams() query: any,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.max(Number(query.limit) || 10, 1);
            const search = query.search?.toString();

            const match: any = { isDelete: 0 };

            // Global Search
            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { phoneNumber: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { userId: { $regex: search, $options: "i" } }
                ];
            }

            // Column-wise Filters
            if (query.userId) {
                match.userId = { $regex: query.userId, $options: "i" };
            }
            if (query.name) {
                match.name = { $regex: query.name, $options: "i" };
            }
            if (query.email) {
                match.email = { $regex: query.email, $options: "i" };
            }
            if (query.company) {
                match.companyName = { $regex: query.company, $options: "i" };
            }
            if (query.phone) {
                match.phoneNumber = { $regex: query.phone, $options: "i" };
            }
            if (query.roleId) {
                match.roleId = new ObjectId(query.roleId);
            }
            if (query.status) {
                const status = query.status.toLowerCase();
                if (status === "active") match.isActive = 1;
                else if (status === "inactive") match.isActive = 0;
            }

            // Existing logic for isActive
            if (query.isActive !== undefined && !query.status) {
                match.isActive = (query.isActive === "true" || query.isActive === "1" || query.isActive === 1) ? 1 : 0;
            }

            const pipeline: any[] = [
                { $match: match },
                {
                    $lookup: {
                        from: "roles",
                        localField: "roleId",
                        foreignField: "_id",
                        as: "role"
                    }
                },
                { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        pin: 0, // Never return PIN
                        isDelete: 0
                    }
                },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }]
                    }
                }
            ];

            const [result] = await this.userRepo.aggregate(pipeline).toArray();
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
            const pipeline: any[] = [
                { $match: { _id: new ObjectId(id), isDelete: 0 } },
                {
                    $lookup: {
                        from: "roles",
                        localField: "roleId",
                        foreignField: "_id",
                        as: "role"
                    }
                },
                { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        pin: 0, // Never return PIN
                        isDelete: 0
                    }
                },
                { $sort: { createdAt: -1 } },

            ];

            const [result] = await this.userRepo.aggregate(pipeline).toArray();

            if (!result) {
                return response(res, StatusCodes.NOT_FOUND, "User not found");
            }
            return response(res, StatusCodes.OK, "User fetched successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateAdminUserDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const user = await this.userRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!user) {
                return response(res, StatusCodes.NOT_FOUND, "User not found");
            }

            if (body.name !== undefined) user.name = body.name;
            if (body.email !== undefined) user.email = body.email;
            if (body.companyName !== undefined) user.companyName = body.companyName;
            if (body.phoneNumber !== undefined) user.phoneNumber = body.phoneNumber;
            if (body.isActive !== undefined) user.isActive = body.isActive;
            if (body.roleId !== undefined) user.roleId = new ObjectId(body.roleId);
            if (body.profileImage !== undefined) user.profileImage = body.profileImage;

            if (body.pin) {
                const salt = await bcrypt.genSalt(10);
                user.pin = await bcrypt.hash(body.pin, salt);
            }

            user.updatedBy = new ObjectId(userId);
            await this.userRepo.save(user);

            const data = await this.getAggregatedUser(new ObjectId(id));
            return response(res, StatusCodes.OK, "User updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const user = await this.userRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!user) {
                return response(res, StatusCodes.NOT_FOUND, "User not found");
            }

            user.isDelete = 1;
            await this.userRepo.save(user);
            return response(res, StatusCodes.OK, "User deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    private async getAggregatedUser(userId: ObjectId) {
        const pipeline: any[] = [
            { $match: { _id: userId, isDelete: 0 } },
            {
                $lookup: {
                    from: "roles",
                    localField: "roleId",
                    foreignField: "_id",
                    as: "role"
                }
            },
            { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    pin: 0,
                    isDelete: 0
                }
            }
        ];
        const result = await this.userRepo.aggregate(pipeline).toArray();
        return result[0] || null;
    }
}
