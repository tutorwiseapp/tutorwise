import { redirect } from 'next/navigation';

/**
 * /admin/conductor/agents/new — placeholder until an agent-creation form is built.
 * Redirects to the Agents tab on the Conductor page.
 */
export default function NewAgentPage() {
  redirect('/admin/conductor?tab=registry');
}
