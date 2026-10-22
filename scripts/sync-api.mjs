/**
 * Syncs api-docs.json from lucoenergia/conluz at a git ref and regenerates the
 * client (#299).
 *
 * The contract the web is built against must be traceable to one backend
 * commit. A copy taken by hand from a running backend's Swagger UI can come
 * from an unmerged branch, and nothing records where it came from. This script
 * resolves the ref to a commit SHA, downloads the document conluz commits at
 * that SHA, writes it to api-docs.json byte for byte, records the SHA in
 * .api-ref and runs `npm run generate-client`.
 *
 * The document is always downloaded by SHA, never by the symbolic ref, so a
 * branch moving between the resolution and the download cannot make the file
 * and .api-ref disagree. conluz commits the document at its current path since
 * lucoenergia/conluz#464; older refs are not supported.
 *
 * Usage: node scripts/sync-api.mjs [--ref <tag|branch|sha>]   (default: main)
 *
 * Every step is an exported function with its I/O injected, so the spec can
 * exercise them without the network, git or the real files. The CLI entry
 * point at the bottom only wires them together.
 */
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const CONLUZ_REPO_URL = "https://github.com/lucoenergia/conluz.git";
export const DEFAULT_REF = "main";
export const API_DOCS_FILE = "api-docs.json";
export const API_REF_FILE = ".api-ref";

const BACKEND_ISSUE = "lucoenergia/conluz#464";
const NO_FILE_CHANGED = "No file was changed.";

export function documentUrl(sha) {
  return `https://raw.githubusercontent.com/lucoenergia/conluz/${sha}/src/main/resources/api/docs/api-docs.json`;
}

/** A failure whose message already says what failed and what was or was not changed. */
export class SyncError extends Error {}

/** Parses `--ref <ref>` or `--ref=<ref>`; anything else is refused. */
export function parseArgs(argv) {
  let ref = DEFAULT_REF;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--ref") {
      if (i + 1 >= argv.length) throw new SyncError(`--ref needs a value. ${NO_FILE_CHANGED}`);
      ref = argv[++i];
    } else if (arg.startsWith("--ref=")) {
      ref = arg.slice("--ref=".length);
    } else {
      throw new SyncError(`Unknown argument \`${arg}\`. Usage: sync-api [--ref <tag|branch|sha>]. ${NO_FILE_CHANGED}`);
    }
  }
  if (ref === "") throw new SyncError(`--ref needs a value. ${NO_FILE_CHANGED}`);
  // The ref is passed to `git ls-remote` as an argument; one that starts with
  // a dash would be read as an option.
  if (ref.startsWith("-")) throw new SyncError(`Invalid ref \`${ref}\`: a ref cannot start with "-". ${NO_FILE_CHANGED}`);
  return { ref };
}

const FULL_SHA = /^[0-9a-f]{40}$/i;
const ABBREVIATED_SHA = /^[0-9a-f]{7,39}$/i;

export function isSha(ref) {
  return FULL_SHA.test(ref);
}

/**
 * Picks the SHA a ref points to from `git ls-remote <repo> <ref>` output.
 *
 * ls-remote matches its pattern against the tail of every ref name, so the
 * output can hold unrelated refs (`refs/remotes/origin/main` for `main`); only
 * `refs/heads/<ref>` and `refs/tags/<ref>` count. An annotated tag is listed
 * twice: the tag object, then the commit it points to with a `^{}` suffix. The
 * document lives in the commit's tree, so the peeled SHA wins.
 */
export function parseLsRemote(output, ref) {
  const shas = new Map();
  for (const line of output.split("\n")) {
    const [sha, name] = line.trim().split(/\s+/);
    if (sha && name) shas.set(name, sha.toLowerCase());
  }

  const branch = shas.get(`refs/heads/${ref}`);
  const tag = shas.get(`refs/tags/${ref}^{}`) ?? shas.get(`refs/tags/${ref}`);

  if (branch && tag) {
    throw new SyncError(
      `Ref \`${ref}\` matches both a branch and a tag in lucoenergia/conluz; pass the full 40-character SHA instead. ${NO_FILE_CHANGED}`,
    );
  }
  const sha = branch ?? tag;
  if (!sha) {
    const hint = ABBREVIATED_SHA.test(ref)
      ? " Abbreviated SHAs are not supported; pass the full 40-character SHA."
      : "";
    throw new SyncError(`Ref \`${ref}\` was not found in lucoenergia/conluz.${hint} ${NO_FILE_CHANGED}`);
  }
  return sha;
}

/** A full SHA is used as is; any other ref is resolved with `git ls-remote`. */
export async function resolveRef(ref, { lsRemote }) {
  if (isSha(ref)) return ref.toLowerCase();

  let output;
  try {
    output = await lsRemote(CONLUZ_REPO_URL, ref);
  } catch (error) {
    throw new SyncError(`Could not query ${CONLUZ_REPO_URL} for ref \`${ref}\`: ${error.message} ${NO_FILE_CHANGED}`);
  }
  return parseLsRemote(output, ref);
}

/** Downloads the document at a SHA, as raw bytes so it is written exactly as committed. */
export async function downloadDocument(sha, { fetch }) {
  const url = documentUrl(sha);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new SyncError(`Could not download ${url}: ${error.message} ${NO_FILE_CHANGED}`);
  }
  if (response.status === 404) {
    throw new SyncError(
      `The API document does not exist at conluz commit ${sha} (HTTP 404 from ${url}). ` +
        `Either the commit does not exist or it predates ${BACKEND_ISSUE}; refs older than ${BACKEND_ISSUE} are not supported. ` +
        NO_FILE_CHANGED,
    );
  }
  if (!response.ok) {
    throw new SyncError(`Could not download ${url}: HTTP ${response.status}. ${NO_FILE_CHANGED}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** The download must be JSON with a top-level `openapi` string. */
export function validateDocument(bytes, sha) {
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new SyncError(`The document downloaded at conluz commit ${sha} is not valid JSON (${error.message}). ${NO_FILE_CHANGED}`);
  }
  if (document === null || typeof document !== "object" || Array.isArray(document) || typeof document.openapi !== "string") {
    throw new SyncError(
      `The document downloaded at conluz commit ${sha} has no top-level \`openapi\` field; it is not an OpenAPI document. ${NO_FILE_CHANGED}`,
    );
  }
}

/**
 * Writes api-docs.json through a temporary file in the same directory and a
 * rename, so a failure or an interrupted run never leaves it half written; then
 * writes .api-ref. The temporary file name is ignored by .gitignore in case a
 * killed run leaves one behind.
 */
export async function writeContract({ bytes, sha, root, fs }) {
  const target = join(root, API_DOCS_FILE);
  const temporary = join(root, `.${API_DOCS_FILE}.${process.pid}.tmp`);
  try {
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.unlink(temporary).catch(() => {});
    throw new SyncError(`Could not write ${API_DOCS_FILE}: ${error.message} ${NO_FILE_CHANGED}`);
  }

  try {
    await fs.writeFile(join(root, API_REF_FILE), `${sha}\n`);
  } catch (error) {
    throw new SyncError(
      `${API_DOCS_FILE} was updated to conluz commit ${sha}, but ${API_REF_FILE} could not be written: ${error.message} ` +
        `${API_REF_FILE} and src/api/ were not updated.`,
    );
  }
}

/** Resolves, downloads, validates, writes and regenerates. Returns the SHA synced. */
export async function sync({ ref, root, deps }) {
  const sha = await resolveRef(ref, deps);
  deps.log(`Resolved conluz ref \`${ref}\` to ${sha}.`);

  const bytes = await downloadDocument(sha, deps);
  validateDocument(bytes, sha);
  await writeContract({ bytes, sha, root, fs: deps.fs });
  deps.log(`Wrote ${API_DOCS_FILE} and ${API_REF_FILE}. Regenerating the client...`);

  let exitCode;
  try {
    exitCode = await deps.runGenerateClient();
  } catch (error) {
    exitCode = error.message;
  }
  if (exitCode !== 0) {
    throw new SyncError(
      `\`npm run generate-client\` failed (${exitCode}). ${API_DOCS_FILE} and ${API_REF_FILE} were updated to conluz commit ${sha}; ` +
        `the client in src/api/ was NOT regenerated and may be partly written. Fix the cause and run \`make generate-client\`.`,
    );
  }
  return sha;
}

function lsRemote(repository, ref) {
  return new Promise((resolve, reject) => {
    execFile("git", ["ls-remote", repository, ref], (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

function runGenerateClient() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "generate-client"], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code, signal) => resolve(code ?? `signal ${signal}`));
  });
}

async function main() {
  try {
    if (!existsSync("package.json")) {
      throw new SyncError(`package.json not found. Run from the repository root. ${NO_FILE_CHANGED}`);
    }
    const { ref } = parseArgs(process.argv.slice(2));
    const sha = await sync({
      ref,
      root: process.cwd(),
      deps: {
        lsRemote,
        fetch: globalThis.fetch,
        fs: { writeFile, rename, unlink },
        runGenerateClient,
        log: (message) => console.log(`sync-api: ${message}`),
      },
    });
    console.log(`sync-api: synced api-docs.json and src/api/ from conluz commit ${sha}.`);
  } catch (error) {
    console.error(`sync-api: ${error instanceof SyncError ? error.message : error.stack}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
