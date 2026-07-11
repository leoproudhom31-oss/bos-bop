import type { Product } from "@prisma/client";
import { prisma } from "./db";
import { escapeHtml } from "./render";
import type { Cart } from "./cart";

// ---------------------------------------------------------------------------
// Vues HTML de la boutique. Le balisage reprend les classes du gabarit
// d'origine (sections, colonnes Bootstrap, boutons) pour une intégration
// visuelle homogène avec le reste du site.
// ---------------------------------------------------------------------------

export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

const section = (inner: string) => `
<section class="bd-section-17 bd-tagstyles" data-section-title="Section" id="section17">
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-joomlaposition-22 clearfix">
<div class="bd-block-79 bd-own-margins">
<div class="bd-blockcontent bd-tagstyles bd-custom-bulletlist">
<div class="custom">
${inner}
</div>
</div>
</div>
</div>
</div>
</section>
`;

function productCard(product: Product): string {
  const img = product.imageUrl
    ? `<img alt="${escapeHtml(product.title)}" src="${escapeHtml(product.imageUrl)}" style="max-width: 100%; height: auto;"/>`
    : "";
  const author = product.author
    ? `<p><em>${escapeHtml(product.author)}</em></p>`
    : "";
  const stockNote =
    product.stock > 0
      ? `<form action="/api/cart/add" method="post" style="display: inline;">
<input name="productId" type="hidden" value="${product.id}"/>
<input name="quantity" type="hidden" value="1"/>
<button type="submit">Ajouter au panier</button>
</form>`
      : "<p><em>Bientôt disponible</em></p>";
  return `<div class="col-sm-4">
<p><a href="/livres/${escapeHtml(product.slug)}" title="${escapeHtml(product.title)}">${img}</a></p>
<h3><a href="/livres/${escapeHtml(product.slug)}">${escapeHtml(product.title)}</a></h3>
${author}
<p><strong>${formatPrice(product.priceCents)}</strong></p>
<p>${stockNote}</p>
</div>`;
}

export function viewShopList(products: Product[]): string {
  const cards = products.map(productCard).join("\n");
  const body =
    products.length === 0
      ? "<p>Aucun livre disponible pour le moment. Revenez bientôt !</p>"
      : `<div class="row">\n${cards}\n</div>`;
  return section(`<h2>Les livres BOS &amp; BOP</h2>
<p>Retrouvez ici les ouvrages sélectionnés par BOS &amp; BOP pour vous accompagner dans votre orientation.</p>
${body}
<p><a href="/panier" title="Voir mon panier"> <button>Voir mon panier</button> </a></p>`);
}

export function viewProductDetail(product: Product): string {
  const img = product.imageUrl
    ? `<img alt="${escapeHtml(product.title)}" src="${escapeHtml(product.imageUrl)}" style="max-width: 100%; height: auto;"/>`
    : "";
  const addForm =
    product.stock > 0
      ? `<form action="/api/cart/add" method="post">
<input name="productId" type="hidden" value="${product.id}"/>
<p><label>Quantité : <input max="99" min="1" name="quantity" style="width: 60px;" type="number" value="1"/></label></p>
<p><button type="submit">Ajouter au panier</button></p>
</form>`
      : "<p><em>Cet ouvrage sera bientôt disponible.</em></p>";
  return section(`<div class="row">
<div class="col-sm-4">
<p>${img}</p>
</div>
<div class="col-sm-8">
<h2>${escapeHtml(product.title)}</h2>
${product.author ? `<p><em>de ${escapeHtml(product.author)}</em></p>` : ""}
<p><strong>${formatPrice(product.priceCents)}</strong></p>
${product.description}
${addForm}
<p><a href="/livres" title="Retour à la liste des livres">&larr; Retour aux livres</a></p>
</div>
</div>`);
}

export type CartLine = { product: Product; quantity: number };

/** Résout le panier cookie en lignes valides (produits publiés uniquement). */
export async function resolveCart(cart: Cart): Promise<CartLine[]> {
  const ids = Object.keys(cart).map(Number);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, published: true },
  });
  return products
    .map((product) => ({ product, quantity: cart[String(product.id)] }))
    .filter((line) => line.quantity > 0);
}

export function cartTotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
}

export function viewCart(lines: CartLine[]): string {
  if (lines.length === 0) {
    return section(`<h2>Mon panier</h2>
<p>Votre panier est vide.</p>
<p><a href="/livres" title="Voir les livres"> <button>Voir les livres</button> </a></p>`);
  }
  const rows = lines
    .map(
      (l) => `<tr>
<td><a href="/livres/${escapeHtml(l.product.slug)}">${escapeHtml(l.product.title)}</a></td>
<td>${formatPrice(l.product.priceCents)}</td>
<td>
<form action="/api/cart/update" method="post" style="margin: 0;">
<input name="productId" type="hidden" value="${l.product.id}"/>
<input max="99" min="0" name="quantity" style="width: 60px;" type="number" value="${l.quantity}"/>
<button type="submit">Mettre à jour</button>
</form>
</td>
<td>${formatPrice(l.product.priceCents * l.quantity)}</td>
<td>
<form action="/api/cart/update" method="post" style="margin: 0;">
<input name="productId" type="hidden" value="${l.product.id}"/>
<input name="quantity" type="hidden" value="0"/>
<button type="submit">Retirer</button>
</form>
</td>
</tr>`,
    )
    .join("\n");
  return section(`<h2>Mon panier</h2>
<table class="table">
<thead>
<tr><th>Ouvrage</th><th>Prix unitaire</th><th>Quantité</th><th>Sous-total</th><th></th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
<p><strong>Total : ${formatPrice(cartTotalCents(lines))}</strong></p>
<p><a href="/commande" title="Passer la commande"> <button>Passer la commande</button> </a> &nbsp; <a href="/livres" title="Continuer mes achats">Continuer mes achats</a></p>`);
}

export function viewCheckout(lines: CartLine[], error?: string): string {
  const recap = lines
    .map((l) => `<li>${escapeHtml(l.product.title)} × ${l.quantity} — ${formatPrice(l.product.priceCents * l.quantity)}</li>`)
    .join("\n");
  const errorHtml = error
    ? `<div class="alert alert-error">${escapeHtml(error)}</div>`
    : "";
  return section(`<h2>Valider ma commande</h2>
${errorHtml}
<div class="row">
<div class="col-sm-6">
<form action="/api/checkout" method="post">
<p><label>Nom complet<span class="required">*</span><br/><input name="customerName" required="required" style="width: 100%;" type="text"/></label></p>
<p><label>Email<span class="required">*</span><br/><input name="email" required="required" style="width: 100%;" type="email"/></label></p>
<p><label>Téléphone<br/><input name="phone" style="width: 100%;" type="text"/></label></p>
<p><label>Adresse de livraison<span class="required">*</span><br/><textarea name="address" required="required" rows="4" style="width: 100%;"></textarea></label></p>
<p><label>Remarque (facultatif)<br/><textarea name="note" rows="3" style="width: 100%;"></textarea></label></p>
<p><button type="submit">Confirmer la commande</button></p>
</form>
</div>
<div class="col-sm-6">
<h3>Récapitulatif</h3>
<ul>
${recap}
</ul>
<p><strong>Total : ${formatPrice(cartTotalCents(lines))}</strong></p>
<p><em>Le paiement en ligne n'est pas encore activé : après validation, nous vous contactons pour organiser le règlement et la remise (en main propre à Toulouse ou par envoi postal).</em></p>
</div>
</div>`);
}

export function viewOrderConfirmation(reference: string): string {
  return section(`<h2>Merci pour votre commande !</h2>
<p>Votre commande <strong>${escapeHtml(reference)}</strong> a bien été enregistrée.</p>
<p>Nous vous recontactons rapidement par email ou téléphone pour organiser le règlement et la livraison.</p>
<p><a href="/" title="Retour à l'accueil"> <button>Retour à l'accueil</button> </a></p>`);
}
