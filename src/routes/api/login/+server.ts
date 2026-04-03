import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  const payload = await request.json();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const password = String(payload.password ?? '');

  if (!email || !password) {
    return json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const signIn = await auth.api.signInEmail({
      headers: { 'content-type': 'application/json' },
      body: {
        email,
        password,
        rememberMe: true,
        callbackURL: '/',
      },
    });

    return json({ success: true, redirect: '/'});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to sign in with the provided credentials.';
    return json({ error: message }, { status: 400 });
  }
}