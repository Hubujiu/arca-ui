"use client";

import { actionIconFactory } from "@approved/potlab-icons";
const ArrowRightIcon = actionIconFactory("ArrowRight");
const ArrowUpRightIcon = actionIconFactory("ArrowUpRight");
const BellIcon = actionIconFactory("Bell");
const CheckIcon = actionIconFactory("Check");
const CopyIcon = actionIconFactory("Copy");
const DownloadIcon = actionIconFactory("Download");
const EllipsisIcon = actionIconFactory("MoreHorizontal");
const EllipsisVerticalIcon = actionIconFactory("MoreVertical");
const EyeIcon = actionIconFactory("Eye");
const FilePenIcon = actionIconFactory("FilePen");
const FolderPlusIcon = actionIconFactory("FolderPlus");
const InboxIcon = actionIconFactory("Inbox");
const PencilIcon = actionIconFactory("Pencil");
const PlusIcon = actionIconFactory("Plus");
const RefreshCwIcon = actionIconFactory("RefreshCw");
const SaveIcon = actionIconFactory("Save");
const SearchIcon = actionIconFactory("Search");
const SendIcon = actionIconFactory("Send");
const SlidersHorizontalIcon = actionIconFactory("SlidersHorizontal");
const Trash2Icon = actionIconFactory("Trash2");
const UploadIcon = actionIconFactory("Upload");
const XIcon = actionIconFactory("X");
import { ActionIcon, type ActionGlyph } from "./action";
import { RunningIcon } from "./running";

type GlyphProps = {
  size?: number;
  className?: string;
};

function action(Icon: ActionGlyph) {
  return function Glyph(props: GlyphProps) {
    return <ActionIcon icon={Icon} {...props} />;
  };
}

function runningAction(Icon: ActionGlyph, label: string) {
  return function Glyph({
    running = false,
    size = 16,
    className,
  }: GlyphProps & { running?: boolean }) {
    if (running) {
      return (
        <RunningIcon running size={size} className={className} label={label} />
      );
    }
    return <ActionIcon icon={Icon} size={size} className={className} />;
  };
}

export const SearchAction = action(SearchIcon);
export const BellAction = action(BellIcon);
export const DownloadAction = action(DownloadIcon);
export const UploadAction = action(UploadIcon);
export const EyeAction = action(EyeIcon);
export const ArrowRightAction = action(ArrowRightIcon);
export const ArrowUpRightAction = action(ArrowUpRightIcon);
export const InboxAction = action(InboxIcon);
export const CheckAction = action(CheckIcon);
export const CloseAction = action(XIcon);
export const PlusAction = action(PlusIcon);
export const PencilAction = action(PencilIcon);
export const FilePenAction = action(FilePenIcon);
export const FolderPlusAction = action(FolderPlusIcon);
export const SettingsAction = action(SlidersHorizontalIcon);
export const MoreAction = action(EllipsisIcon);
export const MoreVerticalAction = action(EllipsisVerticalIcon);
export const TrashAction = action(Trash2Icon);
export const CopyAction = action(CopyIcon);
export const SaveAction = runningAction(SaveIcon, "正在保存");
export const SendAction = runningAction(SendIcon, "正在提交");
export const RefreshAction = runningAction(RefreshCwIcon, "正在刷新");
