import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type {
  CommunityCapabilitiesResponse,
  ImportSuppliesResponse,
  RestErrorDetailCode,
  SupplyResponse,
} from "../../api/models";
import { restError } from "../members/MembersPage.testUtils";
import { VISIBLE } from "../../test/visibleText";
import { SupplyPointsPage } from "./SupplyPointsPage";

/**
 * Importing supplies from a CSV file (lucoenergia/conluz#532), against routed
 * requests.
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees the multipart request the import
 * sends and the list the page reads again afterwards.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const SUPPLIES_URL = `${COMMUNITY_URL}/supplies`;
const IMPORT_URL = `${SUPPLIES_URL}/import`;
const DIALOG_NAME = `Importar puntos de suministro en ${COMMUNITY_NAME}`;

const CALLER = buildCurrentUser({
  id: "admin",
  fullName: "Ada Admin",
  memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" },
});

const communityWith = (capabilities: Partial<CommunityCapabilitiesResponse>) =>
  buildCommunity({
    id: COMMUNITY_ID,
    name: COMMUNITY_NAME,
    capabilities: buildCommunityCapabilities({ canRead: true, canListSupplies: true, ...capabilities }),
  });

const supplyRow = (id: string, name: string): SupplyResponse =>
  buildSupply({
    id,
    code: `ES00210000000000${id.toUpperCase()}`,
    name,
    community: { id: COMMUNITY_ID, name: COMMUNITY_NAME },
    capabilities: buildSupplyCapabilities({ canRead: true }),
  });

const CASA = supplyRow("aa", "Casa");

// Invented supplies: what the file carries.
const CSV = [
  "code;address;personalId;addressRef;name",
  "ES0031300119158001DL0F;Calle Mayor 1;12345678Z;;Casa del pueblo",
  ";Calle Mayor 2;12345678Z;;",
].join("\r\n");
const csvFile = () => new File([CSV], "puntos.csv", { type: "text/csv" });

/** One created row, one invalid, and one already in the community, as the backend answers. */
const RESULT: ImportSuppliesResponse = {
  created: 1,
  failed: 2,
  rows: [
    { line: 2, outcome: "CREATED", code: null, message: null, errors: [] },
    {
      line: 3,
      outcome: "FAILED",
      code: "SUPPLY_IMPORT_ROW_INVALID",
      message: "TEST-SERVER-MESSAGE",
      errors: [
        { column: "code", constraint: "REQUIRED", params: {} },
        { column: "code", constraint: "INVALID_CUPS", params: {} },
      ],
    },
    { line: 4, outcome: "FAILED", code: "SUPPLY_ALREADY_EXISTS", message: "TEST-SERVER-MESSAGE", errors: [] },
  ],
};

const ALL_CREATED: ImportSuppliesResponse = {
  created: 2,
  failed: 0,
  rows: [
    { line: 2, outcome: "CREATED", code: null, message: null, errors: [] },
    { line: 3, outcome: "CREATED", code: null, message: null, errors: [] },
  ],
};

type Listed = { current: SupplyResponse[] };

function serve(
  importSupplies: (config: RequestConfig) => unknown,
  listed: Listed = { current: [CASA] },
  community = communityWith({ canManage: true }),
): RequestRouter {
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => CALLER },
    { method: "GET", url: "/api/v1/communities", respond: () => [community] },
    { method: "GET", url: COMMUNITY_URL, respond: () => community },
    {
      method: "GET",
      url: SUPPLIES_URL,
      respond: () => ({
        items: listed.current,
        size: 10000,
        totalElements: listed.current.length,
        totalPages: 1,
        number: 0,
      }),
    },
    { method: "POST", url: IMPORT_URL, respond: importSupplies },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const unexpected = () => {
  throw new Error("unexpected import");
};

const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

const renderPage = async () => {
  renderWithProviders(<SupplyPointsPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByRole("link", { name: "Casa" });
};

async function openImport(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: "Importar CSV" }));
  return screen.findByRole("dialog", { name: DIALOG_NAME });
}

async function importFile(u: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, file = csvFile()) {
  await u.upload(within(dialog).getByLabelText("Seleccionar archivo CSV"), file);
  await u.click(within(dialog).getByRole("button", { name: "Importar" }));
}

/** The refusal: the dialog's only alert once the import failed, found by waiting for the guide to come back. */
async function refusalIn(dialog: HTMLElement) {
  await within(dialog).findByRole("button", { name: "Importar" });
  const alerts = within(dialog).getAllByRole("alert");
  expect(alerts).toHaveLength(1);
  return alerts[0];
}

const failedRows = (dialog: HTMLElement) =>
  within(within(dialog).getByRole("list", { name: "Filas no creadas" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

beforeEach(() => {
  mockCustomInstance.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("who is offered the import", () => {
  it("offers it with the community's canManage", async () => {
    serve(unexpected);
    await renderPage();

    expect(screen.getByRole("button", { name: "Importar CSV" })).toBeInTheDocument();
  });

  it("offers no import without the community's canManage", async () => {
    serve(unexpected, undefined, communityWith({ canManage: false }));
    await renderPage();

    expect(screen.queryByRole("button", { name: "Importar CSV" })).not.toBeInTheDocument();
  });
});

describe("the import guide", () => {
  it("UI-SUP-007 names the community, and offers the template, Cancelar and Importar", async () => {
    const u = userEvent.setup();
    serve(unexpected);
    await renderPage();

    const dialog = await openImport(u);

    expect(within(dialog).getByRole("heading", { name: DIALOG_NAME })).toBeInTheDocument();
    expect(within(dialog).getByText(`Comunidad · ${COMMUNITY_NAME}`)).toBeInTheDocument();
    expect(within(dialog).getByRole("note")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Descargar plantilla",
      "Seleccionar archivo CSV",
      "Cancelar",
      "Importar",
    ]);
    expect(within(dialog).getByRole("button", { name: "Importar" })).toBeDisabled();
  });

  it("UI-SUP-007 explains each column: its header, whether it is required, what it is, and an example", async () => {
    const u = userEvent.setup();
    serve(unexpected);
    await renderPage();

    const dialog = await openImport(u);
    const columns = within(within(dialog).getByRole("list", { name: "Columnas del archivo" })).getAllByRole("listitem");

    expect(columns.map((c) => within(c).getByText(/^[a-zA-Z]+$/, { selector: "code" }).textContent)).toEqual([
      "code",
      "address",
      "personalId",
      "addressRef",
      "name",
    ]);
    expect(columns.map((c) => (within(c).queryByText("Obligatoria") ? "Obligatoria" : "Opcional"))).toEqual([
      "Obligatoria",
      "Obligatoria",
      "Obligatoria",
      "Opcional",
      "Opcional",
    ]);
    expect(columns.map((c) => c.textContent)).toEqual([
      "codeObligatoriaEl CUPS del punto de suministro, de 20 o 22 caracteres.Ejemplo: ES0031300119158001DL0F",
      "addressObligatoriaLa dirección del punto de suministro.Ejemplo: Calle Mayor 1, Luco de Jiloca",
      "personalIdObligatoriaEl DNI, NIE o NIF del titular, que tiene que ser miembro de la comunidad. Los espacios, puntos y guiones no cuentan.Ejemplo: 12345678Z",
      "addressRefOpcionalLa referencia catastral del punto de suministro.Ejemplo: 9872023VH5797S0001WX",
      "nameOpcionalUn nombre para reconocer el punto. Si lo dejas vacío, se mostrará la dirección.Ejemplo: Casa del pueblo",
    ]);
  });

  it("UI-SUP-007 says the titular must already be a member, both Excel exports work, the limit, and that a repeat is safe", async () => {
    const u = userEvent.setup();
    serve(unexpected);
    await renderPage();

    const dialog = await openImport(u);
    const note = within(dialog).getByRole("note");

    expect(within(note).getByText(/tiene que ser ya miembro de la comunidad/)).toHaveTextContent(
      "importa primero los miembros",
    );
    expect(within(note).getByText(/«CSV UTF-8» y «CSV \(delimitado por punto y coma\)»/)).toHaveTextContent(
      "«Texto Unicode» no sirve",
    );
    expect(within(note).getByText(/hasta 1000 puntos de suministro por archivo/)).toBeInTheDocument();
    expect(within(note).getByText(/volver a importar el mismo archivo sin problema/)).toBeInTheDocument();
  });

  it("UI-SUP-007 downloads a template that is exactly the header line, after a UTF-8 byte order mark", async () => {
    const u = userEvent.setup();
    const r = serve(unexpected);
    await renderPage();
    const blobs: Blob[] = [];
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return "blob:template";
      }),
      revokeObjectURL: vi.fn(),
    });
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });

    const dialog = await openImport(u);
    await u.click(within(dialog).getByRole("button", { name: "Descargar plantilla" }));
    vi.unstubAllGlobals();

    expect(downloads).toEqual(["plantilla-puntos-de-suministro.csv"]);
    expect(blobs).toHaveLength(1);
    // jsdom's Blob has no arrayBuffer(); FileReader reads the bytes as they are.
    const bytes = await new Promise<Uint8Array>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(blobs[0]);
    });
    const expected = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("code;address;personalId;addressRef;name\r\n"),
    ]);
    expect(Array.from(bytes)).toEqual(Array.from(expected));
    // A download, not a request: nothing was sent.
    expect(requestsTo(r, "POST", IMPORT_URL)).toEqual([]);
  });
});

describe("importing a file", () => {
  it("UI-SUP-008 sends the file as the `file` part to the community's import", async () => {
    const u = userEvent.setup();
    const file = csvFile();
    const r = serve(() => RESULT);
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog, file);

    await waitFor(() => expect(requestsTo(r, "POST", IMPORT_URL)).toHaveLength(1));
    const body = requestsTo(r, "POST", IMPORT_URL)[0].data;
    expect(body).toBeInstanceOf(FormData);
    expect([...(body as FormData).keys()]).toEqual(["file"]);
    expect((body as FormData).get("file")).toBe(file);
  });

  it("UI-SUP-008 shows the counts, and each failed row with its line and a reason built from its code and errors", async () => {
    const u = userEvent.setup();
    serve(() => RESULT);
    await renderPage();

    const dialog = await openImport(u);
    // Announced through a region in place, empty, from the moment the dialog opens.
    const region = within(dialog).getByRole("status");
    expect(region).toHaveTextContent(/^$/);
    await importFile(u, dialog);

    const summary = "Se ha creado 1 punto de suministro. 2 filas tienen errores.";
    expect(await within(dialog).findByText(summary, VISIBLE)).toBeInTheDocument();
    expect(region).toHaveTextContent(summary);
    expect(failedRows(dialog)).toEqual([
      "Línea 3: CUPS: es obligatorio. CUPS: tiene que tener 20 o 22 caracteres, sin espacios.",
      "Línea 4: Ya hay un punto de suministro con este CUPS en la comunidad.",
    ]);
    expect(within(dialog).queryByText(/TEST-SERVER-MESSAGE/)).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Importar otro archivo",
      "Cerrar",
    ]);
  });

  it("UI-SUP-008 shows a success note with the count when no row failed", async () => {
    const u = userEvent.setup();
    serve(() => ALL_CREATED);
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    expect(await within(dialog).findByText("Se han creado 2 puntos de suministro.", VISIBLE)).toBeInTheDocument();
    expect(within(dialog).queryByRole("list", { name: "Filas no creadas" })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Importar otro archivo",
      "Cerrar",
    ]);
  });

  it("UI-SUP-008 refreshes the supply list once the import has answered", async () => {
    const u = userEvent.setup();
    const listed: Listed = { current: [CASA] };
    const r = serve(() => {
      listed.current = [...listed.current, supplyRow("bb", "Casa del pueblo")];
      return RESULT;
    }, listed);
    await renderPage();
    const readsBefore = requestsTo(r, "GET", SUPPLIES_URL).length;

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await within(dialog).findByText(/Se ha creado 1 punto de suministro/, VISIBLE);

    await waitFor(() => expect(requestsTo(r, "GET", SUPPLIES_URL).length).toBeGreaterThan(readsBefore));
    await u.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(await screen.findByRole("link", { name: "Casa del pueblo" })).toBeInTheDocument();
  });

  it("UI-MBR-021 shows progress while the import runs, and cannot be closed until it ends", async () => {
    const u = userEvent.setup();
    let answer: (value: ImportSuppliesResponse) => void = () => {};
    serve(() => new Promise<ImportSuppliesResponse>((resolve) => (answer = resolve)));
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    expect(await within(dialog).findByText(/Importando puntos de suministro/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button")).not.toBeInTheDocument();
    // Dispatched on the dialog itself: a key pressed on the body would never
    // reach the dialog, proving nothing.
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeInTheDocument();

    answer(RESULT);
    expect(await within(dialog).findByText(/Se ha creado 1 punto de suministro/, VISIBLE)).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("UI-SUP-008 starts again from the guide with «Importar otro archivo»", async () => {
    const u = userEvent.setup();
    serve(() => RESULT);
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await u.click(await within(dialog).findByRole("button", { name: "Importar otro archivo" }));

    expect(within(dialog).getByRole("button", { name: "Importar" })).toBeDisabled();
    expect(within(dialog).getByRole("list", { name: "Columnas del archivo" })).toBeInTheDocument();
  });
});

describe("a file refused as a whole", () => {
  it.each<[RestErrorDetailCode, Record<string, string> | undefined, RegExp]>([
    ["SUPPLY_IMPORT_INVALID_ENCODING", undefined, /No se ha podido leer el archivo\. .*«Texto Unicode» no sirve\./],
    ["SUPPLY_IMPORT_AMBIGUOUS_SEPARATOR", undefined, /si las columnas se separan con «;» o con «,»/],
    ["SUPPLY_IMPORT_MALFORMED_FILE", undefined, /El archivo no es un CSV válido/],
    ["SUPPLY_IMPORT_UNKNOWN_HEADERS", { headers: "cups,owner" }, /Estas columnas no se reconocen: «cups», «owner»\./],
    ["SUPPLY_IMPORT_DUPLICATED_HEADERS", { headers: "code" }, /Estas columnas aparecen más de una vez: «code»\./],
    [
      "SUPPLY_IMPORT_MISSING_HEADERS",
      { headers: "address,personalId" },
      /Faltan estas columnas obligatorias: «address», «personalId»\./,
    ],
    ["SUPPLY_IMPORT_TOO_MANY_ROWS", { maxRows: "1000" }, /El archivo tiene más de 1000 filas\./],
  ])("UI-SUP-008 words %s, and says no supply was created", async (code, params, message) => {
    const u = userEvent.setup();
    serve(() => {
      throw restError(400, code, { params });
    });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    const alert = await refusalIn(dialog);
    expect(alert).toHaveTextContent(message);
    expect(alert).toHaveTextContent("No se ha creado ningún punto de suministro.");
    expect(alert).not.toHaveTextContent("refused");
    // Back at the guide, with the file still chosen, to try again once corrected.
    expect(within(dialog).getByText("puntos.csv")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Importar" })).toBeEnabled();
  });

  it("UI-SUP-008 says only that the import failed when the failure is not the file's", async () => {
    const u = userEvent.setup();
    serve(() => {
      throw restError(500, "SUPPLY_HAS_PLANTS");
    });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    const alert = await refusalIn(dialog);
    expect(alert).toHaveTextContent("No se ha podido importar el archivo. Inténtalo de nuevo.");
    expect(alert).not.toHaveTextContent("No se ha creado ningún punto de suministro.");
  });
});
