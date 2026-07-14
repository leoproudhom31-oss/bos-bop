"use server";

// Actions sur les réglages du site et la bannière d'accueil.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "../auth";
import { setSetting } from "../settings";
import { formString as str } from "../forms";

export async function saveSettingsAction(formData: FormData) {
  await requireSession();
  const siteUrl = str(formData, "siteUrl", 300).replace(/\/+$/, "");
  if (siteUrl) await setSetting("siteUrl", siteUrl);
  await setSetting("shopEnabled", formData.get("shopEnabled") === "1" ? "1" : "0");
  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?ok=1");
}

export async function saveHeroAction(formData: FormData) {
  await requireSession();
  await setSetting("heroTitle", str(formData, "heroTitle", 500));
  await setSetting("heroImageUrl", str(formData, "heroImageUrl", 500));
  revalidatePath("/admin/accueil");
  revalidatePath("/");
  redirect("/admin/accueil?ok=1");
}
