# solucio-emr

Frontend for the Solucio EMR. It is built with React, Vite and Tailwind CSS and deployed under `/emr/`.

## Develop locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The production deployment is handled by the parent EMR project's `deploy/deploy-vps.sh` script, which supplies the production API and app base paths at build time.
