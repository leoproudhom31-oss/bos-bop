import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { compileBlocks, parseBlocksJson } from "@/lib/blocks";
import { slugify } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

const RESERVED_SLUGS = new Set([
  "admin", "api", "assets", "uploads", "livres", "panier", "commande",
  "page-non-trouvee", "index.php", "apercu",
]);

const TITLE_SUFFIX = " - BOS & BOP - Orientation scolaire et professionnelle à Toulouse";

// Sauvegarde d'une page depuis le studio (reste dans le studio, réponse JSON).
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getSession())) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await context.params;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) return Response.json({ error: "Page introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const name = str(body.name, 150) || page.breadcrumbLabel;
  const data: Record<string, unknown> = {
    breadcrumbLabel: name,
    title: str(body.title, 300) || name + TITLE_SUFFIX,
    metaDescription: str(body.metaDescription, 500),
    metaKeywords: str(body.metaKeywords, 300),
    published: body.published === true,
  };

  // Adresse (slug) : figée pour les pages historiques
  if (!page.isLegacy) {
    const slug = await slugify(str(body.slug, 100) || page.slug);
    if (slug && slug !== page.slug) {
      if (RESERVED_SLUGS.has(slug) || (await prisma.page.findUnique({ where: { slug } }))) {
        return Response.json({ error: "Cette adresse n'est pas disponible." }, { status: 409 });
      }
      data.slug = slug;
      data.sharePath = `/${slug}.html`;
    }
  }

  if (Array.isArray(body.blocks)) {
    const blocks = parseBlocksJson(JSON.stringify(body.blocks));
    data.blocksJson = JSON.stringify(blocks);
    data.contentHtml = compileBlocks(blocks);
    data.editorMode = "blocks";
  }

  const updated = await prisma.page.update({ where: { id: page.id }, data });

  revalidatePath("/admin/pages");
  revalidatePath(updated.slug === "" ? "/" : `/${updated.slug}`);

  return Response.json({
    ok: true,
    slug: updated.slug,
    published: updated.published,
    breadcrumbLabel: updated.breadcrumbLabel,
    title: updated.title,
  });
}
