import type { Icon as AppIcon } from "@phosphor-icons/react";
import type { ExamStatus } from "@/components/atoms/k/ExamStatusBadge";

export interface ManagementTableData {
  id: string;
  icon: string;
  name: string;
  description: string;
  questionCount: number;
  viewCount?: number;
  countLabel: string;
  status: ExamStatus;
  createdDate: string;
  lastStudied: string | null;
  tags: string[];
}

/** Handlers and labels shared by the desktop table and the mobile rows. */
export interface ManagementActions {
  primaryActionIcon: AppIcon;
  primaryActionLabel: string;
  secondaryActionIcon?: AppIcon;
  secondaryActionLabel?: string;
  shareActionIcon?: AppIcon;
  shareActionLabel?: string;
  onPrimaryAction: (id: string) => void;
  onSecondaryAction?: (id: string) => void;
  onShare?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
