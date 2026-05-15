grant usage on schema public to service_role;

grant select, insert, update, delete on table
  members,
  auth_credentials,
  member_roles,
  member_sessions,
  posts,
  saved_posts,
  reports
to service_role;

grant usage, select, update on sequence bay_member_number_seq to service_role;
