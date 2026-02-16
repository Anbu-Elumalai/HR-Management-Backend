import { ObjectId } from "mongodb";
import { AppDataSource } from "../data-source";
import { Notifications } from "../entity/Notification";
import { sendPushNotification } from "./pushNotification.Service";
import { Member } from "../entity/Member";

export class NotificationService {
  private notificationRepo = AppDataSource.getMongoRepository(Notifications);
  private memRepo = AppDataSource.getMongoRepository(Member);

  async createNotification({
    moduleName,
    moduleId,
    createdBy,
    subject,
    content,
    model,
    memberId,
    actionType,
  }: {
    moduleName: string;
    moduleId: ObjectId | string;
    createdBy: ObjectId | string;
    subject?: string;
    content?: string;
    model?: string;
    memberId?: ObjectId | string | Array<ObjectId | string>;
    actionType?: "REQUEST" | "APPROVE" | "DECLINE";
  }) {
    const memberIds = Array.isArray(memberId) ? memberId : [memberId];

    for (const id of memberIds) {
      if (!id) continue;

      const payload = {
        moduleName,
        moduleId: new ObjectId(moduleId),
        createdBy: new ObjectId(createdBy),
        updatedBy: new ObjectId(createdBy),
        receiverId: new ObjectId(id),
        actionType: actionType ?? null,
        isActive: 1,
        isRead: false,
        isDelete: 0,
        subject: subject ?? "",
        content: content ?? "",
      };

      const savedNotification = await this.notificationRepo.save(payload);

      if (model === "Member" && savedNotification) {
        const member = await this.memRepo.findOne({
          where: { _id: new ObjectId(id) },
        });

        if (member?.deviceToken) {
          await sendPushNotification(
            member.deviceToken,
            subject ?? "New Notification",
            payload
          );
        }
      }
    }

    return { success: true };
  }

  async createNotificationCommunity({
    moduleName,
    moduleId,
    createdBy,
    subject,
    content,
    categoryId,
  }: {
    moduleName: string;
    moduleId: ObjectId | string;
    createdBy: ObjectId | string;
    subject?: string;
    content?: string;
    categoryId: ObjectId[];
  }) {
    const members = await this.memRepo.find({
      where: {
        businessCategory: { $in: categoryId },
        isActive: 1,
        isDelete: 0,
      },
    });

    const validMembers = members.filter((m) => m.deviceToken);

    const notificationPayloads = validMembers.map((member) => ({
      moduleName,
      moduleId: new ObjectId(moduleId),
      createdBy: new ObjectId(createdBy),
      updatedBy: new ObjectId(createdBy),
      receiverId: member.id,
      isActive: 1,
      isRead: false,
      isDelete: 0,
      subject: subject ?? "",
      content: content ?? "",
    }));

    if (notificationPayloads.length) {
      await this.notificationRepo.insertMany(notificationPayloads);
    }

    // 3️⃣ Push notifications (parallel)
    await Promise.all(
      validMembers.map((member) =>
        sendPushNotification(
          member.deviceToken,
          subject ?? "New Notification",
          {
            moduleName,
            moduleId,
            content,
          }
        )
      )
    );

    return {
      success: true,
      count: validMembers.length,
    };
  }
}
