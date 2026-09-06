import BackdropHero from "@/ui/components/backdrop-hero";

function formatJoinDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitial(displayName, username) {
  return String(displayName || username || "A")
    .slice(0, 1)
    .toUpperCase();
}

function resolveAccountBackdropUrl(profile) {
  const banner = String(profile?.bannerUrl || "").trim();
  if (!banner) return null;
  if (/^(https?:\/\/|\/)/.test(banner)) return banner;
  return null;
}

export function AccountBackdropHero({ image }) {
  return (
    <BackdropHero
      image={image}
      position="center 25%"
      className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]"
    />
  );
}

export function AccountHero({ profile }) {
  const displayName = profile?.displayName || profile?.username || "Account";
  const backdropUrl = resolveAccountBackdropUrl(profile);
  const joinDate = formatJoinDate(profile?.createdAt) || "—";

  return (
    <>
      {backdropUrl ? <AccountBackdropHero image={backdropUrl} /> : null}
      <section
        className={`relative z-10 w-full pb-6 ${
          backdropUrl ? "-mt-20 sm:-mt-28 lg:-mt-36" : "pt-6 sm:pt-10"
        }`}
      >
        <div className="relative z-10 flex min-w-0 items-start gap-4 sm:gap-6 lg:gap-7">
          <div
            className="size-20 shrink-0 overflow-hidden rounded-full bg-black/60 text-4xl font-semibold text-white shadow-2xl ring-2 ring-white/10 sm:size-28 sm:text-5xl lg:size-32"
            role="img"
            aria-label={`${displayName} avatar`}
          >
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="size-full object-cover"
                src={profile.avatarUrl}
              />
            ) : (
              getInitial(displayName, profile?.username)
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col pt-1 sm:pt-1.5">
            <h1 className="font-zuume max-w-full text-4xl leading-[0.84] font-bold tracking-tight text-white uppercase [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">
              {displayName}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-white/55 sm:mt-3 sm:gap-x-3 sm:text-base">
              <span className="font-semibold text-white">0</span>
              <span>Following</span>
              <span>•</span>
              <span className="font-semibold text-white">0</span>
              <span>Followers</span>
              <span>•</span>
              <span>Joined {joinDate}</span>
              {profile.isPrivate ? (
                <>
                  <span>•</span>
                  <span>Private</span>
                </>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="mt-2.5 truncate text-xs leading-relaxed text-white/70 sm:mt-3 sm:text-sm">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

export function AccountContent({ extension = null, profile }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
        <article className="rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-inset ring-white/10 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
            Profile
          </p>
          <h2 className="mt-3 text-2xl font-medium text-white">
            About {profile.displayName}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
            {profile.bio || "This profile has not added a bio yet."}
          </p>
          <p className="mt-6 text-sm text-white/45">@{profile.username}</p>
        </article>

        {extension ? (
          <aside className="rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-inset ring-white/10 backdrop-blur-xl sm:p-8">
            {extension}
          </aside>
        ) : null}
      </div>
    </>
  );
}

export function AccountProfileLayout({ extension, profile }) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative z-10 w-full [overflow-anchor:none]">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <AccountHero profile={profile} />
        </div>
        <div className="w-full border-b border-white/10" />
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
          <section className="w-full pt-6 sm:pt-8">
            <AccountContent extension={extension} profile={profile} />
          </section>
        </div>
      </div>
    </main>
  );
}
