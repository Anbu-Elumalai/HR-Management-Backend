import { AppDataSource } from "../data-source";
import bcrypt from "bcryptjs";
import { AdminUser } from "../entity/AdminUser";
import { Role } from "../entity/Role.Permission";
import { Company } from "../entity/Company";

export async function seedDefaultAdmin() {
  const adminRepo = AppDataSource.getMongoRepository(AdminUser);

  const count = await adminRepo.countDocuments({ isDelete: 0 });

  if (count > 0) {
    return;
  }

  const companyRepo = AppDataSource.getMongoRepository(Company);
  const company = new Company();
  company.name = "Mars Solutions";
  company.email = "mars@gmail.com";
  company.phoneNumber = "9361570434";
  company.address = "123 Main St";
  company.logo = "";
  company.website = "https://mars.com";
  company.description = "Mars Solutions is a leading provider of HR management solutions.";
  company.industry = "Technology";
  company.companySize = "100-500";
  company.location = "Chennai";
  company.country = "India";
  company.state = "Tamil Nadu";
  company.city = "Chennai";
  company.zipCode = "600001";
  company.timezone = "Asia/Kolkata";
  company.isActive = 1;
  company.isDelete = 0;
  company.createdBy = undefined;
  company.updatedBy = undefined;
  await companyRepo.save(company);

  const roleRepo = AppDataSource.getMongoRepository(Role);
  let role = await roleRepo.findOneBy({ name: "Super Admin", isDelete: 0 });
  if (!role) {
    const superAdminRole = new Role();
    superAdminRole.name = "Super Admin";
    superAdminRole.isDelete = 0;
    superAdminRole.isActive = 1;
    superAdminRole.companyId = company.id;
    role = await roleRepo.save(superAdminRole);
  }
  const defaultAdmin = new AdminUser();
  defaultAdmin.name = "Mars Solutions";
  defaultAdmin.email = "admin@gmail.com";
  defaultAdmin.companyId = company.id;
  defaultAdmin.companyName = "Mars Solutions";
  defaultAdmin.phoneNumber = "9361570434";
  defaultAdmin.pin = await bcrypt.hash("1234", 10);
  defaultAdmin.roleId = role?._id;
  defaultAdmin.isActive = 1;
  defaultAdmin.isDelete = 0;

  await adminRepo.save(defaultAdmin);

  console.log("🌟 Default Admin seeded successfully");
}
