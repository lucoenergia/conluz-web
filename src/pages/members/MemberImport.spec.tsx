import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import type { CommunityResponse, ImportMembersResponse, RestErrorDetailCode } from "../../api/models";
import {
  ADMIN_COMMUNITY,
  BULK_INVITE_URL,
  COMMUNITY_ID,
  COMMUNITY_NAME,
  IMPORT_URL,
  requestsTo,
  restError,
  rosterReads,
  rosterRow,
  serveMembersPage,
  writesSent,
  type Roster,
  type Writes,
} from "./MembersPage.testUtils";
import { MembersPage } from "./MembersPage";

/**
 * Importing members from a CSV file (#284), against routed requests.
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees the multipart request the import
 * sends, every other request the page makes, and the roster it refetches.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const ANA = rosterRow("u-ana", "Ana García", { acceptedAt: "2026-01-15T09:00:00Z" });

// Invented people: what the file carries, and what must never reach a log.
const PERSONAL_IDS = ["12345678Z", "X1234567L"];
const EMAILS = ["nuria@ejemplo.com", "pablo@ejemplo.com"];
const CSV = [
  "personalId;fullName;memberNumber;contactEmail;address;phoneNumber",
  `${PERSONAL_IDS[0]};Nuria Nueva;12;${EMAILS[0]};;`,
  `${PERSONAL_IDS[1]};;abc;${EMAILS[1]};;`,
].join("\r\n");
const csvFile = () => new File([CSV], "miembros.csv", { type: "text/csv" });

/** One registered row and one invalid, as the backend answers that file. */
const RESULT: ImportMembersResponse = {
  registered: 1,
  failed: 2,
  rows: [
    { line: 2, outcome: "REGISTERED", code: null, message: null, errors: [] },
    {
      line: 3,
      outcome: "FAILED",
      code: "MEMBERSHIP_IMPORT_ROW_INVALID",
      message: "TEST-SERVER-MESSAGE",
      errors: [
        { column: "fullName", constraint: "REQUIRED", params: {} },
        { column: "memberNumber", constraint: "NOT_AN_INTEGER", params: {} },
      ],
    },
    { line: 4, outcome: "FAILED", code: "MEMBERSHIP_ALREADY_EXISTS", message: "TEST-SERVER-MESSAGE", errors: [] },
  ],
};

const NOTHING_REGISTERED: ImportMembersResponse = { registered: 0, failed: 1, rows: [RESULT.rows[2]] };

const renderPage = async () => {
  renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText("Ana García");
};

const serve = (writes: Writes, community?: CommunityResponse, roster: Roster = { current: [ANA] }) =>
  serveMembersPage(mockCustomInstance, roster, writes, community);

async function openImport(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: "Importar miembros" }));
  return screen.findByRole("dialog", { name: `Importar miembros en ${COMMUNITY_NAME}` });
}

async function importFile(u: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, file = csvFile()) {
  await u.upload(within(dialog).getByLabelText("Seleccionar archivo CSV"), file);
  await u.click(within(dialog).getByRole("button", { name: "Importar" }));
}

/**
 * The refusal, among the dialog's alerts: MUI gives every Alert the role, the
 * guide's notes included. The refusal is the one that appeared once the import
 * failed, so it is found by waiting for the guide to come back, then picking
 * the alert that is not the notes.
 */
async function refusalIn(dialog: HTMLElement) {
  await within(dialog).findByRole("button", { name: "Importar" });
  const alerts = within(dialog).getAllByRole("alert");
  const notes = within(dialog).getByText(/registra a los miembros, pero no les envía nada/).closest('[role="alert"]');
  const others = alerts.filter((alert) => alert !== notes);
  expect(others).toHaveLength(1);
  return others[0];
}

const failedRows = (dialog: HTMLElement) =>
  within(within(dialog).getByRole("list", { name: "Filas no registradas" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

beforeEach(() => {
  mockCustomInstance.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the import guide", () => {
  it("UI-MBR-019 explains each column: its header, what it is, whether it is required, and an example", async () => {
    const u = userEvent.setup();
    serve({});
    await renderPage();

    const dialog = await openImport(u);
    const columns = within(within(dialog).getByRole("list", { name: "Columnas del archivo" })).getAllByRole("listitem");

    expect(columns.map((c) => within(c).getByText(/^[a-zA-Z]+$/, { selector: "code" }).textContent)).toEqual([
      "personalId",
      "fullName",
      "memberNumber",
      "contactEmail",
      "address",
      "phoneNumber",
    ]);
    expect(columns.map((c) => (within(c).queryByText("Obligatoria") ? "Obligatoria" : "Opcional"))).toEqual([
      "Obligatoria",
      "Obligatoria",
      "Opcional",
      "Opcional",
      "Opcional",
      "Opcional",
    ]);
    expect(within(columns[0]).getByText(/Los espacios, puntos y guiones no cuentan/)).toBeInTheDocument();
    expect(within(columns[0]).getByText("Ejemplo: 12345678Z")).toBeInTheDocument();
    expect(within(columns[2]).getByText(/un número entero, 0 o mayor/)).toBeInTheDocument();
    expect(within(columns[3]).getByText("Ejemplo: ana@ejemplo.com")).toBeInTheDocument();
    for (const column of columns) expect(within(column).getByText(/^Ejemplo: .+/)).toBeInTheDocument();
  });

  it("UI-MBR-020 says the import sends nothing, the DNI is normalised, both Excel exports work, the limit, and that a repeat is safe", async () => {
    const u = userEvent.setup();
    serve({});
    await renderPage();

    const dialog = await openImport(u);

    expect(within(dialog).getByText(/registra a los miembros, pero no les envía nada/)).toHaveTextContent(
      "«Enviar invitaciones pendientes»",
    );
    expect(within(dialog).getByText(/no importan los espacios, los puntos ni los guiones/)).toBeInTheDocument();
    expect(within(dialog).getByText(/«CSV UTF-8» y «CSV \(delimitado por punto y coma\)»/)).toHaveTextContent(
      "«Texto Unicode» no sirve",
    );
    expect(within(dialog).getByText(/hasta 1000 miembros por archivo/)).toBeInTheDocument();
    expect(within(dialog).getByText(/volver a importar el mismo archivo/)).toBeInTheDocument();
  });

  it("UI-MBR-019 downloads a template that is exactly the header line, after a UTF-8 byte order mark", async () => {
    const u = userEvent.setup();
    const r = serve({});
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

    expect(downloads).toEqual(["plantilla-miembros.csv"]);
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
      ...new TextEncoder().encode("personalId;fullName;memberNumber;contactEmail;address;phoneNumber\r\n"),
    ]);
    expect(Array.from(bytes)).toEqual(Array.from(expected));
    // A download, not a request: nothing was sent.
    expect(writesSent(r)).toEqual([]);
  });

  it("UI-MBR-021 cannot import until a file is chosen", async () => {
    const u = userEvent.setup();
    serve({});
    await renderPage();

    const dialog = await openImport(u);

    expect(within(dialog).getByRole("button", { name: "Importar" })).toBeDisabled();
  });
});

describe("importing a file", () => {
  it("UI-MBR-021 sends the file as the `file` part to the community's import, and nothing else", async () => {
    const u = userEvent.setup();
    const file = csvFile();
    const r = serve({ import: () => RESULT });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog, file);

    await waitFor(() => expect(requestsTo(r, "POST", IMPORT_URL)).toHaveLength(1));
    const body = requestsTo(r, "POST", IMPORT_URL)[0].data;
    expect(body).toBeInstanceOf(FormData);
    expect([...(body as FormData).keys()]).toEqual(["file"]);
    expect((body as FormData).get("file")).toBe(file);
    expect(writesSent(r)).toHaveLength(1);
  });

  it("UI-MBR-023 shows the counts, and each failed row with its line and a reason built from its errors", async () => {
    const u = userEvent.setup();
    serve({ import: () => RESULT });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    expect(await within(dialog).findByText(/Se ha registrado 1 miembro\./)).toHaveTextContent("2 filas tienen errores.");
    expect(failedRows(dialog)).toEqual([
      "Línea 3: Nombre completo: es obligatorio. Número de socio: tiene que ser un número entero.",
      "Línea 4: Ya es miembro de la comunidad.",
    ]);
    expect(within(dialog).queryByText(/TEST-SERVER-MESSAGE/)).not.toBeInTheDocument();
  });

  it("UI-MBR-024 refreshes the roster once the import has registered members", async () => {
    const u = userEvent.setup();
    const roster: Roster = { current: [ANA] };
    const r = serve(
      {
        import: () => {
          roster.current = [...roster.current, rosterRow("u-nuria", "Nuria Nueva")];
          return RESULT;
        },
      },
      undefined,
      roster,
    );
    await renderPage();
    const readsBefore = rosterReads(r);

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await within(dialog).findByText(/Se ha registrado 1 miembro/);

    await waitFor(() => expect(rosterReads(r)).toBeGreaterThan(readsBefore));
    // The roster is hidden from the accessibility tree while the dialog is open.
    await u.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(await within(screen.getByRole("table")).findByText("Nuria Nueva")).toBeInTheDocument();
  });

  it("UI-MBR-021 shows progress while the import runs, and cannot be closed until it ends", async () => {
    const u = userEvent.setup();
    let answer: (value: ImportMembersResponse) => void = () => {};
    serve({ import: () => new Promise<ImportMembersResponse>((resolve) => (answer = resolve)) });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    expect(await within(dialog).findByRole("status")).toHaveTextContent(/Importando miembros/);
    expect(within(dialog).queryByRole("button")).not.toBeInTheDocument();
    // Dispatched on the dialog itself: the button that had focus is gone, and a
    // key pressed on the body would never reach the dialog, proving nothing.
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: `Importar miembros en ${COMMUNITY_NAME}` })).toBeInTheDocument();

    answer(RESULT);
    expect(await within(dialog).findByText(/Se ha registrado 1 miembro/)).toBeInTheDocument();
    // The same key, once the import has ended, does close it.
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("UI-MBR-021 starts again from the guide with «Importar otro archivo»", async () => {
    const u = userEvent.setup();
    serve({ import: () => RESULT });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await u.click(await within(dialog).findByRole("button", { name: "Importar otro archivo" }));

    expect(within(dialog).getByRole("button", { name: "Importar" })).toBeDisabled();
    expect(within(dialog).getByRole("list", { name: "Columnas del archivo" })).toBeInTheDocument();
  });

  it("UI-MBR-021 never calls the legacy user import", async () => {
    const u = userEvent.setup();
    const r = serve({ import: () => RESULT });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await within(dialog).findByText(/Se ha registrado 1 miembro/);

    expect(r.requests.filter((request) => request.url?.includes("/users/import"))).toEqual([]);
    expect(writesSent(r).map((request) => request.url)).toEqual([IMPORT_URL]);
  });
});

describe("a file refused as a whole", () => {
  it.each<[RestErrorDetailCode, Record<string, string> | undefined, RegExp]>([
    ["MEMBERSHIP_IMPORT_INVALID_ENCODING", undefined, /No se ha podido leer el archivo\. .*«Texto Unicode» no sirve\./],
    ["MEMBERSHIP_IMPORT_AMBIGUOUS_SEPARATOR", undefined, /si las columnas se separan con «;» o con «,»/],
    ["MEMBERSHIP_IMPORT_MALFORMED_FILE", undefined, /El archivo no es un CSV válido/],
    [
      "MEMBERSHIP_IMPORT_UNKNOWN_HEADERS",
      { headers: "email,role" },
      /Estas columnas no se reconocen: «email», «role»\./,
    ],
    [
      "MEMBERSHIP_IMPORT_DUPLICATED_HEADERS",
      { headers: "fullName" },
      /Estas columnas aparecen más de una vez: «fullName»\./,
    ],
    [
      "MEMBERSHIP_IMPORT_MISSING_HEADERS",
      { headers: "personalId,fullName" },
      /Faltan estas columnas obligatorias: «personalId», «fullName»\./,
    ],
    ["MEMBERSHIP_IMPORT_TOO_MANY_ROWS", { maxRows: "1000" }, /El archivo tiene más de 1000 filas\./],
  ])("UI-MBR-022 words %s, and says nothing was registered", async (code, params, message) => {
    const u = userEvent.setup();
    serve({
      import: () => {
        throw restError(400, code, { params });
      },
    });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    const alert = await refusalIn(dialog);
    expect(alert).toHaveTextContent(message);
    expect(alert).toHaveTextContent("No se ha registrado ningún miembro.");
    expect(alert).not.toHaveTextContent("refused");
    // Back at the guide, with the file still chosen, to try again once corrected.
    expect(within(dialog).getByText("miembros.csv")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Importar" })).toBeEnabled();
  });

  it("UI-MBR-022 says only that the import failed when the failure is not the file's", async () => {
    const u = userEvent.setup();
    serve({
      import: () => {
        throw restError(503, "MEMBERSHIP_INVITATION_UNAVAILABLE");
      },
    });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    const alert = await refusalIn(dialog);
    expect(alert).toHaveTextContent("No se ha podido importar el archivo. Inténtalo de nuevo.");
    expect(alert).not.toHaveTextContent("No se ha registrado ningún miembro.");
  });
});

describe("after an import", () => {
  it("UI-MBR-024 offers the bulk send with canInviteMembers, and hands over to its confirmation without sending anything", async () => {
    const u = userEvent.setup();
    const r = serve({ import: () => RESULT, bulk: () => ({ sent: 1, remaining: 0 }) });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);
    expect(await within(dialog).findByText("Todavía no se ha enviado ninguna invitación.", { exact: false })).toBeInTheDocument();
    await u.click(within(dialog).getByRole("button", { name: "Enviar invitaciones pendientes" }));

    // The import sent nothing, and the hand-over sends nothing until confirmed.
    const bulk = await screen.findByRole("dialog", { name: `Enviar invitaciones pendientes en ${COMMUNITY_NAME}` });
    expect(screen.queryByRole("dialog", { name: `Importar miembros en ${COMMUNITY_NAME}` })).not.toBeInTheDocument();
    expect(requestsTo(r, "POST", BULK_INVITE_URL)).toEqual([]);
    expect(writesSent(r).map((request) => request.url)).toEqual([IMPORT_URL]);

    await u.click(within(bulk).getByRole("button", { name: "Enviar invitaciones" }));
    await waitFor(() => expect(requestsTo(r, "POST", BULK_INVITE_URL)).toHaveLength(1));
  });

  it("UI-MBR-024 does not offer the bulk send without canInviteMembers", async () => {
    const u = userEvent.setup();
    const community = buildCommunity({
      ...ADMIN_COMMUNITY,
      capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true, canRegisterMembers: true }),
    });
    const r = serve({ import: () => RESULT }, community);
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await within(dialog).findByText(/Se ha registrado 1 miembro/);

    expect(within(dialog).queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Todavía no se ha enviado ninguna invitación/)).toBeInTheDocument();
    expect(writesSent(r).map((request) => request.url)).toEqual([IMPORT_URL]);
  });

  it("UI-MBR-024 does not offer the bulk send when nothing was registered", async () => {
    const u = userEvent.setup();
    serve({ import: () => NOTHING_REGISTERED });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);

    expect(await within(dialog).findByText(/No se ha registrado ningún miembro/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
  });
});

describe("who may import", () => {
  it("UI-MBR-018 offers the import with canRegisterMembers alone", async () => {
    const community = buildCommunity({
      ...ADMIN_COMMUNITY,
      capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true, canRegisterMembers: true }),
    });
    serve({}, community);
    await renderPage();

    expect(screen.getByRole("button", { name: "Importar miembros" })).toBeInTheDocument();
  });

  it("UI-MBR-018 does not offer it without canRegisterMembers, even with canManageMemberships", async () => {
    const community = buildCommunity({
      ...ADMIN_COMMUNITY,
      capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true }),
    });
    serve({}, community);
    await renderPage();

    expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
  });

  it("UI-MBR-018 does not offer it from a backend that does not send canRegisterMembers", async () => {
    const capabilities = buildCommunityCapabilities({ canRead: true, canManageMemberships: true });
    delete (capabilities as Partial<typeof capabilities>).canRegisterMembers;
    serve({}, buildCommunity({ ...ADMIN_COMMUNITY, capabilities }));
    await renderPage();

    expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
  });
});

describe("what the import logs", () => {
  it("never logs a personal ID or an email from the file, on success or refusal", async () => {
    const logged: unknown[][] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logged.push(args);
      });
    }
    const u = userEvent.setup();
    let calls = 0;
    serve({
      import: () => {
        calls += 1;
        if (calls === 1) throw restError(400, "MEMBERSHIP_IMPORT_MISSING_HEADERS", { params: { headers: "fullName" } });
        return RESULT;
      },
    });
    await renderPage();

    const dialog = await openImport(u);
    await importFile(u, dialog);
    await refusalIn(dialog);
    await u.click(within(dialog).getByRole("button", { name: "Importar" }));
    await within(dialog).findByText(/Se ha registrado 1 miembro/);

    const text = logged.map((args) => args.map((arg) => (arg instanceof Error ? arg.stack : String(arg))).join(" "));
    for (const secret of [...PERSONAL_IDS, ...EMAILS]) {
      expect(text.filter((line) => line.includes(secret))).toEqual([]);
    }
  });
});
