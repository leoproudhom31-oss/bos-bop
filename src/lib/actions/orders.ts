"use server";

// Actions sur les commandes de la boutique.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireSession } from "../auth";
import { formString as str } from "../forms";

const ORDER_STATUSES = new Set(["NEW", "CONFIRMED", "SHIPPED", "CANCELLED"]);

export async function updateOrderStatusAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const status = str(formData, "status", 20);
  if (ORDER_STATUSES.has(status)) {
    await prisma.order.update({ where: { id }, data: { status } });
  }
  revalidatePath("/admin/commandes");
  redirect(`/admin/commandes/${id}`);
}
