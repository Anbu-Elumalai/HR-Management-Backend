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
import { Role } from "../../entity/Role.Permission";
import { CreateRoleDto, UpdateRoleDto } from "../../dto/admin/Role.dto";
import { handleErrorResponse, pagination, response } from "../../utils";

interface RequestWithUser extends Request {
    user: AuthPayload;
    query: any;
}

@JsonController("/roles")
@UseBefore(AuthMiddleware)
export class RoleController {
    private roleRepo = AppDataSource.getMongoRepository(Role);

    @Post("/")
    @HttpCode(StatusCodes.CREATED)
    async create(
        @Body() body: CreateRoleDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const role = new Role();
            role.name = body.name;
            role.code = body.name.toUpperCase().replace(/\s+/g, "_");
            role.isActive = 1;
            role.isDelete = 0;
            role.showForAdmin = body.showForAdmin ?? false;
            role.mobileAdminAccess = body.mobileAdminAccess ?? false;
            role.createdBy = new ObjectId(userId);
            role.updatedBy = new ObjectId(userId);

            role.permissions = body.permissions.map(p => ({
                moduleId: new ObjectId(p.moduleId),
                actions: {
                    view: p.actions.view,
                    add: p.actions.add,
                    edit: p.actions.edit,
                    delete: p.actions.delete
                }
            }));

            const data = await this.roleRepo.save(role);
            const fullData = await this.getAggregatedRole(data._id, req.user.userType);
            return response(res, StatusCodes.CREATED, "Role created successfully", fullData);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    private async getAggregatedRole(roleId: ObjectId, userType: string) {
        const pipeline: any[] = [
            { $match: { _id: roleId, isDelete: 0 } },
            {
                $lookup: {
                    from: "modules",
                    localField: "permissions.moduleId",
                    foreignField: "_id",
                    as: "modules",
                },
            },
            {
                $lookup: {
                    from: "admins",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "adminCreator",
                },
            },
            {
                $lookup: {
                    from: "adminusers",
                    localField: "_id",
                    foreignField: "roleId",
                    as: "assignedUsers",
                },
            },
            {
                $project: {
                    modules: 1,
                    name: 1,
                    code: 1,
                    isActive: 1,
                    createdAt: 1,
                    showForAdmin: 1,
                    mobileAdminAccess: 1,
                    assignedUsersCount: { $size: "$assignedUsers" },
                    isEditable: {
                        $cond: {
                            if: {
                                $and: [
                                    { $gt: [{ $size: "$adminCreator" }, 0] },
                                    { $ne: [userType, "ADMIN"] },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                    permissions: {
                        $map: {
                            input: "$permissions",
                            as: "perm",
                            in: {
                                moduleId: "$$perm.moduleId",
                                moduleName: {
                                    $let: {
                                        vars: {
                                            module: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$modules",
                                                            as: "mod",
                                                            cond: {
                                                                $eq: [
                                                                    "$$mod._id",
                                                                    { $toObjectId: "$$perm.moduleId" },
                                                                ],
                                                            },
                                                        },
                                                    },
                                                    0,
                                                ],
                                            },
                                        },
                                        in: "$$module.name",
                                    },
                                },
                                actions: "$$perm.actions",
                            },
                        },
                    },
                },
            },
        ];

        const result = await this.roleRepo.aggregate(pipeline).toArray();
        return result[0] || null;
    }

    @Get("/")
    async listRoles(
        @QueryParams() query: any,
        @Req() req: RequestWithUser,
        @Res() res: Response,
    ) {
        try {
            const page = Math.max(Number(query.page) || 0, 0);
            const limit = Math.max(Number(query.limit) || 10, 1);
            const search = query.search?.toString();

            const match: any = {
                isDelete: 0,
            };

            // Global search
            if (search) {
                match.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { code: { $regex: search, $options: "i" } },
                ];
            }

            // Specific Column Filters (as per screenshot)
            if (query.searchRoles) {
                match.name = { $regex: query.searchRoles, $options: "i" };
            }

            if (query.searchAdmin) {
                const val = query.searchAdmin.toLowerCase();
                if (val === "yes") match.showForAdmin = true;
                else if (val === "no") match.showForAdmin = false;
            }

            if (query.searchMobile) {
                const val = query.searchMobile.toLowerCase();
                if (val === "yes") match.mobileAdminAccess = true;
                else if (val === "no") match.mobileAdminAccess = false;
            }

            if (query.searchStatus) {
                const val = query.searchStatus.toLowerCase();
                if (val === "active") match.isActive = 1;
                else if (val === "inactive") match.isActive = 0;
            }

            // Existing filter logic for backwards compatibility
            const showForAdmin = query.showForAdmin || query.showforadmin;
            if (showForAdmin === "admin") {
                match.showForAdmin = true;
            } else if (showForAdmin === "member") {
                match.showForAdmin = false;
            }

            if (query.isActive !== undefined && !query.searchStatus) {
                match.isActive =
                    query.isActive === "true" || query.isActive === "1" ? 1 : 0;
            }

            const pipeline: any[] = [
                { $match: match },
                {
                    $lookup: {
                        from: "modules",
                        localField: "permissions.moduleId",
                        foreignField: "_id",
                        as: "modules",
                    },
                },
                {
                    $lookup: {
                        from: "admins",
                        localField: "createdBy",
                        foreignField: "_id",
                        as: "adminCreator",
                    },
                },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "_id",
                        foreignField: "roleId",
                        as: "assignedUsers",
                    },
                },
                {
                    $project: {
                        modules: 1,
                        name: 1,
                        code: 1,
                        isActive: 1,
                        createdAt: 1,
                        showForAdmin: 1,
                        mobileAdminAccess: 1,
                        assignedUsersCount: { $size: "$assignedUsers" },
                        isEditable: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gt: [{ $size: "$adminCreator" }, 0] },
                                        { $ne: [req.user.userType, "ADMIN"] },
                                    ],
                                },
                                then: false,
                                else: true,
                            },
                        },
                        permissions: {
                            $map: {
                                input: "$permissions",
                                as: "perm",
                                in: {
                                    moduleId: "$$perm.moduleId",
                                    moduleName: {
                                        $let: {
                                            vars: {
                                                module: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$modules",
                                                                as: "mod",
                                                                cond: {
                                                                    $eq: [
                                                                        "$$mod._id",
                                                                        { $toObjectId: "$$perm.moduleId" },
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                        0,
                                                    ],
                                                },
                                            },
                                            in: "$$module.name",
                                        },
                                    },
                                    actions: "$$perm.actions",
                                },
                            },
                        },
                    },
                },
                {
                    $sort: {
                        isActive: -1,
                        createdAt: -1,
                    },
                },
                {
                    $facet: {
                        data: [{ $skip: page * limit }, { $limit: limit }],
                        meta: [{ $count: "total" }],
                    },
                },
            ];

            const [result] = await Promise.all([
                this.roleRepo.aggregate(pipeline).toArray(),
            ]);
            const data = result[0]?.data || [];
            const total = result[0]?.meta[0]?.total || 0;
            return pagination(total, data, limit, page, res);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Get("/:id")
    async getOne(
        @Param("id") id: string,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const pipeline: any[] = [
                { $match: { _id: new ObjectId(id), isDelete: 0 } },
                {
                    $lookup: {
                        from: "modules",
                        localField: "permissions.moduleId",
                        foreignField: "_id",
                        as: "modules",
                    },
                },
                {
                    $lookup: {
                        from: "admins",
                        localField: "createdBy",
                        foreignField: "_id",
                        as: "adminCreator",
                    },
                },
                {
                    $lookup: {
                        from: "adminusers",
                        localField: "_id",
                        foreignField: "roleId",
                        as: "assignedUsers",
                    },
                },
                {
                    $project: {
                        modules: 1,
                        name: 1,
                        code: 1,
                        isActive: 1,
                        createdAt: 1,
                        showForAdmin: 1,
                        mobileAdminAccess: 1,
                        assignedUsersCount: { $size: "$assignedUsers" },
                        isEditable: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gt: [{ $size: "$adminCreator" }, 0] },
                                        { $ne: [req.user.userType, "ADMIN"] },
                                    ],
                                },
                                then: false,
                                else: true,
                            },
                        },
                        permissions: {
                            $map: {
                                input: "$permissions",
                                as: "perm",
                                in: {
                                    moduleId: "$$perm.moduleId",
                                    moduleName: {
                                        $let: {
                                            vars: {
                                                module: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$modules",
                                                                as: "mod",
                                                                cond: {
                                                                    $eq: [
                                                                        "$$mod._id",
                                                                        { $toObjectId: "$$perm.moduleId" },
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                        0,
                                                    ],
                                                },
                                            },
                                            in: "$$module.name",
                                        },
                                    },
                                    actions: "$$perm.actions",
                                },
                            },
                        },
                    },
                },
                {
                    $sort: {
                        isActive: -1,
                        createdAt: -1,
                    },
                },

            ];

            const [result] = await Promise.all([
                this.roleRepo.aggregate(pipeline).toArray(),
            ]);
            if (!result) {
                return response(res, StatusCodes.NOT_FOUND, "Role not found");
            }
            return response(res, StatusCodes.OK, "Role fetched successfully", result);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Patch("/:id")
    async update(
        @Param("id") id: string,
        @Body() body: UpdateRoleDto,
        @Req() req: RequestWithUser,
        @Res() res: Response
    ) {
        try {
            const { userId } = req.user;
            const role = await this.roleRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!role) {
                return response(res, StatusCodes.NOT_FOUND, "Role not found");
            }

            if (body.name !== undefined) {
                role.name = body.name;
                role.code = body.name.toUpperCase().replace(/\s+/g, "_");
            }
            if (body.showForAdmin !== undefined) role.showForAdmin = body.showForAdmin;
            if (body.mobileAdminAccess !== undefined) role.mobileAdminAccess = body.mobileAdminAccess;

            if (body.permissions !== undefined) {
                role.permissions = body.permissions.map(p => ({
                    moduleId: new ObjectId(p.moduleId),
                    actions: {
                        view: p.actions.view,
                        add: p.actions.add,
                        edit: p.actions.edit,
                        delete: p.actions.delete
                    }
                }));
            }

            role.updatedBy = new ObjectId(userId);
            await this.roleRepo.save(role);
            const data = await this.getAggregatedRole(role._id, req.user.userType);
            return response(res, StatusCodes.OK, "Role updated successfully", data);
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }

    @Delete("/:id")
    async delete(@Param("id") id: string, @Res() res: Response) {
        try {
            const role = await this.roleRepo.findOne({
                where: { _id: new ObjectId(id), isDelete: 0 }
            });

            if (!role) {
                return response(res, StatusCodes.NOT_FOUND, "Role not found");
            }

            role.isDelete = 1;
            await this.roleRepo.save(role);
            return response(res, StatusCodes.OK, "Role deleted successfully");
        } catch (error) {
            return handleErrorResponse(error, res);
        }
    }
}
