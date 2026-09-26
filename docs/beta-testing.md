# Beta testing

## Start locally

1. Copy `frontend/.env.example` to `frontend/.env.local` and add the beta Supabase values.
2. Copy `backend/.env.example` to `backend/.env` and configure the beta API values.
3. Apply the schema and migrations through `migration-v11-legal-compliance.sql` in order.
4. Start the API with `npm start` inside `backend`.
5. Start the client with `npm run dev` inside `frontend`.

## Minimum beta checks

- Create an account only after accepting the Terms and Privacy Policy links.
- Create a team, join it with an invite code, and verify member visibility.
- Create, assign, edit, complete, and delete a task.
- Check task updates in a second browser session.
- Upload and download a non-sensitive test file.
- Check notes, milestones, notifications, search, and sign-out.
- Test light mode, dark mode, mobile width, keyboard-only navigation, and reduced motion.
- Report bugs with route, steps, expected result, actual result, browser, and timestamp.

Do not use real student records, private academic submissions, government IDs, payment information, or confidential files during beta.
