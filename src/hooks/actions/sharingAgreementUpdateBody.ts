import type { SharingAgreementResponse, UpdateSharingAgreementBody } from "../../api/models";

/**
 * An agreement's editable metadata. `distributorFileSentOn` is required on
 * purpose: the update is a full replacement, so a body without it clears the
 * stored date (lucoenergia/conluz#580), and a type that let it be left out
 * would let a caller clear it without meaning to.
 */
export interface SharingAgreementMetadata {
  name: string;
  /** `null` clears the notes. */
  notes: string | null;
  nominalPowerKW: number;
  /** A local date ("2026-03-01"); `null` clears it. */
  distributorFileSentOn: string | null;
}

/**
 * What a caller changes. A field left out, or `undefined`, keeps the stored
 * value; only an explicit `null` clears one.
 */
export type SharingAgreementMetadataEdits = Partial<SharingAgreementMetadata>;

/**
 * The one body every `updateSharingAgreement` request sends: the agreement as
 * stored, with the edits laid over it. Every update therefore carries the
 * current distributor file sent date (UI-AGR-021).
 */
export function buildSharingAgreementUpdateBody(
  current: SharingAgreementResponse,
  edits: SharingAgreementMetadataEdits,
): UpdateSharingAgreementBody {
  const metadata: SharingAgreementMetadata = {
    name: edits.name ?? current.name,
    notes: edits.notes !== undefined ? edits.notes : current.notes,
    nominalPowerKW: edits.nominalPowerKW ?? current.nominalPowerKW,
    distributorFileSentOn:
      edits.distributorFileSentOn !== undefined ? edits.distributorFileSentOn : current.distributorFileSentOn,
  };
  return {
    name: metadata.name,
    // The body types notes as a string that may be absent, not null; absent clears them.
    notes: metadata.notes ?? undefined,
    nominalPowerKW: metadata.nominalPowerKW,
    distributorFileSentOn: metadata.distributorFileSentOn,
  };
}
