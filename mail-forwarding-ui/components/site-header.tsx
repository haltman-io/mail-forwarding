import Link from "next/link";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Github, Send } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        {/* Left: logo */}
        <div className="flex w-1/3 items-center">
          <Link href="https://www.haltman.io/" className="flex items-center gap-2 font-semibold tracking-tight" target="_blank" rel="noreferrer">
            <span className="text-sm">haltman.io</span>
          </Link>
        </div>

        {/* Center: nav */}
        <div className="flex w-1/3 justify-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link
                  href="#"
                  className="text-sm text-foreground/90 hover:text-foreground"
                >
                  Free Mail Forwarding Service
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: icons */}
        <div className="flex w-1/3 items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="GitHub">
            <Link href="https://github.com/haltman-io/mail-forwarding-ui" target="_blank" rel="noreferrer">
              <Github className="h-5 w-5" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Telegram">
            <Link href="https://t.me/haltman_group" target="_blank" rel="noreferrer">
              <Send className="h-5 w-5" />
            </Link>
          </Button>

        </div>
      </div>
    </header>
  );
}
