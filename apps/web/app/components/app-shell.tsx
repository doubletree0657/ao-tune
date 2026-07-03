"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import ThemeSelector from "./theme-selector";
import styles from "./app-shell.module.css";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isWorkspace = pathname.startsWith("/workspaces");

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true">
              Ao
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>AoTune</span>
              <span className={styles.brandDescription}>
                Personal artifact studio
              </span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Primary navigation">
            <Link
              aria-current={isHome ? "page" : undefined}
              className={styles.navLink}
              href="/"
            >
              Home
            </Link>
            <Link
              aria-current={isWorkspace ? "page" : undefined}
              className={styles.navLink}
              href="/#workspaces"
            >
              Workspaces
            </Link>
          </nav>
          <ThemeSelector />
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
