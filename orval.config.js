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
