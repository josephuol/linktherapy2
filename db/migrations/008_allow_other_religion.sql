-- Allow "Other" in therapists.religion check constraint
alter table public.therapists drop constraint if exists therapists_religion_chk;
alter table public.therapists drop constraint if exists therapists_religion_check;
alter table public.therapists add constraint therapists_religion_chk
  check (
    religion is null or (
      religion = any (array['Christian'::text, 'Druze'::text, 'Sunni'::text, 'Shiite'::text, 'Other'::text])
    )
  );


