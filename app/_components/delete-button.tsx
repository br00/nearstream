"use client";

export function DeleteButton({
  action,
  confirmMessage,
  label = "delete",
}: {
  action: string;
  confirmMessage: string;
  label?: string;
}) {
  return (
    <form action={action} method="POST" className="inline">
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(confirmMessage)) e.preventDefault();
        }}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-soft transition-colors hover:text-foreground cursor-pointer"
      >
        {label}
      </button>
    </form>
  );
}
