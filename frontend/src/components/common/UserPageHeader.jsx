export default function UserPageHeader({ profile, subtitle, right }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User'
  const src = profile?.avatar_url
  const isOnline = profile?.online_status === true

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0 self-start">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm sm:h-28 sm:w-28">
          {src ? (
            <img alt="" src={src} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <span
          className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-white shadow-sm ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{name}</h2>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
