/**
 * A roster row and a supply name their user by id only, and carry the
 * community's member record under its own names (lucoenergia/conluz#448). A read
 * of an account field through `user` must fail to compile, so nothing can go
 * back to reading the account where the screens show the record. `tsc -b`
 * re-proves it on every build.
 *
 * Nothing imports this file and nothing calls these functions; they exist to be
 * type-checked.
 */
import type { MembershipResponse, SupplyResponse } from "../api/models";

// The record and the reference compile.
export function readsTheRecord(membership: MembershipResponse, supply: SupplyResponse) {
  return [
    membership.user.id,
    membership.personalId,
    membership.fullName,
    membership.memberNumber,
    membership.contactEmail,
    membership.address,
    membership.phoneNumber,
    membership.capabilities.canListSupplies,
    supply.user?.id,
    supply.ownerRecord?.fullName,
    supply.ownerRecord?.memberNumber,
    supply.ownerRecord?.contactEmail,
    supply.ownerRecord?.address,
    supply.ownerRecord?.phoneNumber,
  ];
}

export function rejectsTheAccount(membership: MembershipResponse, supply: SupplyResponse) {
  return [
    // @ts-expect-error -- the roster row's name is its record's, at the top level
    membership.user.fullName,
    // @ts-expect-error -- the account's member number is not the community's
    membership.user.number,
    // @ts-expect-error -- the contact email is the record's contactEmail
    membership.user.email,
    // @ts-expect-error -- the personal ID is at the top level
    membership.user.personalId,
    // @ts-expect-error -- canListSupplies is on the membership's own capabilities
    membership.user.capabilities,
    // @ts-expect-error -- the owner's name is their record's, in ownerRecord
    supply.user?.fullName,
    // @ts-expect-error -- a supply carries no personal ID
    supply.user?.personalId,
    // @ts-expect-error -- a member record has no personal ID either
    supply.ownerRecord?.personalId,
  ];
}
