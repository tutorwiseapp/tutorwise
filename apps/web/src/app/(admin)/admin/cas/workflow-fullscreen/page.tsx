/**
 * /admin/cas/workflow-fullscreen — Phase 6D decommission.
 * The CAS workflow visualizer is superseded by the Conductor Build canvas.
 */
import { redirect } from 'next/navigation';

export default function WorkflowFullscreenPage() {
  redirect('/admin/conductor');
}
