'use client'

/* Irreversible and one click from a column of numbers, so it says exactly
 * what it will do and exactly what it will not. */

export default function ResetCounters({ events }: { events: number }) {
  return (
    <form
      method="POST"
      action="/admin/reset"
      onSubmit={e => {
        const ok = window.confirm(
          'Set every counter back to zero?\n\n' +
          `This deletes all recorded events (${events.toLocaleString()} of them) and zeroes views ` +
          'and edit counts on every card.\n\n' +
          'It does NOT delete any cards — every published link keeps working.\n\n' +
          'There is no undo.',
        )
        if (!ok) e.preventDefault()
      }}
    >
      <button
        type="submit"
        className="cc-btn-ghost"
        style={{ padding: '9px 16px', fontSize: '0.84rem', borderColor: 'rgba(244,63,94,0.45)', color: '#FDA4AF' }}
      >
        Reset all counters to zero
      </button>
    </form>
  )
}
