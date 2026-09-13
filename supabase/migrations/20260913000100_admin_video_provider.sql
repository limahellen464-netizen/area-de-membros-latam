alter table public.product_modules
  add column if not exists video_provider text not null default 'youtube'
    check (video_provider in ('youtube', 'vturb'));

comment on column public.product_modules.video_provider is
  'youtube = video_url is a YouTube URL. vturb = video_url holds the VTurb player id (used as <vturb-smartplayer id="...">).';
