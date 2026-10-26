import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "snackpoint-api";
export default defineRailway(() => {
  const snackpointApi = service("snackpoint-api", {
    source: github("Muecahitbyr/Snackpoint", { branch: "main", checkSuites: false }),
    build: { buildCommand: "echo 'API-Dienst: kein Frontend-Build nötig (läuft auf Cloudflare)'", buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/server/**", "/package.json", "/package-lock.json"] },
    start: "npm run start:api",
    healthcheck: "/api/health",
    healthcheckTimeout: 60,
    preDeploy: "npm run release",
    replicas: { "ams": 1 },
  });

  return project("snackpoint", {
    variables: { managed: false },
    resources: [snackpointApi],
  });
});
