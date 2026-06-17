insert into storage.buckets (id, name, public)
values ('bolao-uploads', 'bolao-uploads', false)
on conflict (id) do nothing;

create policy "admins_can_read_uploads"
on storage.objects for select
using (bucket_id = 'bolao-uploads' and public.is_admin());

create policy "admins_can_insert_uploads"
on storage.objects for insert
with check (bucket_id = 'bolao-uploads' and public.is_admin());

create policy "admins_can_update_uploads"
on storage.objects for update
using (bucket_id = 'bolao-uploads' and public.is_admin());

create policy "admins_can_delete_uploads"
on storage.objects for delete
using (bucket_id = 'bolao-uploads' and public.is_admin());
