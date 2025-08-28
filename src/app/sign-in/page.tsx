// New Filename: src/app/sign-in/page.tsx
import {LoginLink} from "@kinde-oss/kinde-auth-nextjs/components";
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';

export default function SignInPage() {
  return (
    <Container variant="form">
      <PageHeader title="Log In to Your Account" />
      <LoginLink>Sign in</LoginLink>
    </Container>
  );
}