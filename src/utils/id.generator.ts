
import { AppDataSource } from "../data-source";
import { AdminUser } from "../entity/AdminUser";
import { Project } from "../entity/Project";
import { Vacancy } from "../entity/Vacancy";

export async function generateAdminUserId(): Promise<string> {
    try {
        const lastAdminUser = await AppDataSource.getMongoRepository(AdminUser).findOne({
            where: {},
            order: { createdAt: "DESC" as any }
        });

        const lastId = lastAdminUser?.userId?.replace('US', '') || '000';
        const numeric = parseInt(lastId) || 0;
        const newId = `US${(numeric + 1).toString().padStart(3, '0')}`;
        return newId;
    } catch (err) {
        throw err;
    }
}

export async function generateVacancyRequestNumber(): Promise<string> {
    try {
        const lastVacancy = await AppDataSource.getMongoRepository(Vacancy).findOne({
            where: {},
            order: { createdAt: "DESC" as any }
        });

        // Format: REQ-YYYY-NNN
        const year = new Date().getFullYear();
        const prefix = `REQ-${year}-`;

        let numeric = 0;
        if (lastVacancy && lastVacancy.requestNumber && lastVacancy.requestNumber.startsWith(prefix)) {
            const lastIdSequence = lastVacancy.requestNumber.replace(prefix, '');
            numeric = parseInt(lastIdSequence) || 0;
        }

        const newId = `${prefix}${(numeric + 1).toString().padStart(3, '0')}`;
        return newId;
    } catch (err) {
        throw err;
    }
}

export async function generateProjectCode(): Promise<string> {
    try {
        const lastProject = await AppDataSource.getMongoRepository(Project).findOne({
            where: {},
            order: { createdAt: "DESC" as any }
        });

        // Format: PRJ-NNN
        const prefix = `PRJ-`;

        let numeric = 0;
        if (lastProject && lastProject.code && lastProject.code.startsWith(prefix)) {
            const lastIdSequence = lastProject.code.replace(prefix, '');
            numeric = parseInt(lastIdSequence) || 0;
        }

        const newId = `${prefix}${(numeric + 1).toString().padStart(3, '0')}`;
        return newId;
    } catch (err) {
        // Project entity might not be loaded when this first runs, similar to Vacancy
        throw err;
    }
}
