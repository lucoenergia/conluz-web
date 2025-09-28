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

You can run the application using `docker compose` command:

```sh
cd docker
docker compose up -d
```

## Using locally generated image
You can configure the `docker-compose.yml` file for using a locally generated image by using:

```
build:
  context: ..
  dockerfile: docker/Dockerfile
```

## Using GitHub hosted image
Every time new code is pushed to `main` branch, a new image with ID `ghcr.io/lucoenergia/conluz-web:latest` is generated and uploaded to GitHub Container Registry. So, this image can be also configued in the `docker-compose.yml`.

To be able to download the image, you have to first login to GitHub Container Registry using this command:
```
echo <YOUR_GITHUB_TOKEN> | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin
```
Replace <YOUR_GITHUB_TOKEN> with a [GitHub personal access token](The error means you are not authorized to pull the image from [GitHub Container Registry](https://ghcr.io).  
This usually happens if the image is private or requires authentication.

**To be authorized:**

1. **Log in to GitHub Container Registry:**

   ```sh
   echo <YOUR_GITHUB_TOKEN> | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin
   ```

   - Replace `<YOUR_GITHUB_TOKEN>` with a [GitHub personal access token](https://github.com/settings/tokens) that has `read:packages` scope.
   - Replace `<YOUR_GITHUB_USERNAME>` with your GitHub username.

2. **Try pulling the image again:**

   ```sh
   docker compose pull
   ```

If the image is public, you should not need authentication. If it’s private, you must log in as shown above.) that has `read:packages` scope.
Replace <YOUR_GITHUB_USERNAME> with your GitHub username.

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
