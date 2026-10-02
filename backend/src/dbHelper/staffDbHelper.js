// Staff rows are created by the owner with an email address. The first
// time that person signs in with Google (see toVerifiedUser), the row is linked
// to their login id; after that only the login id is trusted.
const findOrLinkStaffMemberQuery = `
  with linked_staff as (
    update staff set user_id = $1
    where user_id is null and email = $2 and $3::boolean
    returning id, name, role, active
  )
  select id, name, role from linked_staff where active
  union all
  select id, name, role from staff where user_id = $1 and active
  limit 1`;

// Returns { id, name, role } for active staff, or null.
export async function findActiveStaffMemberForUser(executor, user) {
  const result = await executor.query(findOrLinkStaffMemberQuery, [user.id, user.email, user.emailVerifiedByGoogle]);
  return result.rows[0] ?? null;
}
