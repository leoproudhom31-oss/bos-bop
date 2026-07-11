"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/menu", label: "Menu du site" },
  { href: "/admin/messages", label: "Messages", badgeKey: "messages" },
  { href: "/admin/produits", label: "Livres" },
  { href: "/admin/commandes", label: "Commandes", badgeKey: "orders" },
  { href: "/admin/parametres", label: "Réglages" },
] as const;

export function AdminNav({
  badges,
}: {
  badges: { messages: number; orders: number };
}) {
  const pathname = usePathname();
  return (
    <nav className="admin-nav">
      {LINKS.map((link) => {
        const active =
          "exact" in link && link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
        const badge =
          "badgeKey" in link && link.badgeKey ? badges[link.badgeKey] : 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "active" : undefined}
          >
            {link.label}
            {badge > 0 && <span className="badge-nav">{badge}</span>}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noreferrer">
        Voir le site ↗
      </a>
    </nav>
  );
}
