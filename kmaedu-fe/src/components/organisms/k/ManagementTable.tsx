import { BookOpenTextIcon, EyeIcon, PlusCircleIcon, DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/antd/table";
import { Badge } from "@/components/antd/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { ExamStatusBadge } from "@/components/atoms/k/ExamStatusBadge";
import { SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { buildRowMenu, ManagementMobileRows } from "./management-table-rows";
import type { ManagementActions, ManagementTableData } from "./management-table-types";

export type { ManagementTableData } from "./management-table-types";

interface ManagementTableProps extends ManagementActions {
  title: string;
  data: ManagementTableData[];
  countColumnLabel: string;
  emptyMessage?: string;
  showViewCount?: boolean;
  /** Total across all pages, shown in the count pill (defaults to the rows on this page). */
  totalResults?: number;
  /** Next step shown in the empty state. */
  onCreate?: () => void;
  createLabel?: string;
}

const thClass = "h-10 bg-surface-soft text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export function ManagementTable({
  title,
  data,
  countColumnLabel,
  emptyMessage = "Không có dữ liệu",
  showViewCount = true,
  totalResults,
  onCreate,
  createLabel = "Tạo mới",
  ...actions
}: ManagementTableProps) {
  const PrimaryIcon = actions.primaryActionIcon;
  return (
    <SectionCard icon={<BookOpenTextIcon />} title={title} countLabel={String(totalResults ?? data.length)} plain>
      {data.length === 0 ? (
        <div className="flex flex-col items-center border-t border-hairline-soft">
          <SectionMessage title={emptyMessage} hint={onCreate ? "Bắt đầu bằng việc tạo mới." : undefined} />
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="mb-6 inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3.5 text-[13px] font-semibold text-brand transition-colors hover:bg-[#fde4e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <PlusCircleIcon className="size-3.5" aria-hidden />
              {createLabel}
            </button>
          )}
        </div>
      ) : (
        <>
          <ManagementMobileRows data={data} actions={actions} />
          <div className="hidden overflow-x-auto border-t border-hairline-soft md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-hairline-soft hover:bg-transparent">
                  <TableHead className={`${thClass} pl-5`}>Tên</TableHead>
                  <TableHead className={thClass}>{countColumnLabel}</TableHead>
                  {showViewCount && <TableHead className={thClass}>Lượt xem</TableHead>}
                  <TableHead className={thClass}>Trạng thái</TableHead>
                  <TableHead className={thClass}>Ngày tạo</TableHead>
                  <TableHead className={`${thClass} pr-5 text-right`}>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id} className="border-hairline-soft transition-colors hover:bg-surface-soft">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                          <BookOpenTextIcon className="size-[18px]" aria-hidden />
                        </span>
                        <div className="min-w-0 max-w-[360px]">
                          <p className="truncate text-[14px] font-semibold text-ink" title={item.name}>{item.name}</p>
                          <p className="truncate text-[12px] text-muted-foreground">{item.description}</p>
                          {item.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="border-hairline text-xs">{tag}</Badge>
                              ))}
                              {item.tags.length > 2 && (
                                <Badge variant="outline" className="border-hairline text-xs">+{item.tags.length - 2}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] font-medium text-ink">
                      {item.questionCount} {item.countLabel}
                    </TableCell>
                    {showViewCount && (
                      <TableCell>
                        <span className="flex items-center gap-1 text-[13px] text-body">
                          <EyeIcon className="size-3.5" aria-hidden />
                          {item.viewCount ?? 0}
                        </span>
                      </TableCell>
                    )}
                    <TableCell><ExamStatusBadge status={item.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] text-body">{item.createdDate}</TableCell>
                    <TableCell className="pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.questionCount > 0 && (
                          <button
                            type="button"
                            onClick={() => actions.onPrimaryAction(item.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3.5 text-[13px] font-semibold text-brand transition-colors hover:bg-[#fde4e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                          >
                            <PrimaryIcon className="size-3.5" aria-hidden />
                            {actions.primaryActionLabel}
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Tùy chọn cho ${item.name}`}
                              className="grid size-8 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                            >
                              <DotsThreeVerticalIcon className="size-4" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {buildRowMenu(item, actions).map(({ label, icon: Icon, onClick, destructive }) => (
                              <DropdownMenuItem key={label} onClick={onClick} className={destructive ? "cursor-pointer text-destructive focus:text-destructive" : "cursor-pointer"}>
                                <Icon className="mr-2 size-4" aria-hidden />
                                {label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </SectionCard>
  );
}
