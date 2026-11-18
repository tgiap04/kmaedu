import { memo } from "react";
import { DoorOpenIcon, EyeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { ItemRow, type RowAction } from "@/components/k-page/item-row";
import { SectionCard, SectionMessage } from "@/components/k-page/section-card";

export interface ExamRoom {
  id: string;
  name: string;
  roomType: string;
  questionCount: number;
  isPrivate?: boolean;
}

export interface ExamRoomListProps {
  rooms: ExamRoom[];
  filter?: string;
  onFilterChange?: (value: string) => void;
  onViewRoom: (id: string) => void;
  onEditRoom?: (id: string) => void;
  onDeleteRoom?: (id: string) => void;
}

const ExamRoomListComponent = ({
  rooms,
  filter: _filter,
  onFilterChange: _onFilterChange,
  onViewRoom,
  onEditRoom,
  onDeleteRoom,
}: ExamRoomListProps) => {
  return (
    <SectionCard icon={<DoorOpenIcon />} title="Danh sách phòng thi" countLabel={`${rooms.length} phòng thi`}>
      {rooms.length === 0 ? (
        <SectionMessage title="Chưa có phòng thi nào" hint="Bấm “Tạo phòng thi mới” để bắt đầu." />
      ) : (
        rooms.map((room) => {
          const menu: RowAction[] = [];
          if (onEditRoom) menu.push({ label: "Chỉnh sửa", icon: PencilSimpleIcon, onClick: () => onEditRoom(room.id) });
          if (onDeleteRoom) menu.push({ label: "Xóa", icon: TrashIcon, onClick: () => onDeleteRoom(room.id), destructive: true });
          return (
            <ItemRow
              key={room.id}
              icon={<DoorOpenIcon />}
              tone="red"
              title={room.name}
              meta={[`Bộ đề: ${room.roomType}`, `${room.questionCount} câu`, room.isPrivate ? "Riêng tư" : ""]}
              action={{ label: "Xem chi tiết", icon: EyeIcon, onClick: () => onViewRoom(room.id), variant: "neutral" }}
              menu={menu}
            />
          );
        })
      )}
    </SectionCard>
  );
};

ExamRoomListComponent.displayName = "ExamRoomList";

export const ExamRoomList = memo(ExamRoomListComponent);
