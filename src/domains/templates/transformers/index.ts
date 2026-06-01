import type { Transformer } from './types';
import { ss4Transformer } from './ss4';

const registry = new Map<string, Transformer>();

export function registerTransformer(t: Transformer): void {
  registry.set(t.id, t);
}

export function getTransformer(id: string): Transformer | undefined {
  return registry.get(id);
}

export function listTransformers(): Transformer[] {
  return Array.from(registry.values());
}

registerTransformer(ss4Transformer);
