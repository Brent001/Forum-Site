import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    return { redirect: '/' };
  }
  return {};
};