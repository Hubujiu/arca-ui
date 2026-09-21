import { forwardRef, type ComponentProps, type HTMLAttributes } from "react";
import { PotlabIcon as ApprovedPotlabIcon } from "@approved/potlab-icons";
import { cn } from "@/lib/utils";

/** Keep approved geometry while letting the shared theme choose readable inverse strokes. */
export const PotlabIcon = forwardRef<HTMLSpanElement, ComponentProps<typeof ApprovedPotlabIcon>>(
  function PotlabIcon({ tone, ...props }, ref) {
    return <ApprovedPotlabIcon {...props} ref={ref} data-icon-tone={tone === "inverse" ? "inverse" : props["data-icon-tone"]} />;
  },
);

type IconProps = HTMLAttributes<HTMLSpanElement> & { size?: 16 | 18 | 24; tone?: "inverse" };
function glyph(name: string) {
  return function Icon({ size = 18, className, tone, ...props }: IconProps) {
    return <PotlabIcon name={name} size={size} tone={tone} className={cn("shrink-0", className)} {...props} />;
  };
}
export const IconArrowLeft = glyph("Arrow Left");
export const IconArrowRight = glyph("Arrow Right");
export const IconArchive = glyph("Archive");
export const IconCheck = glyph("Check");
export const IconChevron = glyph("Chevron Right");
export const IconChevronDown = glyph("Chevron Down");
export const IconChevronLeft = glyph("Chevron Left");
export const IconChevronRight = glyph("Chevron Right");
export const IconClipboard = glyph("Clipboard");
export const IconClose = glyph("Close");
export const IconClock = glyph("Clock");
export const IconCopy = glyph("Copy");
export const IconDownload = glyph("Download");
export const IconExpand = glyph("Maximize");
export const IconEye = glyph("Eye");
export const IconEyeOff = glyph("Eye Off");
export const IconFile = glyph("Article");
export const IconFolder = glyph("Folder");
export const IconInbox = glyph("Archive");
export const IconInfo = glyph("Info");
export const IconLink = glyph("Link");
export const IconLock = glyph("Lock");
export const IconMenu = glyph("Menu");
export const IconMinus = glyph("Minus");
export const IconPaste = glyph("Clipboard");
export const IconPencil = glyph("Edit");
export const IconPeople = glyph("Users");
export const IconPlus = glyph("Plus");
export const IconRotate = glyph("Refresh 2");
export const IconScissors = glyph("Scissors");
export const IconSearch = glyph("Search");
export const IconSettings = glyph("Setting");
export const IconShare = glyph("Share");
export const IconUpload = glyph("Cloud Upload");
export const IconUser = glyph("User");
export const IconUsers = glyph("Users");
export const IconWarning = glyph("Exclamation Triangle");
export const IconNavGrid = glyph("Table");
export const IconNavSearch = glyph("Search");
export const IconNavSettings = glyph("Setting");
