/**
 * actions/index.ts — registers all ActionUtils into the global list.
 *
 * Import order determines prompt-snippet ordering in the LLM system prompt.
 * Each util handles one subject group of shape types.
 *
 * @module components/feature/virtualspace/agent/actions
 */

import type { BaseActionUtil } from '../BaseActionUtil';
import { MathActionUtil } from './MathActionUtil';
import { DataVizActionUtil } from './DataVizActionUtil';
import { ScienceActionUtil } from './ScienceActionUtil';
import { ComputingActionUtil } from './ComputingActionUtil';
import { EnglishHumanitiesActionUtil } from './EnglishHumanitiesActionUtil';
import { GeoShapeActionUtil } from './GeoShapeActionUtil';

export function registerActionUtils(utils: BaseActionUtil<any>[]): void {
  utils.push(
    new MathActionUtil(),
    new DataVizActionUtil(),
    new ScienceActionUtil(),
    new ComputingActionUtil(),
    new EnglishHumanitiesActionUtil(),
    new GeoShapeActionUtil(),
  );
}
