'use client'

/* Deleting someone else's card is irreversible and the row is one click from
 * a column of numbers, so it asks, and it says the name out loud. */

export default function DeleteCard({ slug, name }: { slug: string; name: string }) {
  return (
    <form
      method="POST"
      action="/admin/delete"
      onSubmit={e => {
        const ok = window.confirm(
          `Delete "${name}" permanently?\n\n` +
          `Its link stops working immediately for everyone holding it, and its ` +
          `counters go with it. This cannot be undone.`,
        )
        if (!ok) e.preventDefault()
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className="cc-chip"
        style={{ borderColor: 'rgba(244,63,94,0.45)', color: '#FDA4AF', padding: '5px 10px', fontSize: '0.74rem' }}
      >
        Delete
      </button>
    </form>
  )
}
