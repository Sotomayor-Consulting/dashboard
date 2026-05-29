import type { EntityType } from '../entity-registry';

export interface Transformer {
  id: string;
  name: string;
  description: string;
  entityType: EntityType;
  evaluate(row: Record<string, unknown>): Record<string, string | boolean | string[]>;
}
