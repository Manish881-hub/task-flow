import Head from "next/head";
import EfferdSidebar from "./dashboard/EfferdSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

/**
 * Shared global shell for every authenticated page.
 * Sidebar (230px) + 64px header + dark content area with identical
 * padding everywhere. Page-specific content goes in children —
 * the shell never constrains width (no max-width container).
 */
export default function EfferdPageShell({
  title,
  crumb,
  socketStatus,
  currentProjectId = null,
  headRight = null,
  children,
}) {
  return (
    <div className="efferd-layout">
      <Head><title>{title} — TaskFlow</title></Head>
      <EfferdSidebar socketStatus={socketStatus} currentProjectId={currentProjectId} />
      <main className="efferd-main">
        <header className="efferd-header">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">TaskFlow</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{crumb}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {headRight ? <div className="efferd-header-right">{headRight}</div> : null}
        </header>
        <div className="efferd-page">{children}</div>
      </main>
    </div>
  );
}
