/**
 * GeoShapeActionUtil — handles tldraw's built-in "geo" shape type.
 *
 * Types: geo
 *
 * The "geo" prop selects the geometry variant: rectangle, ellipse, triangle,
 * diamond, star, pentagon, hexagon, octagon, arrow-right, arrow-left,
 * arrow-up, arrow-down, cloud, trapezoid, heart.
 *
 * @module components/feature/virtualspace/agent/actions/GeoShapeActionUtil
 */

import { z } from 'zod';
import { BaseActionUtil } from '../BaseActionUtil';

const geoSchema = z.object({
  geo: z.string().default('rectangle'),
  w:   z.number().default(120),
  h:   z.number().default(120),
}).default({});

export class GeoShapeActionUtil extends BaseActionUtil<typeof geoSchema> {
  override readonly types = ['geo'];
  override readonly schema = geoSchema;

  buildPromptSnippet(): string {
    return [
      '## General shapes (use "geo" type, set "geo" prop)',
      '- Use these for generic drawing requests ("draw a line", "draw an arrow", "draw a box") — NOT subject-specific shapes.',
      '- Arrow/line (generic "draw a line from A to B"): {"type":"geo","props":{"geo":"arrow-right","w":200,"h":60}}',
      '- Circle/oval: {"type":"geo","props":{"geo":"ellipse","w":120,"h":120}}',
      '- Rectangle/box: {"type":"geo","props":{"geo":"rectangle","w":150,"h":100}}',
      '- Triangle: {"type":"geo","props":{"geo":"triangle","w":120,"h":120}}',
      '- Diamond: {"type":"geo","props":{"geo":"diamond","w":120,"h":100}}',
      '- Star: {"type":"geo","props":{"geo":"star","w":120,"h":120}}',
      '- Arrow right: {"type":"geo","props":{"geo":"arrow-right","w":140,"h":80}}',
      '- Arrow left: {"type":"geo","props":{"geo":"arrow-left","w":140,"h":80}}',
      '- Arrow up: {"type":"geo","props":{"geo":"arrow-up","w":80,"h":140}}',
      '- Arrow down: {"type":"geo","props":{"geo":"arrow-down","w":80,"h":140}}',
      '- Cloud: {"type":"geo","props":{"geo":"cloud","w":160,"h":100}}',
      '- Hexagon: {"type":"geo","props":{"geo":"hexagon","w":140,"h":120}}',
      '- Pentagon: {"type":"geo","props":{"geo":"pentagon","w":120,"h":120}}',
      '- Trapezoid: {"type":"geo","props":{"geo":"trapezoid","w":140,"h":80}}',
      '- Heart: {"type":"geo","props":{"geo":"heart","w":120,"h":120}}',
    ].join('\n');
  }
}
