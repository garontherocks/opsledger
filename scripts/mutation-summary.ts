// Summarises the Stryker report (reports/mutation/mutation.json) per mutated file (docs/mutation-testing.md).
//   node --experimental-strip-types scripts/mutation-summary.ts          write evidence/mutation-testing.json
//   node --experimental-strip-types scripts/mutation-summary.ts --check  fail if any file scores below its baseline
import { readFileSync, writeFileSync } from 'node:fs';

type Mutant = { status: string };
const report = JSON.parse(readFileSync('reports/mutation/mutation.json', 'utf8')) as {
  files: Record<string, { mutants: Mutant[] }>;
};
const EVIDENCE = 'evidence/mutation-testing.json';
/** Points a file may drop below its committed score before the check fails (timing-dependent mutants vary). */
const TOLERANCE = 1;

const count = (mutants: Mutant[], ...statuses: string[]) => mutants.filter(m => statuses.includes(m.status)).length;
const summarise = (mutants: Mutant[]) => {
  const detected = count(mutants, 'Killed', 'Timeout');
  const valid = detected + count(mutants, 'Survived', 'NoCoverage');
  return {
    mutants: mutants.length,
    killed: count(mutants, 'Killed'),
    timeout: count(mutants, 'Timeout'),
    survived: count(mutants, 'Survived'),
    noCoverage: count(mutants, 'NoCoverage'),
    score: valid ? Math.round((detected / valid) * 1000) / 10 : 100,
  };
};
const files = Object.fromEntries(
  Object.entries(report.files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, { mutants }]) => [file, summarise(mutants)]),
);
const summary = { total: summarise(Object.values(report.files).flatMap(f => f.mutants)), files };

if (process.argv.includes('--check')) {
  const baseline = JSON.parse(readFileSync(EVIDENCE, 'utf8')) as typeof summary;
  const drops = Object.entries(baseline.files)
    .filter(([file, b]) => (files[file]?.score ?? 0) < b.score - TOLERANCE)
    .map(([file, b]) => `${file}: ${files[file]?.score ?? 'missing'} < baseline ${b.score}`);
  for (const [file, s] of Object.entries(files)) console.log(`${file}: ${s.score}% (${s.survived} survived)`);
  if (drops.length) {
    console.error('Mutation score dropped below the committed baseline:\n' + drops.join('\n'));
    process.exit(1);
  }
  console.log(`Mutation score ${summary.total.score}% holds the baseline.`);
} else {
  writeFileSync(
    EVIDENCE,
    JSON.stringify(
      { at: new Date().toISOString(), tool: 'Stryker 10.1.1 (command runner, node:test)', ...summary },
      null,
      2,
    ) + '\n',
  );
  console.log(`Wrote ${EVIDENCE}: ${summary.total.score}%`);
}
