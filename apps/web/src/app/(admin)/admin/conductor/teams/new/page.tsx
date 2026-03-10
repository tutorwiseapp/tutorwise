import { redirect } from 'next/navigation';

/**
 * /admin/conductor/teams/new — placeholder until a team-creation form is built.
 * Redirects to the Teams tab on the Conductor page (TeamCanvas is the compose UI).
 */
export default function NewTeamPage() {
  redirect('/admin/conductor?tab=teams');
}
