import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (locals.user) {
    return json({ error: 'Already signed in' }, { status: 400 });
  }

  let body: {
    email?: string;
    password?: string;
    retypePassword?: string;
    username?: string;
    name?: string;
    bio?: string;
    website?: string;
    location?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password, retypePassword, username, name, bio, website, location } = body;

  // ── Required field validation ──
  if (!email || !password || !username) {
    return json({ error: 'Email, password, and username are required' }, { status: 400 });
  }

  if (password !== retypePassword) {
    return json({ error: 'Passwords do not match' }, { status: 400 });
  }

  const trimmedUsername = username.trim();
  const trimmedEmail    = email.trim().toLowerCase();

  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    return json({ error: 'Username must be between 3 and 30 characters' }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return json({ error: 'Username may only contain letters, numbers, and underscores' }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // ── Optional field validation ──
  if (bio && bio.length > 300) {
    return json({ error: 'Bio must be 300 characters or fewer' }, { status: 400 });
  }

  if (website && website.trim().length > 0) {
    try {
      new URL(website.trim());
    } catch {
      return json({ error: 'Please enter a valid website URL (e.g. https://yoursite.com)' }, { status: 400 });
    }
  }

  if (location && location.length > 100) {
    return json({ error: 'Location must be 100 characters or fewer' }, { status: 400 });
  }

  // ── Check username uniqueness before calling auth ──
  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, trimmedUsername))
      .limit(1);

    if (existing.length > 0) {
      return json({ error: 'This username is already taken' }, { status: 400 });
    }
  } catch (dbError) {
    console.error('DB username check error:', dbError);
    return json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }

  // ── Create account via better-auth ──
  try {
    const user = await auth.api.signUpEmail({
      headers: { 'content-type': 'application/json' },
      body: {
        email: trimmedEmail,
        password,
        username: trimmedUsername,
        name: trimmedUsername,
        callbackURL: '/',
      },
    });

    // ── Patch extra profile fields onto the new user row ──
    const userId = (user as any).user?.id;
    if (userId) {
      await db
        .update(users)
        .set({
          username:  trimmedUsername,
          name:      name?.trim()     || null,
          bio:       bio?.trim()      || null,
          website:   website?.trim()  || null,
          location:  location?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return json({
      success:  true,
      redirect: '/',
      user: {
        id:       userId,
        email:    trimmedEmail,
        username: trimmedUsername,
      },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);

    const msg = (error instanceof Error ? error.message : '') +
                (typeof error === 'object' && error !== null && 'code' in error ? String((error as Record<string, unknown>).code) : '');

    if (msg.includes('EMAIL_ALREADY_IN_USE') || msg.includes('email') && msg.includes('unique')) {
      return json({ error: 'This email is already registered' }, { status: 400 });
    }

    if (msg.includes('USERNAME_ALREADY_IN_USE') || msg.includes('username') && msg.includes('unique')) {
      return json({ error: 'This username is already taken' }, { status: 400 });
    }

    return json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }
};