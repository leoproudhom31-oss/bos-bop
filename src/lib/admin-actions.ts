"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import {
  requireSession,
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "./auth";
import { getHeadTemplate } from "./templates";
import { TITLE_SUFFIX, INNER_BODY_CLASS } from "./render";
import { setSetting } from "./settings";
import { compileBlocks, parseBlocksJson } from "./blocks";

const str = (form: FormData, name: string, max = 5000): string => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
};

// Chemins réservés (routes techniques ou boutique)
const RESERVED_SLUGS = new Set([
  "admin", "api", "assets", "uploads", "livres", "panier", "commande",
  "page-non-trouvee", "index.php",
]);

export async function slugify(input: string): Promise<string> {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function loginAction(formData: FormData) {
  const email = str(formData, "email", 200).toLowerCase();
  const password = str(formData, "password", 200);
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !valid) {
    redirect("/admin/login?error=1");
  }
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  (await cookies()).set(SESSION_COOKIE, token, await getSessionCookieOptions());
  const next = str(formData, "next", 300);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSession();
  const current = str(formData, "current", 200);
  const next = str(formData, "new", 200);
  const confirm = str(formData, "confirm", 200);
  if (next.length < 8) redirect("/admin/parametres?erreur=mdp-court");
  if (next !== confirm) redirect("/admin/parametres?erreur=mdp-differents");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    redirect("/admin/parametres?erreur=mdp-actuel");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  redirect("/admin/parametres?ok=mdp");
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export async function createPageAction(formData: FormData) {
  await requireSession();
  const name = str(formData, "name", 150);
  if (!name) redirect("/admin/pages/new?erreur=nom");

  let slug = await slugify(str(formData, "slug", 100) || name);
  if (!slug || RESERVED_SLUGS.has(slug)) redirect("/admin/pages/new?erreur=slug");
  if (await prisma.page.findUnique({ where: { slug } })) {
    redirect("/admin/pages/new?erreur=slug-existe");
  }

  const editorMode = str(formData, "editorMode") === "html" ? "html" : "blocks";
  const page = await prisma.page.create({
    data: {
      slug,
      title: name + TITLE_SUFFIX,
      breadcrumbLabel: name,
      metaDescription: str(formData, "metaDescription", 300),
      bodyClass: INNER_BODY_CLASS,
      headHtml: getHeadTemplate(),
      sharePath: `/${slug}.html`,
      editorMode,
      blocksJson: JSON.stringify([
        { type: "titre", level: "h2", text: name },
        { type: "texte", html: "" },
      ]),
      contentHtml: compileBlocks([{ type: "titre", level: "h2", text: name }]),
      published: false,
      isLegacy: false,
    },
  });

  if (formData.get("addToMenu") === "1") {
    const last = await prisma.menuItem.findFirst({ orderBy: { position: "desc" } });
    await prisma.menuItem.create({
      data: {
        label: name,
        titleAttr: name,
        position: (last?.position ?? 0) + 1,
        pageId: page.id,
      },
    });
  }

  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${page.id}`);
}

export async function updatePageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) redirect("/admin/pages");

  const name = str(formData, "name", 150) || page.breadcrumbLabel;
  const data: Record<string, unknown> = {
    breadcrumbLabel: name,
    title: str(formData, "title", 300) || name + TITLE_SUFFIX,
    metaDescription: str(formData, "metaDescription", 500),
    metaKeywords: str(formData, "metaKeywords", 300),
    published: formData.get("published") === "1",
  };

  // Le slug des pages historiques ne change pas (référencement conservé)
  if (!page.isLegacy) {
    const slug = await slugify(str(formData, "slug", 100) || page.slug);
    if (slug && slug !== page.slug) {
      if (RESERVED_SLUGS.has(slug) || (await prisma.page.findUnique({ where: { slug } }))) {
        redirect(`/admin/pages/${id}?erreur=slug`);
      }
      data.slug = slug;
      data.sharePath = `/${slug}.html`;
    }
  }

  if (page.editorMode === "blocks") {
    const blocks = parseBlocksJson(str(formData, "blocksJson", 500_000));
    data.blocksJson = JSON.stringify(blocks);
    data.contentHtml = compileBlocks(blocks);
  } else {
    const contentHtml = formData.get("contentHtml");
    if (typeof contentHtml === "string") data.contentHtml = contentHtml;
  }

  await prisma.page.update({ where: { id }, data });
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${id}?ok=1`);
}

export async function togglePagePublishedAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  if (page && page.slug !== "") {
    await prisma.page.update({
      where: { id },
      data: { published: !page.published },
    });
  }
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

export async function deletePageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  // Les pages issues de la migration Joomla ne sont pas supprimables
  if (page && !page.isLegacy) {
    await prisma.page.delete({ where: { id } });
  }
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

// ---------------------------------------------------------------------------
// Bannière d'accueil (hero)
// ---------------------------------------------------------------------------

export async function saveHeroAction(formData: FormData) {
  await requireSession();
  await setSetting("heroTitle", str(formData, "heroTitle", 500));
  await setSetting("heroImageUrl", str(formData, "heroImageUrl", 500));
  revalidatePath("/admin/accueil");
  revalidatePath("/");
  redirect("/admin/accueil?ok=1");
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export async function addMenuItemAction(formData: FormData) {
  await requireSession();
  const label = str(formData, "label", 100);
  if (!label) redirect("/admin/menu?erreur=libelle");
  const pageId = Number(formData.get("pageId")) || null;
  const url = str(formData, "url", 300);
  if (!pageId && !url) redirect("/admin/menu?erreur=cible");
  const last = await prisma.menuItem.findFirst({ orderBy: { position: "desc" } });
  await prisma.menuItem.create({
    data: {
      label,
      titleAttr: str(formData, "titleAttr", 150),
      position: (last?.position ?? 0) + 1,
      pageId: pageId || undefined,
      url: pageId ? "" : url,
    },
  });
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}

export async function updateMenuItemAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const label = str(formData, "label", 100);
  if (label) {
    await prisma.menuItem.update({
      where: { id },
      data: { label, titleAttr: str(formData, "titleAttr", 150) },
    });
  }
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}

export async function moveMenuItemAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const items = await prisma.menuItem.findMany({ orderBy: { position: "asc" } });
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index !== -1 && target >= 0 && target < items.length) {
    // Échange des positions, puis renumérotation propre
    [items[index], items[target]] = [items[target], items[index]];
    for (let i = 0; i < items.length; i++) {
      await prisma.menuItem.update({ where: { id: items[i].id }, data: { position: i + 1 } });
    }
  }
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}

export async function deleteMenuItemAction(formData: FormData) {
  await requireSession();
  await prisma.menuItem.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function toggleMessageReadAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (message) {
    await prisma.contactMessage.update({
      where: { id },
      data: { isRead: !message.isRead },
    });
  }
  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function deleteMessageAction(formData: FormData) {
  await requireSession();
  await prisma.contactMessage.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

// ---------------------------------------------------------------------------
// Livres (produits)
// ---------------------------------------------------------------------------

function parsePriceCents(input: string): number {
  const value = Number(input.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

export async function saveProductAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id")) || null;
  const title = str(formData, "title", 200);
  if (!title) redirect(id ? `/admin/produits/${id}?erreur=titre` : "/admin/produits/new?erreur=titre");

  const data = {
    title,
    author: str(formData, "author", 200),
    description: str(formData, "description", 20_000),
    priceCents: parsePriceCents(str(formData, "price", 20)),
    imageUrl: str(formData, "imageUrl", 500),
    stock: Math.max(0, Math.floor(Number(formData.get("stock")) || 0)),
    published: formData.get("published") === "1",
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
    revalidatePath("/admin/produits");
    redirect(`/admin/produits/${id}?ok=1`);
  }

  let slug = await slugify(str(formData, "slug", 100) || title);
  if (!slug) slug = `livre-${Date.now()}`;
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  const product = await prisma.product.create({ data: { ...data, slug } });
  revalidatePath("/admin/produits");
  redirect(`/admin/produits/${product.id}?ok=1`);
}

export async function deleteProductAction(formData: FormData) {
  await requireSession();
  await prisma.product.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/admin/produits");
  redirect("/admin/produits");
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

export async function saveSettingsAction(formData: FormData) {
  await requireSession();
  const siteUrl = str(formData, "siteUrl", 300).replace(/\/+$/, "");
  if (siteUrl) await setSetting("siteUrl", siteUrl);
  await setSetting("shopEnabled", formData.get("shopEnabled") === "1" ? "1" : "0");
  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?ok=1");
}
