export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800">
      <div className="aspect-square w-full animate-pulse bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 p-2 m-2 dark:bg-neutral-800" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center gap-3 py-10">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </section>
      <section>
        <div className="mb-3 h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-3 h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="aspect-video w-full animate-pulse bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 m-3 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-3 h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 break-inside-avoid rounded-xl bg-neutral-100"
            >
              <div className="aspect-square w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-3 h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
      <div className="h-6 w-24 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="aspect-square w-full animate-pulse bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200 m-2 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
