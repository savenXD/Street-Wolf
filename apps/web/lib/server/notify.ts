import "server-only";
import { col, type NotificationType } from "@street-wolf/db";
import { newId } from "./crypto";

export async function notify(userId: string, type: NotificationType, title: string, body: string, data: Record<string, string> = {}) {
  await (await col("notifications")).insertOne({ _id: newId(), userId, type, title, body, data, readAt: null, createdAt: new Date() });
}
