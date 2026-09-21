export function displayLabel(me?: { displayName?: string; username?: string } | null) {
  const name = me?.displayName?.trim() ?? "";
  if (name && !/^[?？]+$/.test(name)) return name;
  return me?.username?.trim() || "未登录";
}

export function actorLabel(person?: {
  displayName?: string;
  username?: string;
  createdByName?: string;
  createdByUsername?: string;
} | null) {
  return displayLabel({
    displayName: person?.displayName ?? person?.createdByName,
    username: person?.username ?? person?.createdByUsername,
  }).replace(/^未登录$/, "未知用户");
}
