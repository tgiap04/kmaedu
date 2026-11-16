import { BookOpenCheck, Edit, Trash2 } from "lucide-react";
import { ItemRow, type RowAction } from "@/components/k-page/item-row";
import { ExamStatusBadge } from "@/components/atoms/k/ExamStatusBadge";
import type { ManagementActions, ManagementTableData } from "./management-table-types";

/** Menu entries (secondary, share, edit, delete) in the order the desktop table lists them. */
export function buildRowMenu(item: ManagementTableData, a: ManagementActions): RowAction[] {
  const menu: RowAction[] = [];
  if (a.secondaryActionIcon && a.onSecondaryAction && a.secondaryActionLabel) {
    const fn = a.onSecondaryAction;
    menu.push({ label: a.secondaryActionLabel, icon: a.secondaryActionIcon, onClick: () => fn(item.id) });
  }
  if (a.shareActionIcon && a.onShare) {
    const fn = a.onShare;
    menu.push({ label: a.shareActionLabel ?? "Chia sẻ", icon: a.shareActionIcon, onClick: () => fn(item.id) });
  }
  menu.push({ label: "Chỉnh sửa", icon: Edit, onClick: () => a.onEdit(item.id) });
  menu.push({ label: "Xóa", icon: Trash2, onClick: () => a.onDelete(item.id), destructive: true });
  return menu;
}

/** Mobile view: one ItemRow per item, same actions as the desktop table. */
export function ManagementMobileRows({ data, actions }: { data: ManagementTableData[]; actions: ManagementActions }) {
  return (
    <div className="divide-y divide-hairline-soft md:hidden">
      {data.map((item) => {
        const menu = buildRowMenu(item, actions);
        const hasPrimary = item.questionCount > 0;
        const action = hasPrimary
          ? { label: actions.primaryActionLabel, icon: actions.primaryActionIcon, onClick: () => actions.onPrimaryAction(item.id) }
          : { ...menu[menu.length - 2], variant: "neutral" as const };
        return (
          <div key={item.id}>
            <ItemRow
              icon={<BookOpenCheck />}
              tone="red"
              title={item.name}
              meta={[`${item.questionCount} ${item.countLabel}`, item.createdDate]}
              titleAddon={<ExamStatusBadge status={item.status} className="px-1.5 py-0 text-[10px]" />}
              action={action}
              menu={hasPrimary ? menu : menu.slice(0, -2).concat(menu[menu.length - 1])}
            />
          </div>
        );
      })}
    </div>
  );
}
