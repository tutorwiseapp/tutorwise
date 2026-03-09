/**
 * /admin/cas is now consolidated into /admin/conductor.
 * Phase 1: CAS AI Agents dashboard merged into Conductor → Monitoring tab.
 */
import { redirect } from 'next/navigation';

export default function CasPage() {
  redirect('/admin/conductor');
}
