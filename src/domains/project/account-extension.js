export const PROJECT_ACCOUNT_TABS = Object.freeze([
  { href: "/account/workspace", label: "Project area" },
]);

export function ProjectAccountSummary() {
  return (
    <div className="flex flex-col gap-1 text-right">
      <p className="text-xs font-medium uppercase text-white/50">
        Extension seam
      </p>
      <span className="text-sm text-white/50">
        Replace this with project metrics
      </span>
    </div>
  );
}

export function ProjectAccountWorkspace() {
  return (
    <article className="rounded-2xl bg-white/5 p-5 ring-1 ring-inset ring-white/5">
      <p className="text-xs font-medium uppercase text-white/50">
        Project domain
      </p>
      <h2 className="mt-2 text-xl font-medium text-white">
        Your product starts here
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/70">
        Replace this component and tab with project-owned account data and
        workflows. The Account module does not import this file
      </p>
    </article>
  );
}
