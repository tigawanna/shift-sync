export function WhoWorksListItem({
  item,
}: {
  item: {
    assignmentId: string;
    userName: string;
    locationName: string;
    skillName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
}) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2">{item.userName}</td>
      <td className="px-3 py-2">{item.locationName}</td>
      <td className="px-3 py-2">{item.skillName}</td>
      <td className="px-3 py-2 tabular-nums">
        {item.date} · {item.startTime}–{item.endTime}
      </td>
    </tr>
  );
}
