export const conluz = {
  output: {
    mode: 'tags-split',
    target: 'src/api',
    schemas: './src/api/models',
    client: 'react-query',
    mock: true,
  },
  input: {
    target: './api-docs.json',
  },
};
