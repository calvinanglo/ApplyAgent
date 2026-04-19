alter table profiles add column if not exists voice_sample text;

comment on column profiles.voice_sample is
  'Short user-provided writing sample used as a style reference when generating cover letters and LinkedIn messages. Reduces AI-detector flagging of generated output. Capped at 2,000 characters by the client.';
