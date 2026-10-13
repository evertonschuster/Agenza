export function OptionalText({ value }: { value: string | null }) {
  if (value === null) {
    return (
      <>
        <span aria-hidden="true" className="text-muted-foreground">
          —
        </span>
        <span className="sr-only">Não informado</span>
      </>
    );
  }

  return <span className="whitespace-nowrap">{value}</span>;
}
