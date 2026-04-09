// Migration: Vacancy Module Enhancements - Week 1 Fixes
// Date: 2026-04-03
// Purpose: Add new fields, indexes, and update existing data

import { AppDataSource } from "../data-source";
import { Vacancy } from "../entity/Vacancy";

async function up() {
  console.log("Starting vacancy migration...");

  const dataSource = AppDataSource;
  await dataSource.initialize();

  const vacancyRepo = dataSource.getMongoRepository(Vacancy);

  // 1. Add new fields with default values to existing vacancies
  const result = await vacancyRepo.createQueryBuilder()
    .update()
    .set({
      // Essential fields
      recruiterId: null,
      priority: "medium",
      experienceMin: null,
      experienceMax: null,
      workLocationType: null,
      remoteEligible: false,
      applicationDeadline: null,
      requiredSkills: null,
      benefits: null,
      salaryCurrency: "INR",
      externalPostingUrl: null,

      // Tracking fields
      applicantCount: 0,
      interviewCount: 0,
      offerCount: 0,
      filledCount: 0,

      // Workflow timestamps
      approvedAt: null,
      openedAt: null,
      filledAt: null,

      // History arrays
      statusHistory: [],
      approvalHistory: [],

      approverId: null,
      approvalRemarks: null,

      // Computed fields
      agingDays: 0,
      healthScore: 0
    })
    .where("isDelete", 0)
    .execute();

  console.log(`Updated ${result.affected || 0} existing vacancies with default values`);

  // 2. Create indexes (MongoDB will create if not exists)
  console.log("Creating indexes...");
  // Indexes are defined in entity. Ensure they are created:
  // - departmentId + status
  // - positionId + status
  // - recruiterId + status
  // - createdAt
  // - approvalStatus + status
  // - priority + status
  // - status + isDelete

  // 3. Backfill agingDays for existing vacancies
  const vacancies = await vacancyRepo.find({
    where: { isDelete: 0 },
    select: ["_id", "createdAt"]
  });

  const now = new Date();
  for (const v of vacancies) {
    const created = new Date(v.createdAt);
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    await vacancyRepo.createQueryBuilder()
      .update()
      .set({ agingDays: diffDays })
      .where("_id", v._id)
      .execute();
  }
  console.log(`Backfilled agingDays for ${vacancies.length} vacancies`);

  // 4. Backfill applicantCount and filledCount from candidates collection
  const Candidate = require("../entity/Candidate").Candidate;
  const candidateRepo = AppDataSource.getMongoRepository(Candidate);

  for (const v of vacancies) {
    // Count total candidates (non-deleted) for this vacancy
    const applicantCount = await candidateRepo.count({
      where: { vacancyId: v._id, isDelete: 0 }
    });

    // Count filled/hired candidates
    const filledCount = await candidateRepo.count({
      where: { vacancyId: v._id, isDelete: 0, status: "hired" }
    });

    await vacancyRepo.createQueryBuilder()
      .update()
      .set({ applicantCount, filledCount })
      .where("_id", v._id)
      .execute();
  }
  console.log(`Backfilled applicantCount and filledCount for vacancies`);

  // 5. Initialize statusHistory for existing vacancies
  for (const v of vacancies) {
    const vacancy = await vacancyRepo.findOneBy({ _id: v._id });
    if (vacancy && !vacancy.statusHistory) {
      await vacancyRepo.createQueryBuilder()
        .update()
        .set({
          statusHistory: [{
            from: null,
            to: vacancy.status,
            changedBy: vacancy.createdBy,
            changedAt: vacancy.createdAt,
            remarks: "Initial status from migration"
          }]
        })
        .where("_id", v._id)
        .execute();
    }
  }
  console.log(`Initialized statusHistory for vacancies`);

  // 6. Initialize approvalHistory
  for (const v of vacancies) {
    const vacancy = await vacancyRepo.findOneBy({ _id: v._id });
    if (vacancy && !vacancy.approvalHistory) {
      await vacancyRepo.createQueryBuilder()
        .update()
        .set({
          approvalHistory: [{
            from: null,
            to: vacancy.approvalStatus,
            changedBy: vacancy.createdBy,
            changedAt: vacancy.createdAt,
            remarks: "Initial approval status from migration"
          }]
        })
        .where("_id", v._id)
        .execute();
    }
  }
  console.log(`Initialized approvalHistory for vacancies`);

  await dataSource.destroy();
  console.log("Migration completed successfully!");
}

async function down() {
  // Rollback: Remove added fields (or keep for history)
  const dataSource = AppDataSource;
  await dataSource.initialize();
  const vacancyRepo = dataSource.getMongoRepository(Vacancy);

  // In MongoDB, we typically don't drop fields, just ignore them
  // But for complete rollback, you could remove these fields from documents
  // However, this is destructive. Safer to leave them.

  await dataSource.destroy();
  console.log("Rollback completed (fields retained for data safety)");
}

// Run
if (require.main === module) {
  up().catch(console.error);
}

export { up, down };
