--Before running the trigger portion, you can check if any rows have a null or duplicate slug:

select id, title, slug from public.courses where slug is null;

select slug, count(*) 
from public.courses 
group by slug 
having count(*) > 1;
