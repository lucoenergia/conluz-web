import { mkdtemp, readdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONLUZ_REPO_URL,
  documentUrl,
  parseArgs,
  parseLsRemote,
  sync,
  writeContract,
} from "./sync-api.mjs";

const ROOT = "/repo";
const MAIN_SHA = "1111111111111111111111111111111111111111";
const REMOTE_MAIN_SHA = "2222222222222222222222222222222222222222";
const LIGHTWEIGHT_TAG_SHA = "3333333333333333333333333333333333333333";
const TAG_OBJECT_SHA = "4444444444444444444444444444444444444444";
const PEELED_TAG_SHA = "5555555555555555555555555555555555555555";
const BRANCH_SHA = "6666666666666666666666666666666666666666";
const AMBIGUOUS_BRANCH_SHA = "7777777777777777777777777777777777777777";
const AMBIGUOUS_TAG_SHA = "8888888888888888888888888888888888888888";
const EXPLICIT_SHA = "abcdefabcdefabcdefabcdefabcdefabcdef0123";

/**
 * What `git ls-remote <repo> <ref>` prints for every ref the tests use, at
 * once: ls-remote matches the tail of each ref name, so real output for a
 * single pattern also carries unrelated refs, such as `refs/remotes/origin/main`.
 */
const LS_REMOTE_OUTPUT = [
  `${MAIN_SHA}\tHEAD`,
  `${MAIN_SHA}\trefs/heads/main`,
  `${REMOTE_MAIN_SHA}\trefs/remotes/origin/main`,
  `${BRANCH_SHA}\trefs/heads/feature/x`,
  `${LIGHTWEIGHT_TAG_SHA}\trefs/tags/1.0.99`,
  `${TAG_OBJECT_SHA}\trefs/tags/2.0.0`,
  `${PEELED_TAG_SHA}\trefs/tags/2.0.0^{}`,
  `${AMBIGUOUS_BRANCH_SHA}\trefs/heads/release`,
  `${AMBIGUOUS_TAG_SHA}\trefs/tags/release`,
  "",
].join("\n");

const DOCUMENT = '{"openapi":"3.1.0","info":{"title":"conluz","version":"1"},"paths":{}}';

function response(status, body = "") {
  const bytes = new TextEncoder().encode(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

/** An in-memory file system that records every call, in order. */
function fakeFs({ failRename = false } = {}) {
  const files = new Map();
  const calls = [];
  return {
    files,
    calls,
    writeFile: vi.fn(async (path, data) => {
      calls.push(["writeFile", path]);
      files.set(path, Buffer.from(data));
    }),
    rename: vi.fn(async (from, to) => {
      calls.push(["rename", from, to]);
      if (failRename) throw new Error("EXDEV: cross-device link not permitted");
      files.set(to, files.get(from));
      files.delete(from);
    }),
    unlink: vi.fn(async (path) => {
      calls.push(["unlink", path]);
      files.delete(path);
    }),
  };
}

function deps({ body = DOCUMENT, status = 200, generateExitCode = 0, fs = fakeFs(), lsRemote, fetch } = {}) {
  return {
    lsRemote: lsRemote ?? vi.fn(async () => LS_REMOTE_OUTPUT),
    fetch: fetch ?? vi.fn(async () => response(status, body)),
    fs,
    runGenerateClient: vi.fn(async () => generateExitCode),
    log: vi.fn(),
  };
}

/** No file was written or renamed, and the client was not regenerated. */
function expectNothingChanged(d) {
  expect(d.fs.writeFile).not.toHaveBeenCalled();
  expect(d.fs.rename).not.toHaveBeenCalled();
  expect(d.fs.files.size).toBe(0);
  expect(d.runGenerateClient).not.toHaveBeenCalled();
}

describe("sync-api", () => {
  describe("AC1 — default ref", () => {
    it("AC1 — resolves conluz main to a SHA, downloads at that SHA, writes both files, then regenerates", async () => {
      const d = deps();

      const sha = await sync({ ref: parseArgs([]).ref, root: ROOT, deps: d });

      expect(sha).toBe(MAIN_SHA);
      expect(d.lsRemote).toHaveBeenCalledWith(CONLUZ_REPO_URL, "main");
      expect(d.fetch).toHaveBeenCalledWith(
        `https://raw.githubusercontent.com/lucoenergia/conluz/${MAIN_SHA}/src/main/resources/api/docs/api-docs.json`,
      );
      expect(d.fs.files.get(join(ROOT, "api-docs.json")).toString("utf8")).toBe(DOCUMENT);
      expect(d.fs.files.get(join(ROOT, ".api-ref")).toString("utf8")).toBe(`${MAIN_SHA}\n`);
      expect(d.runGenerateClient).toHaveBeenCalledTimes(1);
    });

    it("AC1 — writes through a temporary file in the same directory, renames it, then writes .api-ref, then regenerates", async () => {
      const fs = fakeFs();
      const d = deps({ fs });
      const generate = d.runGenerateClient;
      d.runGenerateClient = vi.fn(async () => {
        fs.calls.push(["generate-client"]);
        return generate();
      });

      await sync({ ref: "main", root: ROOT, deps: d });

      const [[, temporary], renameCall, apiRef, generateCall] = fs.calls;
      expect(fs.calls).toHaveLength(4);
      expect(temporary.startsWith(`${ROOT}/.api-docs.json.`)).toBe(true);
      expect(renameCall).toEqual(["rename", temporary, join(ROOT, "api-docs.json")]);
      expect(apiRef).toEqual(["writeFile", join(ROOT, ".api-ref")]);
      expect(generateCall).toEqual(["generate-client"]);
      expect(fs.files.has(temporary)).toBe(false);
    });
  });

  describe("AC2 — the SHA a ref points to", () => {
    it.each([
      ["a branch", "feature/x", BRANCH_SHA],
      ["a lightweight tag", "1.0.99", LIGHTWEIGHT_TAG_SHA],
      ["an annotated tag, peeled to its commit", "2.0.0", PEELED_TAG_SHA],
    ])("AC2 — %s resolves through ls-remote", async (_kind, ref, expected) => {
      const d = deps();

      const sha = await sync({ ref, root: ROOT, deps: d });

      expect(sha).toBe(expected);
      expect(d.lsRemote).toHaveBeenCalledWith(CONLUZ_REPO_URL, ref);
      expect(d.fetch).toHaveBeenCalledWith(documentUrl(expected));
      expect(d.fs.files.get(join(ROOT, ".api-ref")).toString("utf8")).toBe(`${expected}\n`);
    });

    it("AC2 — an annotated tag never resolves to the tag object's SHA", () => {
      expect(parseLsRemote(LS_REMOTE_OUTPUT, "2.0.0")).not.toBe(TAG_OBJECT_SHA);
    });

    it("AC2 — a 40-hex SHA is used as is, without ls-remote, lowercased", async () => {
      const d = deps();

      const sha = await sync({ ref: EXPLICIT_SHA.toUpperCase(), root: ROOT, deps: d });

      expect(sha).toBe(EXPLICIT_SHA);
      expect(d.lsRemote).not.toHaveBeenCalled();
      expect(d.fetch).toHaveBeenCalledWith(documentUrl(EXPLICIT_SHA));
    });

    it("AC2 — only refs/heads and refs/tags count; refs/remotes/origin/main is ignored", () => {
      expect(parseLsRemote(LS_REMOTE_OUTPUT, "main")).toBe(MAIN_SHA);
    });

    it("AC2 — a ref matching both a branch and a tag fails and asks for a full SHA", async () => {
      const d = deps();

      await expect(sync({ ref: "release", root: ROOT, deps: d })).rejects.toThrow(
        /`release` matches both a branch and a tag.*full 40-character SHA.*No file was changed/,
      );
      expectNothingChanged(d);
    });
  });

  describe("AC3 — unknown ref", () => {
    it("AC3 — unknown ref fails, names the ref and changes no file", async () => {
      const d = deps();

      const failure = sync({ ref: "no-such-branch", root: ROOT, deps: d });

      await expect(failure).rejects.toThrow(/Ref `no-such-branch` was not found in lucoenergia\/conluz\. No file was changed/);
      expect(d.fetch).not.toHaveBeenCalled();
      expectNothingChanged(d);
    });

    it("AC3 — a ref that only matches refs/remotes is unknown", async () => {
      const d = deps({ lsRemote: vi.fn(async () => `${MAIN_SHA}\tHEAD\n${REMOTE_MAIN_SHA}\trefs/remotes/origin/other\n`) });

      await expect(sync({ ref: "other", root: ROOT, deps: d })).rejects.toThrow(/`other` was not found/);
      expectNothingChanged(d);
    });

    it("AC3 — an unknown abbreviated SHA says abbreviated SHAs are not supported", async () => {
      const d = deps();

      await expect(sync({ ref: "abcdef1", root: ROOT, deps: d })).rejects.toThrow(
        /`abcdef1` was not found.*abbreviated SHAs are not supported; pass the full 40-character SHA/i,
      );
      expectNothingChanged(d);
    });

    it("AC3 — a failing ls-remote names the ref and changes no file", async () => {
      const d = deps({ lsRemote: vi.fn(async () => Promise.reject(new Error("Could not resolve host: github.com"))) });

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(
        /Could not query .* for ref `main`: Could not resolve host.*No file was changed/,
      );
      expectNothingChanged(d);
    });
  });

  describe("AC4 — document missing at the ref", () => {
    it("AC4 — HTTP 404 says refs older than lucoenergia/conluz#464 are not supported and changes no file", async () => {
      const d = deps({ status: 404, body: "404: Not Found" });

      await expect(sync({ ref: "1.0.99", root: ROOT, deps: d })).rejects.toThrow(
        /HTTP 404.*refs older than lucoenergia\/conluz#464 are not supported.*No file was changed/,
      );
      expectNothingChanged(d);
    });

    it("AC4 — any other HTTP failure changes no file", async () => {
      const d = deps({ status: 500 });

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(/HTTP 500.*No file was changed/);
      expectNothingChanged(d);
    });

    it("AC4 — a network failure during the download changes no file", async () => {
      const d = deps({ fetch: vi.fn(async () => Promise.reject(new Error("fetch failed"))) });

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(/Could not download .*fetch failed.*No file was changed/);
      expectNothingChanged(d);
    });
  });

  describe("AC5 — not an OpenAPI document", () => {
    it.each([
      ["a non-JSON body", "<html>rate limited</html>", /is not valid JSON/],
      ["JSON without openapi", '{"swagger":"2.0"}', /has no top-level `openapi` field/],
      ["openapi that is not a string", '{"openapi":3}', /has no top-level `openapi` field/],
      ["a JSON array", '[{"openapi":"3.1.0"}]', /has no top-level `openapi` field/],
      ["JSON null", "null", /has no top-level `openapi` field/],
    ])("AC5 — %s fails and changes no file", async (_kind, body, message) => {
      const d = deps({ body });

      const error = await sync({ ref: "main", root: ROOT, deps: d }).catch((e) => e);

      expect(error.message).toMatch(message);
      expect(error.message).toMatch(/No file was changed/);
      expectNothingChanged(d);
    });
  });

  describe("AC6 — generate-client fails after the write", () => {
    it("AC6 — fails, reporting that api-docs.json and .api-ref were updated and the client was not", async () => {
      const d = deps({ generateExitCode: 1 });

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(
        new RegExp(
          `generate-client\` failed \\(1\\)\\. api-docs\\.json and \\.api-ref were updated to conluz commit ${MAIN_SHA}; ` +
            "the client in src/api/ was NOT regenerated",
        ),
      );
      expect(d.fs.files.get(join(ROOT, "api-docs.json")).toString("utf8")).toBe(DOCUMENT);
      expect(d.fs.files.get(join(ROOT, ".api-ref")).toString("utf8")).toBe(`${MAIN_SHA}\n`);
    });

    it("AC6 — a generate-client that cannot start is reported the same way", async () => {
      const d = deps();
      d.runGenerateClient = vi.fn(async () => Promise.reject(new Error("spawn npm ENOENT")));

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(
        /failed \(spawn npm ENOENT\)\. api-docs\.json and \.api-ref were updated.*NOT regenerated/,
      );
    });
  });

  describe("atomic write", () => {
    it("a failed rename removes the temporary file and leaves api-docs.json and .api-ref untouched", async () => {
      const fs = fakeFs({ failRename: true });
      const d = deps({ fs });

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(
        /Could not write api-docs\.json: EXDEV.*No file was changed/,
      );
      expect(fs.files.size).toBe(0);
      expect(fs.unlink).toHaveBeenCalledWith(fs.calls[0][1]);
      expect(fs.calls.some(([, path]) => path === join(ROOT, ".api-ref"))).toBe(false);
      expect(d.runGenerateClient).not.toHaveBeenCalled();
    });

    it("a failed .api-ref write says api-docs.json was updated and .api-ref and src/api/ were not", async () => {
      const fs = fakeFs();
      const write = fs.writeFile.getMockImplementation();
      fs.writeFile.mockImplementation(async (path, data) => {
        if (path.endsWith(".api-ref")) throw new Error("EACCES");
        return write(path, data);
      });
      const d = deps({ fs });

      await expect(sync({ ref: "main", root: ROOT, deps: d })).rejects.toThrow(
        /api-docs\.json was updated to conluz commit .*\.api-ref could not be written: EACCES.*\.api-ref and src\/api\/ were not updated/,
      );
      expect(d.runGenerateClient).not.toHaveBeenCalled();
    });

    describe("on a real directory", () => {
      let directory;
      afterEach(async () => {
        if (directory) await rm(directory, { recursive: true, force: true });
      });

      it("writes the downloaded bytes exactly, without reformatting, and leaves no temporary file", async () => {
        directory = await mkdtemp(join(tmpdir(), "sync-api-"));
        // Minified, non-ASCII, no trailing newline: any re-serialisation would change it.
        const bytes = Buffer.from('{"openapi":"3.1.0","info":{"title":"Comunidad energética ⚡"},"x":1.50}', "utf8");

        await writeContract({ bytes, sha: MAIN_SHA, root: directory, fs: { writeFile, rename, unlink } });

        expect((await readFile(join(directory, "api-docs.json"))).equals(bytes)).toBe(true);
        expect(await readFile(join(directory, ".api-ref"), "utf8")).toBe(`${MAIN_SHA}\n`);
        expect((await readdir(directory)).sort()).toEqual([".api-ref", "api-docs.json"]);
      });
    });
  });

  describe("arguments", () => {
    it("defaults to main", () => {
      expect(parseArgs([])).toEqual({ ref: "main" });
    });

    it("accepts --ref <ref> and --ref=<ref>", () => {
      expect(parseArgs(["--ref", "1.0.99"])).toEqual({ ref: "1.0.99" });
      expect(parseArgs(["--ref=feature/x"])).toEqual({ ref: "feature/x" });
    });

    it.each([
      [["--branch", "main"], /Unknown argument `--branch`/],
      [["--ref"], /--ref needs a value/],
      [["--ref="], /--ref needs a value/],
      [["--ref", "--upload-pack=evil"], /cannot start with "-"/],
    ])("refuses %j", (argv, message) => {
      expect(() => parseArgs(argv)).toThrow(message);
    });
  });
});
