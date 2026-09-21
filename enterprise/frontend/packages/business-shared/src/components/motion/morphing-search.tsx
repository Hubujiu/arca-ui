import type { DataStyle } from "@/lib/data-style";
"use client";
import { useMotionPreference as useReducedMotion } from "@/lib/motion-preference";
// beui.dev/components/blocks/morphing-search

import { AnimatePresence, LayoutGroup, motion, type Transition } from "motion/react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { useOnOpen } from "@/lib/hooks/use-on-open";
import { useRowCursor } from "@/lib/hooks/use-row-cursor";
import { cn } from "@/lib/utils";
import { IconSearch } from "../../shared/icons";

// Keeps the Wallet Card feel with a little more time to read the morph.
const SEARCH_MORPH: Transition = {
	type: "spring",
	duration: 0.58,
	bounce: 0.22,
};

// Keep the spring on the shell, but unfold complex clip-path values with the
// same progressive tween as Morph Popover so the content never snaps ahead.
const SEARCH_CLIP_TRANSITION: Transition = {
	duration: 0.32,
	ease: EASE_OUT,
};

export type MorphingSearchItem = {
	id: string;
	title: string;
	description?: string;
	group?: string;
	keywords?: string[];
	icon?: ReactNode;
	onSelect?: () => void;
};

export interface MorphingSearchProps {
	items: MorphingSearchItem[];
	placeholder?: string;
	triggerLabel?: string;
	/** Unfold at the viewport center over a blurred page, like the beUI site search. */
	centered?: boolean;
	shortcut?: string;
	/** Render the closed trigger as a compact search icon. */
	iconOnly?: boolean;
	emptyMessage?: string;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	onQueryChange?: (query: string) => void;
	onSelect?: (item: MorphingSearchItem) => void;
	className?: string;
	/** The caller owns matching/ranking for federated or server-side search. */
	filterItems?: boolean;
	toolbar?: ReactNode;
	footer?: ReactNode;
}

type AnchorRect = {
	top: number;
	left: number;
	width: number;
};

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	);
}

export function MorphingSearch({
	items,
	placeholder = "搜索",
	triggerLabel,
	centered = false,
	shortcut = "f",
	iconOnly = false,
	emptyMessage = "没有匹配的结果",
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange,
	onQueryChange,
	onSelect,
	className,
	filterItems = true,
	toolbar,
	footer,
}: MorphingSearchProps) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const [query, setQuery] = useState("");
	const [mounted, setMounted] = useState(false);
	const [dialogHeight, setDialogHeight] = useState(0);
	const [backgroundScrollLocked, setBackgroundScrollLocked] =
		useState(defaultOpen);
	const [anchorRect, setAnchorRect] = useState<AnchorRect>({
		top: 16,
		left: 16,
		width: 288,
	});
	const open = controlledOpen ?? internalOpen;
	const controlled = controlledOpen !== undefined;
	const reduce = useReducedMotion();
	const uid = useId();
	const anchorRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);
	const wasOpenRef = useRef(open);
	const transition: Transition = reduce ? { duration: 0 } : SPRING_LAYOUT;
	const morphTransition: Transition = reduce ? { duration: 0 } : SEARCH_MORPH;

	const setOpen = useCallback(
		(next: boolean) => {
			if (!controlled) setInternalOpen(next);
			onOpenChange?.(next);
		},
		[controlled, onOpenChange],
	);

	const measureAnchor = useCallback(() => {
		const rect = anchorRef.current?.getBoundingClientRect();
		if (!rect || rect.width === 0) return;
		setAnchorRect({ top: rect.top, left: rect.left, width: rect.width });
	}, []);

	const openSearch = useCallback(() => {
		measureAnchor();
		setBackgroundScrollLocked(true);
		previousFocusRef.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		setOpen(true);
	}, [measureAnchor, setOpen]);

	const filteredItems = useMemo(() => {
		if (!filterItems) return items;
		const needle = query.trim().toLowerCase();
		if (!needle) return items;

		return items.filter((item) =>
			[item.title, item.description ?? "", ...(item.keywords ?? [])]
				.join(" ")
				.toLowerCase()
				.includes(needle),
		);
	}, [items, query, filterItems]);

	const { activeIndex, moveTo, moveActive } = useRowCursor(filteredItems, query);

	// The cursor is stamped with the query, so changing it drops the highlight
	// without this having to say so.
	const updateQuery = useCallback(
		(next: string) => {
			setQuery(next);
			onQueryChange?.(next);
		},
		[onQueryChange],
	);

	const closeSearch = useCallback(() => {
		updateQuery("");
		setOpen(false);
	}, [setOpen, updateQuery]);

	useEffect(() => setMounted(true), []);

	useLayoutEffect(() => {
		if (!open || !mounted || !dialogRef.current) return;
		const observer = new ResizeObserver(([entry]) => setDialogHeight(entry.contentRect.height));
		observer.observe(dialogRef.current);
		return () => observer.disconnect();
	}, [open, mounted]);

	useEffect(() => {
		if (open) setBackgroundScrollLocked(true);
	}, [open]);

	useEffect(() => {
		measureAnchor();
		const anchor = anchorRef.current;
		const observer =
			anchor && typeof ResizeObserver !== "undefined"
				? new ResizeObserver(measureAnchor)
				: null;
		if (anchor) observer?.observe(anchor);
		window.addEventListener("resize", measureAnchor);
		document.addEventListener("scroll", measureAnchor, true);
		window.visualViewport?.addEventListener("resize", measureAnchor);
		window.visualViewport?.addEventListener("scroll", measureAnchor);
		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", measureAnchor);
			document.removeEventListener("scroll", measureAnchor, true);
			window.visualViewport?.removeEventListener("resize", measureAnchor);
			window.visualViewport?.removeEventListener("scroll", measureAnchor);
		};
	}, [measureAnchor]);

	useEffect(() => {
		if (!backgroundScrollLocked) return;

		const preventBackgroundWheel = (event: WheelEvent) => {
			const target = event.target;
			if (target instanceof Node && listRef.current?.contains(target)) return;
			event.preventDefault();
		};
		const preventBackgroundTouch = (event: TouchEvent) => {
			const target = event.target;
			if (target instanceof Node && listRef.current?.contains(target)) return;
			event.preventDefault();
		};

		document.addEventListener("wheel", preventBackgroundWheel, {
			passive: false,
		});
		document.addEventListener("touchmove", preventBackgroundTouch, {
			passive: false,
		});
		return () => {
			document.removeEventListener("wheel", preventBackgroundWheel);
			document.removeEventListener("touchmove", preventBackgroundTouch);
		};
	}, [backgroundScrollLocked]);

	useEffect(() => {
		const handleShortcut = (event: KeyboardEvent) => {
			if (event.key === "Escape" && open) {
				event.preventDefault();
				closeSearch();
				return;
			}

			if (
				!open &&
				shortcut &&
				(shortcut === "mod+k" ? event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) : event.key.toLowerCase() === shortcut.toLowerCase()) &&
				!event.repeat &&
				(shortcut === "mod+k" || (!event.metaKey && !event.ctrlKey)) &&
				!event.altKey &&
				!event.shiftKey &&
				(shortcut === "mod+k" || !isEditableTarget(event.target))
			) {
				event.preventDefault();
				openSearch();
			}
		};

		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, [closeSearch, open, openSearch, shortcut]);

	// Only this component's own state. Telling the consumer the query changed is
	// a side effect, so it waits for the effect below.
	useOnOpen(open, () => {
		setQuery("");
		moveTo(null);
	});

	// Keyed to `open` alone. `onQueryChange` is read through a ref because an
	// inline one changes identity on every keystroke, and this effect clearing
	// the field on every keystroke is exactly what that costs. Written after
	// commit for the reason `lib/hooks/use-row-cursor.ts` gives at length.
	const notifyQuery = useRef(onQueryChange);
	useLayoutEffect(() => {
		notifyQuery.current = onQueryChange;
	});

	useEffect(() => {
		if (open) {
			notifyQuery.current?.("");
			const frame = requestAnimationFrame(() => inputRef.current?.focus());
			return () => cancelAnimationFrame(frame);
		}

		if (wasOpenRef.current) {
			const frame = requestAnimationFrame(() => {
				const previousFocus = previousFocusRef.current;
				const focusTarget = previousFocus?.isConnected
					? previousFocus
					: triggerRef.current;
				focusTarget?.focus();
			});
			return () => cancelAnimationFrame(frame);
		}
	}, [open]);

	useEffect(() => {
		wasOpenRef.current = open;
	}, [open]);

	useEffect(() => {
		if (!open) return;
		listRef.current
			?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, open]);

	const selectItem = useCallback(
		(item: MorphingSearchItem) => {
			item.onSelect?.();
			onSelect?.(item);
			closeSearch();
		},
		[closeSearch, onSelect],
	);

	const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.nativeEvent.isComposing || event.keyCode === 229) return;
		const inResults = event.target === inputRef.current || listRef.current?.contains(event.target as Node);
		if (event.key === "ArrowDown" && inResults) {
			event.preventDefault();
			moveActive(1);
			return;
		}

		if (event.key === "ArrowUp" && inResults) {
			event.preventDefault();
			moveActive(-1);
			return;
		}

		if (event.key === "Enter" && inResults) {
			event.preventDefault();
			const item = filteredItems[activeIndex];
			if (item) selectItem(item);
			return;
		}

		if (event.key !== "Tab" || !dialogRef.current) return;
		const focusable = Array.from(
			dialogRef.current.querySelectorAll<HTMLElement>(
				'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
			),
		);
		const first = focusable[0];
		const last = focusable.at(-1);
		if (!first || !last) return;

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	const shellLayoutId = `${uid}-shell`;
	const listboxId = `${uid}-results`;
	const viewportWidth = mounted ? (window.visualViewport?.width ?? window.innerWidth) : 576;
	const viewportHeight = mounted ? (window.visualViewport?.height ?? window.innerHeight) : 720;
	const viewportLeft = mounted ? (window.visualViewport?.offsetLeft ?? 0) : 0;
	const viewportTop = mounted ? (window.visualViewport?.offsetTop ?? 0) : 0;
	const panelWidth = mounted ? Math.min(centered ? 576 : 560, viewportWidth - 24) : anchorRect.width;
	const panelLeft = centered ? viewportLeft + (viewportWidth - panelWidth) / 2 : mounted ? Math.max(12, Math.min(anchorRect.left, window.innerWidth - panelWidth - 12)) : anchorRect.left;
	const panelTop = centered ? viewportTop + viewportHeight / 2 : mounted ? Math.max(12, Math.min(anchorRect.top, window.innerHeight - 300)) : anchorRect.top;
	const extraHeight = (toolbar ? 44 : 0) + (footer ? 84 : 0);
	const groupCount = filteredItems.filter((item, index) => item.group && item.group !== filteredItems[index - 1]?.group).length;
	const contentHeight = Math.max(96, filteredItems.length * 60 + groupCount * 32 + 16);
	const resultsHeight = mounted
		? Math.max(64, Math.min(contentHeight, 384, centered ? viewportHeight - 72 - extraHeight : window.innerHeight - panelTop - 72 - extraHeight))
		: 288;
	const collapsedContentClip = centered ? "inset(48% 45% 48% 45% round 16px)" : `inset(0px ${Math.max(
		0,
		panelWidth - anchorRect.width,
	)}px ${resultsHeight}px 0px round 12px)`;
	const expandedContentClip = centered ? "inset(0% 0% 0% 0% round 16px)" : "inset(0px 0px 0px 0px round 12px)";

	// Keep the viewport blur on a separate sibling so the search surface stays sharp.
	const overlay = mounted
		? createPortal(
				<div
					aria-hidden={!open}
					inert={!open}
					className="pointer-events-none fixed left-0 top-0 z-50 size-0"
				>
					<AnimatePresence
						initial={false}
						mode="popLayout"
						onExitComplete={() => setBackgroundScrollLocked(false)}
					>
						{open ? (
							<motion.div
								key="morphing-search-overlay"
								className="fixed left-0 top-0 size-0"
							>
								<motion.button
									type="button"
									aria-label="关闭搜索"
									tabIndex={-1}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: reduce ? 0 : 0.24, ease: EASE_OUT }}
									className={cn("pointer-events-auto fixed inset-0 cursor-default", centered ? "bg-background/20 " : "bg-transparent")}
									onClick={closeSearch}
								/>

								{!centered && <motion.div
									layoutId={shellLayoutId}
									aria-hidden="true"
									className="dw-data-morphing-search-1 fixed z-10 rounded-card bg-background/90"
									style={({
										top: panelTop,
										left: panelLeft,
										width: panelWidth,
										height: dialogHeight || 48 + resultsHeight + extraHeight,
										"--dw-data-morphing-search-1-box-shadow": "var(--ui-shadow)",
									}) as DataStyle}
									transition={morphTransition}
								/>}

								<motion.div
									ref={dialogRef}
									role="dialog"
									aria-modal="true"
									aria-label="搜索"
									onKeyDown={handleDialogKeyDown}
									initial={
										reduce
											? false
											: { opacity: 0, clipPath: collapsedContentClip }
									}
									animate={{ opacity: 1, clipPath: expandedContentClip }}
									exit={{
										opacity: 0,
										clipPath: collapsedContentClip,
										transition: reduce
											? { duration: 0 }
											: {
													clipPath: SEARCH_CLIP_TRANSITION,
													opacity: SEARCH_MORPH,
												},
									}}
									transition={
										reduce
											? { duration: 0 }
											: {
													clipPath: SEARCH_CLIP_TRANSITION,
													opacity: SEARCH_MORPH,
												}
									}
									className={["dw-data-morphing-search-2", cn("pointer-events-auto fixed z-20 overflow-hidden", centered ? "rounded-panel border border-border bg-card shadow-tactile" : "rounded-card")].filter(Boolean).join(" ")}
									style={({
										top: panelTop,
										left: panelLeft,
										width: panelWidth,
										"--dw-data-morphing-search-2-translate": centered ? "0 -50%" : undefined,
									}) as DataStyle}
								>
									<div
										className={cn(
											"flex h-12 items-center gap-2.5 border-b border-border",
											iconOnly ? "px-4" : "px-3.5",
										)}
									>
										<span className="shrink-0">
											<IconSearch size={16} />
										</span>
										<div className="flex h-10 min-w-0 flex-1 items-center">
											<input
												ref={inputRef}
												value={query}
												onChange={(event) => updateQuery(event.target.value)}
												role="combobox"
												aria-label={placeholder}
												aria-expanded="true"
												aria-controls={listboxId}
												aria-autocomplete="list"
												aria-activedescendant={
													filteredItems.length > 0
														? `${uid}-option-${activeIndex}`
														: undefined
												}
												placeholder={placeholder}
												className="size-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
											/>
										</div>
											<button type="button" onClick={closeSearch} aria-label="关闭搜索面板" className="flex h-7 shrink-0 items-center rounded-control border border-border px-2 text-caption text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
												Esc
											</button>
									</div>
									{toolbar}

									<motion.div
										ref={listRef}
										id={listboxId}
										role="listbox"
										aria-label="搜索结果"
										transition={reduce ? { duration: 0 } : undefined}
										variants={
											reduce
												? undefined
												: {
														closed: {
															opacity: 0,
															transform: "translateY(6px)",
															transition: {
																duration: 0.16,
																delay: 0.18,
																ease: EASE_OUT,
															},
														},
														open: {
															opacity: 1,
															transform: "translateY(0px)",
															transition: {
																duration: 0.16,
																ease: EASE_OUT,
															},
														},
													}
										}
										initial={
											reduce
												? { opacity: 1, transform: "translateY(0px)" }
												: "closed"
										}
										animate={
											reduce
												? { opacity: 1, transform: "translateY(0px)" }
												: "open"
										}
										exit={reduce ? undefined : "closed"}
										className="overscroll-contain overflow-y-auto p-2"
										style={{
											height: resultsHeight,
										}}
									>
										{filteredItems.length > 0 ? (
											filteredItems.map((item, index) => {
												const active = index === activeIndex;
													return (
														<div key={item.id} role="presentation">
														{item.group && item.group !== filteredItems[index - 1]?.group && <div role="presentation" className="px-3 pb-1 pt-3 text-caption font-medium text-muted-foreground">{item.group}</div>}
														<button
														key={item.id}
														id={`${uid}-option-${index}`}
														type="button"
														role="option"
														aria-selected={active}
														data-index={index}
														onMouseMove={() => moveTo(item.id)}
														onFocus={() => moveTo(item.id)}
														onClick={() => selectItem(item)}
														className="relative flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
													>
														{active ? (
															<motion.span
																layoutId={`${uid}-active-result`}
																className="absolute inset-0 rounded-control bg-foreground/5"
																transition={transition}
															/>
														) : null}
														{item.icon ? (
															<span className="relative size-4 shrink-0 text-muted-foreground">
																{item.icon}
															</span>
														) : null}
														<span className="relative min-w-0">
															<span className="block truncate text-body font-medium text-foreground">
																{item.title}
															</span>
															{item.description ? (
																<span className="block truncate text-caption text-muted-foreground">
																	{item.description}
																</span>
															) : null}
														</span>
														</button>
														</div>
												);
											})
										) : (
											<p className="px-3 py-8 text-center text-body text-muted-foreground">
												{emptyMessage}
											</p>
										)}
									</motion.div>
									{footer}
								</motion.div>
							</motion.div>
						) : null}
					</AnimatePresence>
				</div>,
				document.body,
			)
		: null;

	return (
		<LayoutGroup id={uid}>
			<div
				ref={anchorRef}
				className={cn(
					"relative",
					iconOnly ? "size-12" : "h-12 w-72 max-w-full",
					className,
				)}
			>
				{!open || centered ? (
					<motion.button
						ref={triggerRef}
						key="morphing-search-trigger"
						layoutId={centered ? undefined : shellLayoutId}
						type="button"
						aria-haspopup="dialog"
						aria-expanded={open}
						aria-label={placeholder}
						onClick={openSearch}
						transition={morphTransition}
						style={({
							"--dw-data-morphing-search-3-box-shadow": "inset 0 0 0 1px var(--search-trigger-stroke)",
						}) as DataStyle}
						className={["dw-data-morphing-search-3", cn(
							"flex size-full items-center text-left outline-none search-trigger-stroke hover:search-trigger-stroke-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
							centered ? "rounded-full bg-card" : "rounded-card bg-background/60 ",
							iconOnly ? "cursor-pointer justify-center" : "cursor-text px-3.5",
						)].filter(Boolean).join(" ")}
					></motion.button>
				) : null}
				<motion.div
					aria-hidden="true"
					initial={false}
					animate={{ opacity: open && !centered ? 0 : 1 }}
					transition={
						reduce
							? { duration: 0 }
							: {
									duration: 0.1,
									delay: open ? 0.1 : 0.12,
									ease: EASE_OUT,
								}
					}
					className={cn(
						"pointer-events-none absolute inset-0 flex items-center",
						backgroundScrollLocked && !centered && "z-60",
						iconOnly ? "justify-center" : "gap-2.5 px-3.5",
					)}
				>
					<IconSearch size={16} />
					{iconOnly ? null : (
						<>
							<span data-search-label className="min-w-0 flex-1 truncate text-body text-muted-foreground">
								{triggerLabel ?? placeholder}
							</span>
							{shortcut ? (
								<kbd data-search-shortcut className="flex shrink-0 items-center justify-center rounded-control border border-border bg-background px-1.5 py-0.5 text-caption text-muted-foreground">
									{shortcut === "mod+k" ? (mounted && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K") : shortcut.toUpperCase()}
								</kbd>
							) : null}
						</>
					)}
				</motion.div>
			</div>
			{overlay}
		</LayoutGroup>
	);
}
