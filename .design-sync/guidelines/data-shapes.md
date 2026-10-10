# Data shapes

Several components take records straight from the Conluz API (or small local item types). Their
`.d.ts` names the type; this file spells each one out, generated from the real types. Build the
objects inline with realistic Spanish content. Dates are ISO strings (`"2026-03-12"` or
`"2026-03-12T09:30:00Z"`); coefficients are on a 0-1 scale; power in kW, energy in kWh.

Rules worth knowing before you fake data:

- A `SUPERSEDED` sharing agreement holds no open coefficient rows: in-force coefficients belong to a
  `PUBLISHED` agreement.
- `capabilities` objects say what the viewer may do. Pass the flags you want the UI to show as `true`;
  a missing flag reads as "not allowed".
- `MenuItem.requires` is read by the app shell to filter entries; in a design use `{ scope: "always" }`.
- `UserResponse`, contract, distributor and Shelly sub-records are rarely rendered by these components;
  pass `null` where the type allows it.

```ts
interface SharingAgreementResponse {
  /** Internal unique identifier of the sharing agreement */
  id: string;
  /** Identifier of the plant this agreement distributes production from */
  plantId: string;
  /** Human-readable label for the agreement */
  name: string;
  /** Free-text notes about the agreement */
  notes: string | null;
  /** Status of the agreement: DRAFT, PUBLISHED or SUPERSEDED */
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  /** Snapshot of the plant's installed power at authoring time, in kW */
  installedPowerKw: number;
  /** Date and time the agreement was created */
  createdAt: string;
  /** Identifier of the user who created the agreement. Null means it was created by the system (a migration), not by a person */
  createdBy: string | null;
  /** Date and time the agreement was last edited. Null means it has never been edited since creation */
  updatedAt: string | null;
  /** Identifier of the user who last edited the agreement. Null means it has never been edited since creation */
  updatedBy: string | null;
  /** Metadata of the latest evidence file uploaded for this agreement. Null means no file has been uploaded, never that it wasn't loaded */
  file: SharingAgreementFileResponse | null;
  /** What the caller may do with this sharing agreement. */
  capabilities: SharingAgreementCapabilitiesResponse;
}

interface SharingAgreementPartitionCoefficientResponse {
  /** Internal unique identifier of this coefficient */
  coefficientId: string;
  /** Supply this coefficient belongs to */
  supply: SupplyReferenceResponse;
  /** Partition coefficient value, on a 0-1 scale */
  coefficient: number;
  /** Start of the period during which this coefficient is active (inclusive). Null means this is a pending coefficient, materialised but not yet activated. */
  validFrom: string | null;
  /** End of the period (exclusive), as stored. Null unless explicitly closed. */
  validTo: string | null;
  /** Whether the distributor has applied this coefficient yet */
  applicationState: 'PENDING' | 'APPLIED';
  /** How/why this coefficient's coverage ends */
  endState: 'OPEN' | 'OPEN_ORPHAN' | 'PENDING_SUCCESSION' | 'DERIVED' | 'CLOSED';
  /** The effective end of this coefficient's coverage. Present only when endState is DERIVED or CLOSED. */
  endDate: string | null;
  /** The coefficient this supply is currently on in this agreement's plant -- what the value in this row would replace. Null when the supply has no active coefficient in this plant. */
  currentCoefficient: CurrentCoefficientResponse | null;
}

interface PartitionCoefficientResponse {
  /** Internal unique identifier */
  id: string;
  /** Supply this coefficient belongs to */
  supply: SupplyReferenceResponse;
  /** Community the supply belongs to */
  community: CommunityReferenceResponse;
  /** Plant this coefficient belongs to. Disambiguates a supply's timeline when it participates in more than one plant. */
  plant: PlantReferenceResponse;
  /** Sharing agreement that authored this coefficient. */
  sharingAgreement: SharingAgreementReferenceResponse;
  /** Partition coefficient value */
  coefficient: number;
  /** Start of the period during which this coefficient is active (inclusive). Null means this is a pending coefficient, materialised but not yet activated. */
  validFrom: string | null;
  /** End of the period (exclusive). Null means the period is still open; combined with a non-null validFrom that makes this the currently active coefficient for its plant. */
  validTo: string | null;
  /** Timestamp when this record was created */
  createdAt: string;
  /** What the caller may do from this period, including whether its sharingAgreement reference can be followed. */
  capabilities: PartitionCoefficientCapabilitiesResponse;
}

interface PlantResponse {
  id: string;
  /** The plant identifier assigned by the inverter provider (currently Huawei). Used verbatim as the station_code tag in InfluxDB: this is the join key between the PostgreSQL plant row and its time series. */
  providerCode: string;
  /** The identifier assigned by the regulator. In Spain this is the CAU (Codigo de Autoconsumo). It is not the provider's station code (provider_code) and not a CUPS. */
  regulatoryCode: string | null;
  /** The supply this plant produces onto. A reference: the full supply, including its owner, is fetched from GET /supplies/{supplyId}, which not every caller who may list plants is allowed to call. */
  supply: SupplyReferenceResponse;
  name: string;
  address: string;
  description: string | null;
  inverterProvider: 'HUAWEI';
  totalPower: number;
  connectionDate: string | null;
  /** The community that owns the plant. */
  community: PlantCommunityResponse;
  /** What the caller may do with this plant. */
  capabilities: PlantCapabilitiesResponse;
}

interface SupplyResponse {
  /** Internal unique identifier of the supply */
  id: string;
  /** Code that identifies the supply */
  code: string;
  /** Owner of the supply */
  user: UserResponse | null;
  /** Name of the supply */
  name: string | null;
  /** Address of the supply */
  address: string;
  /** Reference ID of the address */
  addressRef: string | null;
  /** Whether the supply is enabled or disabled */
  enabled: boolean;
  /** Contract information of the supply */
  contract: SupplyContractResponse | null;
  /** Distributor information of the supply */
  distributor: SupplyDistributorResponse | null;
  /** Shelly device information of the supply */
  shelly: SupplyShellyResponse | null;
  /** Community the supply belongs to */
  community: CommunityReferenceResponse;
  /** What the caller may do with this supply. */
  capabilities: SupplyCapabilitiesResponse;
}

interface SupplyReferenceResponse {
  /** Internal unique identifier of the supply */
  id: string;
  /** Code of the supply */
  code: string;
  /** Display name of the supply */
  name: string | null;
}

interface CurrentCoefficientResponse {
  /** The coefficient value currently in force, on a 0-1 scale */
  coefficient: number;
  /** When this coefficient took effect (inclusive) */
  validFrom: string;
  /** The agreement that authored the coefficient currently in force. May be the agreement being viewed, or an earlier one. */
  sharingAgreement: SharingAgreementReferenceResponse;
}

interface SharingAgreementFileResponse {
  /** Internal unique identifier of the stored file */
  id: string;
  /** Original filename as uploaded */
  filename: string;
  /** Date and time the file was uploaded */
  uploadedAt: string;
}

interface SharingAgreementCapabilitiesResponse {
  /** Whether the caller may read this agreement, its partition coefficients and its file. */
  canRead: boolean;
  /** Whether the caller may update, delete, publish or revert this agreement and edit its coefficients. Whether a particular one of those actions is possible right now also depends on the agreement's statu */
  canManage: boolean;
}

interface SharingAgreementReferenceResponse {
  /** Internal unique identifier of the agreement */
  id: string;
  /** Human-readable label for the agreement */
  name: string;
  /** Status of the agreement: DRAFT, PUBLISHED or SUPERSEDED */
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
}

interface CommunityReferenceResponse {
  /** Internal unique identifier of the community */
  id: string;
  /** Display name of the community */
  name: string;
}

interface PlantReferenceResponse {
  /** Internal unique identifier of the plant */
  id: string;
  /** Display name of the plant */
  name: string;
}

interface PlantCommunityResponse {
  /** Internal unique identifier of the community */
  id: string;
}

interface PartitionCoefficientCapabilitiesResponse {
  /** Whether the caller may open the sharing agreement referenced by this period (GET /api/v1/plants/{plantId}/sharing-agreements/{sharingAgreementId}). The reference carries no capabilities of its own, so */
  canReadSharingAgreement: boolean;
}

interface PlantCapabilitiesResponse {
  /** Whether the caller may read this plant. Open to any enabled member of its community. */
  canRead: boolean;
  /** Whether the caller may update or delete this plant, and read and write its Huawei configuration. */
  canManage: boolean;
  /** Whether the caller may list this plant's sharing agreements. Admin-only: their contents are not member-readable. */
  canListSharingAgreements: boolean;
  /** Whether the caller may create a sharing agreement under this plant. */
  canManageSharingAgreements: boolean;
  /** Whether the caller may open the supply referenced by this plant (GET /api/v1/supplies/{supplyId}). Listing plants is open to any member, but the supply behind one is not, so the reference carries no o */
  canReadSupply: boolean;
}

interface SupplyCapabilitiesResponse {
  /** Whether the caller may read this supply and its consumption and production series. */
  canRead: boolean;
  /** Whether the caller may update, enable or disable this supply. Narrower than canRead: the owner can read their supply but only a community admin may change it. */
  canEdit: boolean;
  /** Whether the caller may read this supply's partition coefficients. The same access reading the supply requires -- the coefficients describe the owner's own share. */
  canReadPartitionCoefficients: boolean;
  /** Whether the caller may create a plant on this supply (POST /api/v1/plants). */
  canCreatePlant: boolean;
}

interface AttentionItem {
  /** Stable key for the row. */
  key: string;
  /** Leading icon for the signal. */
  icon: ReactNode;
  /** Full Spanish label, e.g. "2 comunidades sin administrador". */
  label: string;
  /** Route the "Revisar" link points to. */
  to: string;
}

interface StatItem {
  label: string;
  value: string;
  trend?: number | undefined;
  trendLabel?: string | undefined;
  icon?: ReactNode;
  color?: string | undefined;
}

interface RecordListItem {
  id: string;
  /** Leading avatar or icon. Optional — omit for records without one. */
  avatar?: ReactNode;
  title: string;
  /** Secondary marker under the title, e.g. a role chip. */
  badge?: ReactNode;
  /** Status chip, kept on the title line so state reads at a glance. */
  status?: ReactNode;
  /** Row actions. Always rendered on the title line so they can never be pushed out of reach the way an off-canvas table column can. */
  actions?: ReactNode;
  fields: RecordField[];
}

interface RecordField {
  label: string;
  value: ReactNode;
}

type FilterStatus = 'all' | 'active' | 'inactive';

interface CoefficientActionsMenuItem {
  action: 'apply' | 'correct' | 'deactivate' | 'close' | 'reopen';
  /** Present (non-empty) marks the item unavailable and renders this text as a secondary line — never via MUI's `disabled` prop, which would make the item unfocusable and drop it from arrow-key navigation. */
  disabledReason?: string | undefined;
}

interface MenuItem {
  to: string;
  id: string;
  icon: SvgIconComponent; // e.g. Icons.Bolt
  label: string;
  /** What the backend must allow before this entry is offered. The same vocabulary the routes use, and deliberately per item rather than per section: Miembros and Integraciones sit together but are not the */
  requires: { scope: 'always'; } | { scope: 'platform'; capability: MenuPlatformCapability; } | { scope: 'community'; capability: MenuCommunityCapability; };
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}
```
