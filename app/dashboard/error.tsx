'use client'

export default function DashboardError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="mb-4 text-sm text-red-600">
          Erro ao carregar dados. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
