export function AuditListItem({
  item,
}: {
  item: {
    id: string;
    action: string;
    actorName: string;
    locationName: string;
    shiftId: string | null;
    createdAt: Date;
  };
}) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-xs tabular-nums">{new Date(item.createdAt).toISOString()}</td>
      <td className="px-3 py-2">{item.actorName}</td>
      <td className="px-3 py-2">{item.action}</td>
      <td className="px-3 py-2">{item.locationName}</td>
      <td className="px-3 py-2 font-mono text-xs">{item.shiftId ?? "—"}</td>
    </tr>
  );
}
