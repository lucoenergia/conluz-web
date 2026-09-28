export const conluz = {
  output: {
    mode: "tags-split",
    target: "src/api",
    schemas: "./src/api/models",
    client: "react-query",
    mock: false,
    override: {
      mutator: {
        path: "./src/api/custom-instance.ts",
        name: "customInstance",
      },
    },
  },
  // Keeps src/contracts/generatedMutationHooks.json in step with the client.
  // That file is the list the mutation guard rail in eslint.config.js reads, so
  // a new non-GET endpoint is restricted the moment the client is regenerated
  // instead of the day somebody notices.
  //
  // Orval catches and logs a failing hook rather than failing the run, so this
  // is convenience, not enforcement -- src/contracts/mutationHooks.spec.ts is
  // what actually fails when the list goes stale.
  hooks: {
    afterAllFilesWrite: {
      command: "node scripts/generate-mutation-hook-list.mjs",
      // A bare string command gets every generated file path appended as argv.
      // This script takes none, and a few hundred stray ones would bury its own
      // error output.
      injectGeneratedDirsAndFiles: false,
    },
  },
  input: {
    target: "./api-docs.json",
    // Without this, Orval drops the `type: [..., "null"]` sibling next to a
    // $ref and types a nullable nested object as the bare referenced type —
    // see orval-nullable-ref-transformer.js for the full explanation.
    override: {
      transformer: "./orval-nullable-ref-transformer.js",
    },
  },
};
