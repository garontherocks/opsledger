// Dependency audit gate (ADR 0019). Fails closed on any advisory >= moderate that is not covered by a
// documented, scoped, unexpired exception in security/audit-exceptions.json. An exception covers an advisory
// only when EVERY dependency path from the project root to EVERY affected node passes through one of its
// required ancestors; a single path outside them fails the gate. Stale exceptions only warn, so they get removed.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type Severity = 'info' | 'low' | 'moderate' | 'high' | 'critical';
const RANK: Record<Severity, number> = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
export const THRESHOLD: Severity = 'moderate';

type LockPackage = {
  name?: string;
  version?: string;
  link?: boolean;
  resolved?: string;
  dev?: boolean;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
export type Lockfile = { packages: Record<string, LockPackage> };
type AuditVia = { source?: number; name?: string; title?: string; url?: string; severity?: Severity; range?: string };
export type AuditReport = {
  vulnerabilities?: Record<string, { name: string; nodes?: string[]; via?: (string | AuditVia)[] }>;
  error?: unknown;
};
export type Exception = {
  id: string;
  package: string;
  severity: Severity;
  requiredAncestors: string[];
  reason: string;
  decided: string;
  expires: string;
};
export type ExceptionsFile = { exceptions: Exception[] };
export type Advisory = {
  id: string;
  package: string;
  severity: Severity;
  title: string;
  range: string;
  nodes: string[];
};
export type Result = { errors: string[]; warnings: string[]; excepted: string[]; below: number; ok: boolean };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const nameOf = (location: string, pkg: LockPackage | undefined) =>
  pkg?.name ?? location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length);
const isProjectFolder = (location: string) => !location.includes('node_modules/');

/** Node-style resolution of a dependency name from a lockfile location. */
function resolve(packages: Lockfile['packages'], from: string, name: string): string | undefined {
  let base = from;
  for (;;) {
    const candidate = (base ? base + '/' : '') + 'node_modules/' + name;
    if (packages[candidate]) return candidate;
    if (!base) return undefined;
    const cut = base.lastIndexOf('/node_modules/');
    base = cut < 0 ? '' : base.slice(0, cut);
  }
}

/** Child edges of the installed dependency graph, rooted at '' (the project). */
export function dependencyGraph(lock: Lockfile): Map<string, string[]> {
  const packages = lock.packages,
    graph = new Map<string, string[]>();
  for (const [location, pkg] of Object.entries(packages)) {
    const children = new Set<string>();
    if (pkg.link && pkg.resolved !== undefined) children.add(pkg.resolved);
    // Workspaces are part of the project root.
    if (location === '') {
      for (const other of Object.keys(packages)) if (other && isProjectFolder(other)) children.add(other);
    }
    const sets = [
      pkg.dependencies,
      pkg.optionalDependencies,
      pkg.peerDependencies,
      isProjectFolder(location) ? pkg.devDependencies : undefined,
    ];
    for (const set of sets)
      for (const dep of Object.keys(set ?? {})) {
        const target = resolve(packages, location, dep);
        if (target) children.add(target);
      }
    graph.set(location, [...children]);
  }
  return graph;
}

/** Shortest root path to `target` that avoids every package named in `avoid` (undefined if none exists). */
export function pathAvoiding(
  lock: Lockfile,
  graph: Map<string, string[]>,
  target: string,
  avoid: readonly string[],
): string[] | undefined {
  const previous = new Map<string, string>([['', '']]);
  const queue = [''];
  while (queue.length) {
    const current = queue.shift() as string;
    if (current === target) {
      const path = [current];
      let step = current;
      while (step !== '') {
        step = previous.get(step) as string;
        path.unshift(step);
      }
      return path;
    }
    for (const child of graph.get(current) ?? []) {
      if (previous.has(child)) continue;
      if (child !== target && avoid.includes(nameOf(child, lock.packages[child]))) continue;
      previous.set(child, current);
      queue.push(child);
    }
  }
  return undefined;
}

export function describePath(lock: Lockfile, path: string[]): string {
  return path
    .map(location => {
      if (location === '') return '(root)';
      const pkg = lock.packages[location];
      return nameOf(location, pkg) + (pkg?.version ? '@' + pkg.version : '');
    })
    .join(' > ');
}

/** Distinct advisories from `npm audit --json`, keyed by GHSA id, with the affected installed nodes. */
export function advisories(report: AuditReport): Advisory[] {
  const found = new Map<string, Advisory>();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {}))
    for (const via of vulnerability.via ?? []) {
      if (typeof via === 'string' || !via.url || !via.severity) continue;
      const id = via.url.slice(via.url.lastIndexOf('/') + 1);
      const advisory = found.get(id) ?? {
        id,
        package: via.name ?? vulnerability.name,
        severity: via.severity,
        title: via.title ?? '',
        range: via.range ?? '',
        nodes: [],
      };
      for (const node of vulnerability.nodes ?? []) if (!advisory.nodes.includes(node)) advisory.nodes.push(node);
      found.set(id, advisory);
    }
  return [...found.values()].sort((a, b) => RANK[b.severity] - RANK[a.severity] || a.id.localeCompare(b.id));
}

function invalidException(exception: Exception): string | undefined {
  const missing = (['id', 'package', 'severity', 'reason', 'decided', 'expires'] as const).filter(
    key => typeof exception[key] !== 'string' || !exception[key],
  );
  if (missing.length) return 'missing ' + missing.join(', ');
  if (!(exception.severity in RANK)) return 'unknown severity ' + exception.severity;
  if (
    !Array.isArray(exception.requiredAncestors) ||
    !exception.requiredAncestors.length ||
    exception.requiredAncestors.some(a => typeof a !== 'string' || !a)
  )
    return 'requiredAncestors must be a non-empty list of package names';
  if (!DATE.test(exception.decided) || !DATE.test(exception.expires)) return 'decided/expires must be YYYY-MM-DD';
  if (exception.expires <= exception.decided) return 'expires must be after decided';
  return undefined;
}

/** Pure evaluation; `today` is a YYYY-MM-DD UTC date. An exception is valid through its expiry date. */
export function evaluate(report: AuditReport, lock: Lockfile, file: ExceptionsFile, today: string): Result {
  const errors: string[] = [],
    warnings: string[] = [],
    excepted: string[] = [];
  if (report.error !== undefined || !report.vulnerabilities)
    errors.push(
      'npm audit did not return a vulnerability report: ' + JSON.stringify(report.error ?? report).slice(0, 300),
    );
  const exceptions = new Map<string, Exception>();
  for (const exception of file.exceptions ?? []) {
    const problem = invalidException(exception);
    if (problem) {
      errors.push(`exception ${exception.id ?? '(no id)'} is invalid: ${problem}`);
      continue;
    }
    if (exceptions.has(exception.id)) {
      errors.push(`exception ${exception.id} is listed more than once`);
      continue;
    }
    exceptions.set(exception.id, exception);
    if (exception.expires < today)
      errors.push(
        `exception ${exception.id} (${exception.package}) expired on ${exception.expires}; re-review it (ADR 0019)`,
      );
  }
  const graph = dependencyGraph(lock),
    all = advisories(report),
    seen = new Set<string>();
  const gated = all.filter(advisory => RANK[advisory.severity] >= RANK[THRESHOLD]);
  for (const advisory of gated) {
    const label =
      `${advisory.id} ${advisory.package} (${advisory.severity}, ${advisory.range}) ${advisory.title}`.trim();
    const exception = exceptions.get(advisory.id);
    if (!exception) {
      errors.push(`not excepted: ${label}; nodes: ${advisory.nodes.join(', ')}`);
      continue;
    }
    seen.add(advisory.id);
    if (exception.package !== advisory.package) {
      errors.push(`exception ${advisory.id} names package ${exception.package}, audit reports ${advisory.package}`);
      continue;
    }
    if (exception.severity !== advisory.severity) {
      errors.push(
        `exception ${advisory.id} was decided at severity ${exception.severity}, audit now reports ${advisory.severity}; re-review it`,
      );
      continue;
    }
    const unknown = advisory.nodes.filter(node => !lock.packages[node] || !pathAvoiding(lock, graph, node, []));
    if (!advisory.nodes.length || unknown.length) {
      errors.push(
        `${advisory.id}: cannot verify paths for node(s) missing from package-lock.json: ${unknown.join(', ') || '(none reported)'}`,
      );
      continue;
    }
    const outside = advisory.nodes
      .map(node => pathAvoiding(lock, graph, node, exception.requiredAncestors))
      .filter(path => path !== undefined);
    if (outside.length) {
      for (const path of outside)
        errors.push(
          `${advisory.id} is excepted only through [${exception.requiredAncestors.join(', ')}] but is reachable via ${describePath(lock, path)}`,
        );
      continue;
    }
    excepted.push(
      `${label} — only via [${exception.requiredAncestors.join(', ')}], ${advisory.nodes.length} node(s), expires ${exception.expires}`,
    );
  }
  for (const exception of exceptions.values())
    if (!seen.has(exception.id))
      warnings.push(
        `stale exception ${exception.id} (${exception.package}): no longer reported at >= ${THRESHOLD}; remove it from security/audit-exceptions.json`,
      );
  return { errors, warnings, excepted, below: all.length - gated.length, ok: errors.length === 0 };
}

export function summary(result: Result): string {
  const lines = [
    `audit gate: ${result.ok ? 'PASS' : 'FAIL'} (threshold ${THRESHOLD}; ${result.excepted.length} excepted, ${result.errors.length} error(s), ${result.warnings.length} warning(s), ${result.below} advisory(ies) below threshold not gated)`,
  ];
  for (const line of result.errors) lines.push('  ERROR   ' + line);
  for (const line of result.warnings) lines.push('  WARN    ' + line);
  for (const line of result.excepted) lines.push('  EXCEPT  ' + line);
  return lines.join('\n');
}

function runAudit(root: string): AuditReport {
  const run = spawnSync('npm', ['audit', '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  // npm audit exits nonzero whenever findings exist; only the JSON body decides.
  try {
    return JSON.parse(run.stdout) as AuditReport;
  } catch {
    return { error: `npm audit exit ${run.status}: ${(run.stderr || run.stdout || String(run.error)).slice(0, 300)}` };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(import.meta.dirname, '..');
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as Lockfile;
  const file = JSON.parse(readFileSync(join(root, 'security', 'audit-exceptions.json'), 'utf8')) as ExceptionsFile;
  const result = evaluate(runAudit(root), lock, file, new Date().toISOString().slice(0, 10));
  console.log(summary(result));
  process.exitCode = result.ok ? 0 : 1;
}
