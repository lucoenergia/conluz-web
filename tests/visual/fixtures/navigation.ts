import { expect, type Page } from "@playwright/test";
import {
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_PLANT_ID,
} from "./data";
import {
  mockAllApiRoutes,
  mockPlantDetailRoutes,
} from "./routes";
import {
  injectAuthToken,
  seedActiveCommunity,
  stabilizePage,
} from "./session";

export async function navigateToSharingAgreements(page: Page) {
  await page.goto("/production");

  // Waited for BEFORE stabilizing, not after. `stabilizePage` settles on
  // `networkidle`, which is not a "the app has rendered" signal: every page is
  // React.lazy, and while the dev server transforms a route's module subtree
  // there is no request in flight, so networkidle fires with #root still empty
  // behind the Suspense fallback. Stabilizing then would inject the
  // animation-killing stylesheet into a document that has not painted the
  // content yet, and the click below would hunt for an element that does not
  // exist — reported as a bare 30s timeout rather than "no plant card".
  // (The warm-up project removes the cold-transform cost; this makes the
  // helper honest about what it is waiting for either way.)
  const plantCard = page.locator(".MuiCard-root").filter({ hasText: FIXED_PLANT.name });
  await expect(plantCard).toBeVisible();

  await stabilizePage(page);

  // Named, not a bare getByRole("button"): the card grows controls over time,
  // and an unnamed role query would start matching whichever one came first.
  await plantCard.getByRole("button", { name: `Más acciones para ${FIXED_PLANT.name}` }).click();
  await page.getByRole("menuitem", { name: /Acuerdos de Reparto/i }).click();

  await expect(page.getByText(/CAU:/)).toBeVisible();
  await stabilizePage(page);
}

export async function navigateToSharingAgreementDetail(page: Page, agreementName: string) {
  await navigateToSharingAgreements(page);

  const agreementCard = page.locator(".MuiCard-root").filter({ hasText: agreementName });
  await agreementCard.getByRole("link", { name: agreementName }).click();

  // The file panel's title always renders on load regardless of file/coefficient
  // state, so it's a reliable "detail page finished loading" signal across every
  // fixture — unlike the coefficient sum, which is absent when coefficients is empty.
  // One wording in every status now: the panel no longer switches to
  // "Fichero enviado a la distribuidora" once the agreement is published.
  await expect(page.getByRole("heading", { name: "Fichero para la distribuidora" })).toBeVisible();
  await stabilizePage(page);
}

export async function openPlantDetail(page: Page) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
  await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockPlantDetailRoutes(page);

  await page.goto(`/production/${FIXED_PLANT_ID}`);
  await expect(page.getByRole("heading", { level: 1, name: FIXED_PLANT.name })).toBeVisible();
  await stabilizePage(page);
}
