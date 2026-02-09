'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to my-students by default
    router.replace('/account/students/my-students');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting...</p>
    </div>
  );
}
