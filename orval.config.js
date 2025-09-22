export const conluz = {
  output: {
    mode: "tags-split",
    target: "src/api",
    schemas: "./src/api/models",
    client: "react-query",
    mock: true,
    override: {
      mutator: {
        path: "./src/api/custom-instance.ts",
        name: "customInstance",
      },
    },
  },
  input: {
    target: "./api-docs.json",
  },
};
