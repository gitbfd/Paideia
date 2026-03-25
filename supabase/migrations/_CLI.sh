
# Direct connection string
postgresql://postgres:[YOUR-PASSWORD]@db.dfjualrkkixirjjxidjf.supabase.co:5432/postgres

# Project URL
https://dfjualrkkixirjjxidjf.supabase.co

## NOTE: you need to run this command through docker, which really just requires that docker be open
## you should get a success message in the terminal that looks like:
#  Dumped schema to /Users/bfduffy/Dropbox/dev--WRKNG/supabase/Paideia/schema.sql.

CONNECTION_STRING='postgresql://postgres:bfd_NYC__25@db.dfjualrkkixirjjxidjf.supabase.co:5432/postgres'

# Roles (optional, for recreating roles/privileges)
supabase db dump --db-url "${CONNECTION_STRING}" -f roles.sql --role-only

# Schema (DDL only; no data)
supabase db dump --db-url "${CONNECTION_STRING}" -f schema.sql

# Data (optional)
supabase db dump --db-url "${CONNECTION_STRING}" -f data.sql --use-copy --data-only

supabase db dump --db-url "postgresql://postgres:bfd_NYC__25@db.dfjualrkkixirjjxidjf.supabase.co:5432/postgres" -f schema.sql