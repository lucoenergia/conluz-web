/**
 * Generated by orval v7.10.0 🍺
 * Do not edit manually.
 * Conluz API
 * Conluz is an API-driven application designed for the efficient management of an energy community,enabling the administration of community members and their corresponding supply points and the retrieval of consumption, production data.
 * OpenAPI spec version: 1.0.0
 */
import type { UpdateUserBodyRole } from './updateUserBodyRole';

export interface UpdateUserBody {
  /** @minimum 0 */
  number: number;
  personalId: string;
  fullName: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  role: UpdateUserBodyRole;
}
