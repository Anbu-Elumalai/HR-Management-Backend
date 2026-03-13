import { AppDataSource } from "../data-source";
import { Modules } from "../entity/Modules";

export async function seedDefaultModules() {
  const moduleRepo = AppDataSource.getMongoRepository(Modules);

  // Check if already seeded
  const existingCount = await moduleRepo.count();
  if (existingCount > 0) {
    console.log("⚡ Modules already seeded");
    return;
  }

  const modules = [
    // General
    { key: "dashboard", name: "Dashboard", group: "General", order: 1 },
    { key: "projects", name: "Projects", group: "General", order: 2 },

    // HR
    { key: "employees", name: "Employees", group: "HR", order: 3 },
    { key: "attendance", name: "Attendance", group: "HR", order: 4 },
    { key: "payroll", name: "Payroll", group: "HR", order: 5 },

    // Recruitment
    { key: "vacancy", name: "Vacancy", group: "Recruitment", order: 6 },
    { key: "candidates", name: "Candidates", group: "Recruitment", order: 7 },
    { key: "interview", name: "Interview", group: "Recruitment", order: 8 },
    { key: "offers", name: "Offers", group: "Recruitment", order: 9 },

    // Administration
    { key: "users", name: "Users", group: "Administration", order: 10 },
    { key: "roles", name: "Roles", group: "Administration", order: 11 },

    // Reports
    { key: "reports", name: "Reports", group: "Reports", order: 12 },

    // Settings
    { key: "master_data", name: "Master Data", group: "Settings", order: 13 },
  ];


  const moduleEntities = modules.map((item) => {
    const module = new Modules();
    module.key = item.key;
    module.name = item.name;
    module.group = item.group;
    module.sortOrder = item.order;
    module.isActive = 1;
    module.isDelete = 0;
    return module;
  });

  await moduleRepo.save(moduleEntities);

  console.log("🌟 Default Modules seeded successfully");
}
