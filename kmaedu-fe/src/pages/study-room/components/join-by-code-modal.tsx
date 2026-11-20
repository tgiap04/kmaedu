import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/antd/dialog";
import { Button } from "@/components/antd/button";
import { Input } from "@/components/antd/input";
import { toast } from "@/components/antd/toast";
import { useStudyRoomStore } from "@/stores/useStudyRoomStore";
import { apiErrorMessage } from "@/lib/api-error-message";
import { isInviteCode, normalizeInviteCode } from "@/lib/study-room/invite-code";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (id: string) => void;
}

export function JoinByCodeModal({ open, onOpenChange, onJoined }: Props) {
  const joinByCode = useStudyRoomStore((s) => s.joinByCode);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const submit = async () => {
    const clean = normalizeInviteCode(code);
    if (!isInviteCode(clean)) {
      toast.error("Mã mời gồm 8 ký tự chữ và số");
      return;
    }
    setJoining(true);
    try {
      const roomId = await joinByCode(clean);
      if (roomId) {
        toast.success("Đã tham gia phòng");
        onOpenChange(false);
        onJoined(roomId);
      } else {
        toast.error("Không tìm thấy phòng");
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Mã mời không hợp lệ"));
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent modalWidth={400}>
        <DialogHeader>
          <DialogTitle>Tham gia bằng mã mời</DialogTitle>
          <DialogDescription>Nhập mã 8 ký tự (chữ và số) từ chủ phòng.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="K7M2Q9XA"
          value={code}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setCode(normalizeInviteCode(e.target.value))}
          onPressEnter={submit}
          className="!text-center !text-2xl !font-mono !tracking-[0.3em]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={joining}>
            Tham gia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
