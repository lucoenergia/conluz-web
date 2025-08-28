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
