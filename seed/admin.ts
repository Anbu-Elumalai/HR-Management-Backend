import { AppDataSource } from "../data-source";
import { Admin } from "../entity/Admin";
import bcrypt from "bcryptjs";

export async function seedDefaultAdmin() {
  const adminRepo = AppDataSource.getMongoRepository(Admin);

  const count = await adminRepo.countDocuments({ isDelete: 0 });

  if (count > 0) {
    return;
  }

  const defaultAdmin = new Admin();
  defaultAdmin.name = "Mars Solutions";
  defaultAdmin.email = "admin@mars.in";
  defaultAdmin.companyName = "Mars Solutions";
  defaultAdmin.phoneNumber = "9361570434";
  defaultAdmin.pin = await bcrypt.hash("1234", 10);
  defaultAdmin.role = "ADMIN";
  defaultAdmin.isActive = 1;
  defaultAdmin.isDelete = 0;

  await adminRepo.save(defaultAdmin);

  console.log("🌟 Default Admin seeded successfully");
}
