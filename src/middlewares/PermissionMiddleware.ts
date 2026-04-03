import { hasPermission } from "../utils/common.function";
import { AppDataSource } from "../data-source";
import { Role } from "../entity/Role.Permission";
import { ObjectId } from "mongodb";

export const canAccess = (feature: string, action: any) => {
    return async (req, res, next) => {
        try {
            // req.user.roleId is set by AuthMiddleware from JWT
            const roleId = req.user.roleId || req.user.role?._id;
            if (!roleId) {
                return res.status(403).json({ message: "Role not found in token" });
            }

            // Fetch full role with permissions from database
            const role = await AppDataSource.getMongoRepository(Role).findOneBy({
                _id: new ObjectId(roleId),
                isDelete: 0
            });

            if (!role) {
                return res.status(403).json({ message: "Role not found or inactive" });
            }

            if (!hasPermission(role, feature, action)) {
                return res.status(403).json({ message: "Permission denied" });
            }

            // Attach role to req for downstream use
            req.user.role = role;
            next();
        } catch (error: any) {
            if (error.code === 'CastError') {
                return res.status(400).json({ message: "Invalid role ID" });
            }
            return res.status(500).json({ message: "Authentication error", error: error.message });
        }
    };
};
