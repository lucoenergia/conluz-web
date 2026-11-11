import { expect, type Page } from "@playwright/test";
import {
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_PLANT_ID,
} from "./data";
import {
  mockAllApiRoutes,
  mockHuaweiConfigRoutes,
  mockPlantProductionRoutes,
  mockPlantDetailRoutes,
} from "./routes";
import {
  ROUTE_MOUNT_TIMEOUT_MS,
  freezeClock,
  injectAuthToken,
  seedActiveCommunity,
  stabilizePage,
} from "./session";
import { waitForPageSettled } from "./test";

export async function navigateToSharingAgreements(page: Page) {
  await page.goto("/plants");

  // Waited for BEFORE stabilizing, not after. `stabilizePage` settles on
  // `networkidle`, which is not a "the app has rendered" signal: every page is
  // React.lazy, and while the dev server transforms a route's module subtree
  // there is no request in flight, so networkidle fires with #root still empty
  // behind the Suspense fallback. Stabilizing then would inject the
  // animation-killing stylesheet into a document that has not painted the
  // content yet, and the click below would hunt for an element that does not
  // exist — reported as a bare 30s timeout rather than "no plant row".
  // (The warm-up project removes the cold-transform cost; this makes the
  // helper honest about what it is waiting for either way.)
  // An explicit budget, not the 5 s expect default. This is not an assertion
  // about the product -- it waits for a lazy route to mount AND its plant list
  // to arrive, on a dev server shared with the other viewport project. Measured
  // at 909 ms median and 980 ms worst over 69 navigations on an idle machine;
  // the default left barely 5x headroom and was the first thing to break on a
  // busier one, reporting "no plant row" for what was really contention.
  // The row's kebab, named after the plant: the same in the table and in the
  // stacked list, so it holds on either viewport.
  const plantMenuButton = page.getByRole("button", { name: `Más acciones para ${FIXED_PLANT.name}` });
  await expect(plantMenuButton).toBeVisible({ timeout: ROUTE_MOUNT_TIMEOUT_MS });

  await stabilizePage(page);

  await plantMenuButton.click();
  await page.getByRole("menuitem", { name: /Acuerdos de Reparto/i }).click();

  // A click into another lazy, capability-guarded route. React Router renders a
  // navigation as a transition, so the old page stays up with no fallback while
  // the new one loads, and a quiet page is no sign the new one has arrived: its
  // own content is. Like the plant row above, that is a mount wait with the
  // mount budget; settling then lets its reads land before anything is clicked.
  await expect(page.getByText(/CAU:/)).toBeVisible({ timeout: ROUTE_MOUNT_TIMEOUT_MS });
  await waitForPageSettled(page);
  await stabilizePage(page);
}

export async function navigateToSharingAgreementDetail(page: Page, agreementName: string) {
  await navigateToSharingAgreements(page);

  // The row's title is its only link, the same in the table and in the stacked list.
  await page.getByRole("main").getByRole("link", { name: agreementName, exact: true }).click();
  // The pointer stays where the row's title was, which on the detail page is
  // over whatever lands there; parked in the corner, nothing is captured hovered.
  await page.mouse.move(0, 0);

  // The file panel's title always renders on load regardless of file/coefficient
  // state, so it's a reliable "detail page finished loading" signal across every
  // fixture — unlike the coefficient sum, which is absent when coefficients is empty.
  // One wording in every status now: the panel no longer switches to
  // "Fichero enviado a la distribuidora" once the agreement is published.
  // A mount wait like the one in navigateToSharingAgreements, for the same reason.
  await expect(page.getByRole("heading", { name: "Fichero para la distribuidora" })).toBeVisible({
    timeout: ROUTE_MOUNT_TIMEOUT_MS,
  });
  await waitForPageSettled(page);
  await stabilizePage(page);
}

export async function openPlantDetail(
  page: Page,
  currentUser = FIXED_COMMUNITY_ADMIN_USER,
  huawei: Omit<Parameters<typeof mockHuaweiConfigRoutes>[1], "currentUser"> = {},
  production: Omit<Parameters<typeof mockPlantProductionRoutes>[1], "currentUser"> = {},
  search = "",
) {
  // "Hoy, según el inversor" draws its "Ahora" mark at the browser's now.
  await freezeClock(page);
  await injectAuthToken(page);
  await seedActiveCommunity(page, currentUser.id);
  await mockAllApiRoutes(page, currentUser);
  await mockPlantDetailRoutes(page, currentUser);
  // A caller who may manage the plant gets its integrations section, which
  // reads the Huawei configuration (#192). Without this route the read would
  // fall to mockPlantDetailRoutes and come back as the plant itself.
  await mockHuaweiConfigRoutes(page, { ...huawei, currentUser });
  // The production sections (#406), registered after mockPlantDetailRoutes for the same reason.
  await mockPlantProductionRoutes(page, { ...production, currentUser });

  await page.goto(`/plants/${FIXED_PLANT_ID}${search}`);
  await expect(page.getByRole("heading", { level: 1, name: FIXED_PLANT.name })).toBeVisible();
  await stabilizePage(page);
}
