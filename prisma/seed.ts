/**
 * Alimentation de la base :
 *  - pages et menu issus du site Joomla d'origine (dossier content/)
 *  - compte administrateur (variables ADMIN_EMAIL / ADMIN_PASSWORD)
 *  - réglages par défaut et exemple de livre pour la boutique
 *
 * Idempotent : peut être relancé sans dupliquer les données.
 * ATTENTION : le contenu des pages legacy est réécrasé depuis content/ à
 * chaque exécution (source de vérité initiale). Après la mise en production,
 * ne plus relancer le seed si le contenu a été modifié dans l'administration.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const root = process.cwd();
const readContent = (rel: string) => readFileSync(join(root, "content", rel), "utf-8");

type PageMeta = {
  slug: string;
  name: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  breadcrumbLabel: string;
  sharePath: string;
  bodyClass: string;
};

type MenuEntry = {
  cssTag: string;
  url: string;
  titleAttr: string;
  label: string;
  position: number;
};

async function main() {
  // --- Pages ---------------------------------------------------------------
  const pages: PageMeta[] = JSON.parse(readContent("pages.json"));
  for (const meta of pages) {
    const headHtml = readContent(`heads/${meta.name}.html`);
    const contentHtml = readContent(`pages/${meta.name}.html`);
    const data = {
      title: meta.title,
      breadcrumbLabel: meta.breadcrumbLabel,
      metaDescription: meta.metaDescription,
      metaKeywords: meta.metaKeywords,
      bodyClass: meta.bodyClass,
      headHtml,
      sharePath: meta.sharePath,
      contentHtml,
      editorMode: "html",
      published: true,
      isLegacy: true,
    };
    await prisma.page.upsert({
      where: { slug: meta.slug },
      create: { slug: meta.slug, ...data },
      update: data,
    });
    console.log(`page : /${meta.slug}`);
  }

  // --- Menu principal --------------------------------------------------------
  const menu: MenuEntry[] = JSON.parse(readContent("menu.json"));
  await prisma.menuItem.deleteMany({});
  for (const entry of menu) {
    const slug = entry.url === "/" ? "" : entry.url.replace(/^\//, "");
    const page = await prisma.page.findUnique({ where: { slug } });
    await prisma.menuItem.create({
      data: {
        label: entry.label,
        titleAttr: entry.titleAttr,
        cssTag: entry.cssTag,
        position: entry.position,
        pageId: page?.id ?? null,
        url: page ? "" : entry.url,
      },
    });
    console.log(`menu : ${entry.label}`);
  }

  // --- Compte administrateur -------------------------------------------------
  const email = process.env.ADMIN_EMAIL || "admin@bos-bop.fr";
  const password = process.env.ADMIN_PASSWORD || "admin";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Administrateur", passwordHash },
    update: {},
  });
  console.log(`admin : ${email}`);

  // --- Réglages ----------------------------------------------------------------
  const defaults: Record<string, string> = {
    siteUrl: process.env.SITE_URL || "https://www.bos-bop.fr",
    shopEnabled: "0",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  // --- Exemple de livre (boutique désactivée par défaut) ----------------------
  await prisma.product.upsert({
    where: { slug: "exemple-livre-orientation" },
    create: {
      slug: "exemple-livre-orientation",
      title: "Exemple — Guide de l'orientation",
      author: "BOS & BOP",
      description:
        "<p>Fiche produit d'exemple créée par l'installation. Modifiez-la ou supprimez-la depuis l'administration (rubrique Livres).</p>",
      priceCents: 1990,
      stock: 10,
      published: true,
    },
    update: {},
  });

  console.log("Seed terminé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
