/**
 * Lists the visual tests Playwright marked flaky in its JSON report.
 *
 * In CI a failed visual test is retried once (playwright.config.ts). A test
 * that fails and then passes on the retry does not fail the job, so without
 * this script a flake would pass unnoticed. Each flaky test is written to the
 * job summary and emitted as a warning annotation, and the step output
 * `flaky=true` tells the workflow to upload the traces the retry recorded.
 *
 * Usage: node scripts/report-flaky-tests.mjs [report path]
 * (default reports/visual-results.json). Outside GitHub Actions, where
 * GITHUB_STEP_SUMMARY and GITHUB_OUTPUT are unset, it only prints.
 *
 * Reporting must never be what fails the job: a missing or unreadable report
 * is a notice, and the script always exits 0.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const DEFAULT_REPORT_PATH = "reports/visual-results.json";

/** Appends to a file named by an environment variable, when it is set. */
function appendToEnvFile(variable, text) {
  const path = process.env[variable];
  if (path) appendFileSync(path, text);
}

function notice(message) {
  console.log(`::notice title=Flaky visual tests::${escapeData(message)}`);
  appendToEnvFile("GITHUB_STEP_SUMMARY", `### Flaky visual tests\n\n${message}\n`);
  appendToEnvFile("GITHUB_OUTPUT", "flaky=false\n");
}

/** Escapes a workflow-command message so it stays on one annotation line. */
function escapeData(text) {
  return text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

/**
 * Walks the report's suite tree and collects every flaky test.
 *
 * Top-level suites are spec files, titled with the file name; the titles below
 * them are describe blocks. The full title joins those describe titles and the
 * test's own, the way the list reporter prints it.
 */
function collectFlaky(report) {
  const flaky = [];
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status === "flaky") {
          flaky.push({
            project: test.projectName,
            file: spec.file,
            title: [...titles, spec.title].join(" › "),
          });
        }
      }
    }
    for (const child of suite.suites ?? []) {
      walk(child, child.title ? [...titles, child.title] : titles);
    }
  };
  for (const fileSuite of report.suites ?? []) walk(fileSuite, []);
  return flaky;
}

function main() {
  const reportPath = process.argv[2] ?? DEFAULT_REPORT_PATH;
  if (!existsSync(reportPath)) {
    notice(`No report at \`${reportPath}\`: the visual tests did not run to completion.`);
    return;
  }

  const flaky = collectFlaky(JSON.parse(readFileSync(reportPath, "utf8")));
  if (flaky.length === 0) {
    console.log("No flaky visual tests.");
    appendToEnvFile("GITHUB_OUTPUT", "flaky=false\n");
    return;
  }

  for (const { project, title } of flaky) {
    console.log(`::warning title=Flaky visual test::${escapeData(`${project} › ${title}`)}`);
  }
  const lines = flaky.map(({ project, file, title }) => `- **${project}** › \`${file}\` › ${title}`);
  appendToEnvFile(
    "GITHUB_STEP_SUMMARY",
    [
      "### Flaky visual tests",
      "",
      `${flaky.length} test(s) failed and then passed on retry. A flake is a defect to follow up, not noise: ` +
        "check it with a manual run (`repeat_each = 20`) and open an issue. Traces are in the `playwright-flaky-traces` artifact.",
      "",
      ...lines,
      "",
    ].join("\n"),
  );
  appendToEnvFile("GITHUB_OUTPUT", "flaky=true\n");
}

try {
  main();
} catch (error) {
  try {
    notice(`Could not read the visual test report: ${error instanceof Error ? error.message : String(error)}`);
  } catch {
    // Reporting must never fail the job.
  }
}
process.exitCode = 0;
