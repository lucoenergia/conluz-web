# Conluz Web

Web interface made in react to interact with [Conluz](https://github.com/lucoenergia/conluz)

# Getting started

To run the project for development you will need to have installed both node.js and npm. Then after cloning the repository run:

```sh
npm i
```

This will install all the required dependencies.

## Running the project

To run the project for development (with hot-reloading) use the command:

```sh
npm run dev
```

# Using dockerized version (Docker compose must be installed in the system)

```sh
cd docker
docker compose up -d
```

# Generating or updating API definitions
The models and methods to interact with the backend API are auto-generated from it's OpenAPI specification using [Orval](https://v5.orval.dev/). To update the definiton, the 'api-docs.json' must be updated (it can be downloaded from the swagger UI of a running instance of the backend). Once the definition has been updated the following command will re-generate the specification:
```sh
npm run generate-client  
```

# Environment variables
There is currently only one environment variable that can be configured:
```
CONLUZ_API_URL
```
This variable configures the URL of the backend to which the requests will be sent.

If new variables were to be included they must start with **CONLUZ_** in order to be recognized by the vite build system. Furthermore, they must be included in the *Dockerfile* like this:
```Dockerfile
ARG CONLUZ_<VARIABLE_NAME>="CONLUZ_<VARIABLE_NAME>"
```
In order to be hotswaped at the container startup. Further reading of the method used can be found [here](https://web.archive.org/web/20250922053729/https://dev.to/dutchskull/setting-up-dynamic-environment-variables-with-vite-and-docker-5cmj)
