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

const staffColumns = 'id, email, name, phone, role, active, user_id is not null as signed_in';

function toStaffMember(row) {
  return { id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role, active: row.active, signedIn: row.signed_in };
}

// Active first, then by role and name.
export async function findAllStaff(executor) {
  const result = await executor.query(
    `select ${staffColumns} from staff
     order by active desc, array_position(array['owner', 'packer', 'rider'], role), name`,
  );
  return result.rows.map(toStaffMember);
}

export async function insertStaffMember(executor, member) {
  const result = await executor.query(
    'insert into staff (email, name, phone, role) values ($1, $2, $3, $4) returning id',
    [member.email, member.name, member.phone, member.role],
  );
  return result.rows[0].id;
}

// The email is fixed once added: it is how the person is matched at sign-in.
export async function updateStaffMember(executor, staffId, member) {
  const result = await executor.query(
    'update staff set name = $2, phone = $3, role = $4, active = $5 where id = $1',
    [staffId, member.name, member.phone, member.role, member.active],
  );
  return result.rowCount > 0;
}

export async function isActiveRider(executor, staffId) {
  const result = await executor.query("select 1 from staff where id = $1 and role = 'rider' and active", [staffId]);
  return result.rowCount > 0;
}
