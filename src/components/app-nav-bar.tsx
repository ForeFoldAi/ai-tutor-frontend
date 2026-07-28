import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth-store";
import { getAppNavItems, isAppNavActive, type AppNavItem } from "@/lib/app-nav-items";
import { cn } from "@/lib/utils";

function NavIcon({ item }: { item: AppNavItem }) {
  if (item.imageIcon) {
    return (
      <img
        src={item.imageIcon}
        alt=""
        aria-hidden
        className="h-5 w-5 object-contain"
      />
    );
  }
  if (item.icon) {
    const Icon = item.icon;
    return <Icon className="h-5 w-5 shrink-0" aria-hidden />;
  }
  return null;
}

/** Bottom menu bar for tablet/mobile — replaces the sidebar below `lg`. */
export function AppNavBar() {
  const [location] = useLocation();
  const { user } = useAuthStore();
  const items = getAppNavItems(user?.role, user?.schoolId, user?.createdBy);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
      aria-label="Primary"
    >
      <ul className="flex h-14 w-full items-stretch">
        {items.map((item) => {
          const active = isAppNavActive(location, item.url);
          return (
            <li key={item.url} className="min-w-0 flex-1">
              <Link
                href={item.url}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-tight transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-bar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    active && "bg-primary/10"
                  )}
                >
                  <NavIcon item={item} />
                </span>
                <span className="w-full truncate text-center">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
