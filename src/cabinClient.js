import { appConfig } from "./config";
import { createCabinApiRepository } from "./cabinApiRepository";

let clientCache;

export function isCabinApiConfigured() {
  return true;
}

export async function getCabinClient() {
  if (clientCache) {
    return clientCache;
  }

  clientCache = {
    repository: createCabinApiRepository({
      baseUrl: appConfig.api.baseUrl,
    }),
  };

  return clientCache;
}

export function resetCabinClientForTests() {
  clientCache = undefined;
}
