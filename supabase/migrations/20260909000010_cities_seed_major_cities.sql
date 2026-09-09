-- Small starter seed of verified major cities (correct geonameid/region
-- confirmed by name+country lookup against the old system's geo.json, not
-- invented). This is a starter set, NOT a full port of the old system's
-- ~101k-row geo.json -- bulk-loading the full dataset requires a direct
-- psql/COPY connection this environment doesn't have; that limitation is
-- documented in TODO-FOR-YOSSI.md. The cities table/index/RLS policy
-- (20260909000009) are already sized and ready for the full dataset once
-- imported by the user.

insert into public.cities (geonameid, city_name, region_name, country_code) values
('5128581', 'New York City', 'New York', 'US'),
('4887398', 'Chicago', 'Illinois', 'US'),
('4180439', 'Atlanta', 'Georgia', 'US'),
('6167865', 'Toronto', 'Ontario', 'CA'),
('6077243', 'Montreal', 'Quebec', 'CA'),
('281184', 'Jerusalem', 'Yerushalayim', 'IL'),
('293397', 'Tel Aviv', 'Tel Aviv', 'IL'),
('294801', 'Haifa', 'Hefa', 'IL'),
('2643743', 'London', 'England', 'GB'),
('2643123', 'Manchester', 'England', 'GB'),
('2803136', 'Antwerpen', 'Antwerpen', 'BE'),
('2988507', 'Paris', 'Ile-de-France', 'FR'),
('2158177', 'Melbourne', 'Victoria', 'AU'),
('2147714', 'Sydney', 'New South Wales', 'AU'),
('993800', 'Johannesburg', 'Gauteng', 'ZA'),
('3435910', 'Buenos Aires', 'Ciudad Autonoma de Buenos Aires', 'AR'),
('3530597', 'Mexico City', 'Ciudad de Mexico', 'MX'),
('7630231', 'Sao Paulo', 'Sao Paulo', 'BR')
on conflict (geonameid) do nothing;
