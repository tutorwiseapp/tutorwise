/*
 * Filename: src/app/api/auth/register/route.ts
 * Purpose: Provides a secure server-side endpoint for new user registration via email and password.
 *
 * Change History:
 * C001 - 2025-07-23 : 00:30 - Initial creation.
 *
 * Last Modified: 2025-07-23 : 00:30
 * Requirement ID (optional): VIN-A-004
 *
 * Change Summary:
 * Created a new server-side endpoint to handle the complete user registration process. It securely
 * checks for existing users, hashes the provided password using `argon2`, and creates records
 * in both the `users` (for NextAuth) and our custom `profiles` tables.
 *
 * Impact Analysis:
 * This is a critical API route that powers the email/password signup feature.
 *
 * Dependencies: "next/server", "@supabase/supabase-js", "argon2".
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'argon2'; // This will now be found correctly.

export async function POST(request: NextRequest) {
  // We must wrap the logic in a try/catch for robust error handling
  try {
    const { email, password, firstName, lastName, role } = await request.json();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    
    // It's good practice to add password validation
    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Check if a user with this email already exists in the `users` table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    // 2. Hash the password securely before storing it
    const hashedPassword = await hash(password);

    // 3. Create the user in the NextAuth `users` table
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        name: `${firstName} ${lastName}`,
        email: email,
        password: hashedPassword,
        emailVerified: null, // Email is not verified through this custom flow yet
      })
      .select('id') // Only select the ID we need
      .single();

    if (userError || !newUser) {
      console.error('Error creating NextAuth user:', userError);
      return NextResponse.json({ error: userError?.message || 'Could not create user.' }, { status: 500 });
    }

    // 4. Create the corresponding profile in our custom `profiles` table
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const agentId = `A1-${initials}${Math.floor(100000 + Math.random() * 900000)}`;
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.id, // Use the ID from the user we just created
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        agent_id: agentId,
        roles: [role],
      });
      
    if (profileError) {
        console.error('Error creating user profile:', profileError);
        // This is an edge case, but we should handle it
        return NextResponse.json({ error: profileError.message || 'Could not create user profile.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User registered successfully.' }, { status: 201 });

  } catch (err) {
    console.error('Register API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}