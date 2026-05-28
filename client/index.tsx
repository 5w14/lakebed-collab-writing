import { Link, Route, Router, Routes, SignInWithGoogle, signOut, useAuth, useMutation, useNavigate, useParams, useQuery } from "lakebed/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { cleanContent, cleanTitle, userColor, type AccessMode, type Document, type DocumentMember, type Workspace } from "../shared/writing";

type Theme = "dark" | "light";
type WidthMode = "slim" | "wide";

type ThemeProps = {
  theme: Theme;
  toggleTheme: () => void;
};

function IconArrowLeft() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
}
function IconSun() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
}
function IconMoon() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;
}
function IconPlus() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;
}
function IconLock() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect height="11" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function IconWidth() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6" /></svg>;
}
function IconUser() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconLogOut() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>;
}
function IconX() {
  return <svg className="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}

function classes(theme: Theme) {
  return {
    bg: theme === "dark" ? "bg-black" : "bg-white",
    text: theme === "dark" ? "text-white" : "text-black",
    border: theme === "dark" ? "border-white" : "border-black",
    divide: theme === "dark" ? "divide-white" : "divide-black",
  };
}

function IconButton({ children, onClick, type = "button", className = "" }: { children: preact.ComponentChildren; onClick?: () => void; type?: "button" | "submit"; className?: string }) {
  return <button className={`inline-flex cursor-pointer items-center gap-1 border px-2 py-1 text-xs ${className}`} type={type} onClick={onClick}>{children}</button>;
}

function Avatar({ label, picture, className = "h-6 w-6" }: { label: string; picture?: string; className?: string }) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "?";
  if (picture) return <img alt="" className={`${className} border object-cover`} referrerPolicy="no-referrer" src={picture} />;
  return <span className={`flex items-center justify-center border text-[10px] ${className}`}>{initial}</span>;
}

function AuthControls({ theme }: { theme: Theme }) {
  const auth = useAuth();
  const c = classes(theme);
  if (auth.isLoading) return null;
  return (
    <div className="flex items-center gap-2">
      {auth.isGuest ? (
        <SignInWithGoogle callbackPath="/" className={`inline-flex cursor-pointer items-center gap-1 border ${c.border} px-2 py-1 text-xs`}>
          <IconUser /> SIGN IN
        </SignInWithGoogle>
      ) : (
        <IconButton className={c.border} onClick={() => signOut()}><IconLogOut /> SIGN OUT</IconButton>
      )}
      <Avatar label={auth.displayName} picture={auth.picture} />
    </div>
  );
}

function canRead(doc: Document, members: DocumentMember[], userId: string) {
  return doc.ownerId === userId || doc.access === "view" || doc.access === "edit" || members.some((m) => m.userId === userId);
}
function canEdit(doc: Document, members: DocumentMember[], userId: string) {
  return doc.ownerId === userId || doc.access === "edit" || members.some((m) => m.userId === userId && m.role === "editor");
}
function canManage(doc: Document, userId: string) {
  return doc.ownerId === userId;
}

function Dashboard({ theme, toggleTheme }: ThemeProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const workspace = useQuery<Workspace>("workspace");
  const createDocument = useMutation<[title: string], Document>("createDocument");
  const documents = workspace?.documents ?? [];
  const members = workspace?.members ?? [];
  const privateDocuments = documents.filter((doc) => doc.ownerId === auth.userId);
  const sharedDocuments = documents.filter((doc) => doc.ownerId !== auth.userId && members.some((member) => member.documentId === doc.id && member.userId === auth.userId));
  const c = classes(theme);

  async function create(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const doc = await createDocument(cleanTitle(String(new FormData(form).get("title") ?? "")));
    form.reset();
    if (doc?.id) navigate(`/documents/${doc.id}`);
  }

  return (
    <div className={`min-h-screen ${c.bg} ${c.text} font-mono`}>
      <header className={`sticky top-0 z-30 border-b ${c.border} ${c.bg}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link className="text-sm font-bold" to="/">SHARED WRITING</Link>
          <div className="flex items-center gap-3">
            <IconButton className={c.border} onClick={toggleTheme}>{theme === "dark" ? <IconSun /> : <IconMoon />} {theme === "dark" ? "LIGHT" : "DARK"}</IconButton>
            <AuthControls theme={theme} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <form className={`mb-8 flex border ${c.border}`} onSubmit={(event) => void create(event)}>
          <input className={`min-w-0 flex-1 ${c.bg} ${c.text} px-3 py-2 outline-none`} name="title" placeholder="New document title" spellCheck={false} />
          <button className={`inline-flex cursor-pointer items-center gap-1 border-l ${c.border} px-4 py-2 text-xs font-bold`} type="submit"><IconPlus /> CREATE</button>
        </form>
        {privateDocuments.length > 0 ? (
          <section className="mb-8">
            <div className={`mb-2 border-b ${c.border} pb-1 text-xs font-bold uppercase tracking-wider`}>Private</div>
            <div className={`divide-y ${c.divide}`}>
              {privateDocuments.map((doc) => (
                <Link className="flex items-center justify-between py-3 hover:opacity-70" key={doc.id} to={`/documents/${doc.id}`}>
                  <span className="text-sm font-bold">{doc.title}</span>
                  <span className="text-xs">{doc.access}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {sharedDocuments.length > 0 ? (
          <section>
            <div className={`mb-2 border-b ${c.border} pb-1 text-xs font-bold uppercase tracking-wider`}>Given access</div>
            <div className={`divide-y ${c.divide}`}>
              {sharedDocuments.map((doc) => (
                <Link className="flex items-center justify-between py-3 hover:opacity-70" key={doc.id} to={`/documents/${doc.id}`}>
                  <span className="text-sm font-bold">{doc.title}</span>
                  <span className="text-xs">{members.find((member) => member.documentId === doc.id && member.userId === auth.userId)?.role ?? doc.access}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {privateDocuments.length === 0 && sharedDocuments.length === 0 ? <p className="py-4 text-sm">No private or explicitly shared documents yet.</p> : null}
      </main>
    </div>
  );
}

function AccessDialog({ doc, members, manageable, theme }: { doc: Document; members: DocumentMember[]; manageable: boolean; theme: Theme }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const setDocumentAccess = useMutation<[id: string, access: AccessMode], void>("setDocumentAccess");
  const inviteMember = useMutation<[documentId: string, userId: string, role: string], void>("inviteMember");
  const removeMember = useMutation<[memberId: string], void>("removeMember");
  const deleteDocument = useMutation<[documentId: string], void>("deleteDocument");
  const c = classes(theme);

  async function invite(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    await inviteMember(doc.id, String(data.get("userId") ?? ""), String(data.get("role") ?? "editor"));
    form.reset();
  }

  return (
    <>
      <IconButton className={c.border} onClick={() => dialogRef.current?.showModal()}><IconLock /> ACCESS</IconButton>
      <dialog ref={dialogRef} className={`fixed left-1/2 top-1/2 m-0 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 border ${c.border} ${c.bg} ${c.text} p-0 font-mono backdrop:bg-black/70`}>
        <div className={`flex items-center justify-between border-b ${c.border} px-4 py-3`}>
          <strong className="text-xs">ACCESS</strong>
          <button className="inline-flex cursor-pointer items-center gap-1 text-xs" type="button" onClick={() => dialogRef.current?.close()}><IconX /> CLOSE</button>
        </div>
        <div className="p-4 text-xs">
          <p className="mb-3">Owner: {doc.ownerName}</p>
          {manageable ? (
            <select className={`mb-4 w-full border ${c.border} ${c.bg} ${c.text} px-2 py-2 outline-none`} value={doc.access} onChange={(event) => void setDocumentAccess(doc.id, (event.currentTarget as HTMLSelectElement).value as AccessMode)}>
              <option value="private">Private</option>
              <option value="view">Public view</option>
              <option value="edit">Public edit</option>
            </select>
          ) : <div className={`mb-4 border ${c.border} px-2 py-2`}>{doc.access}</div>}

          {manageable ? (
            <form className={`mb-4 grid gap-2 border-b ${c.border} pb-4`} onSubmit={(event) => void invite(event)}>
              <input className={`border ${c.border} ${c.bg} ${c.text} px-2 py-2 outline-none`} name="userId" placeholder="Invite by user id" />
              <select className={`border ${c.border} ${c.bg} ${c.text} px-2 py-2 outline-none`} name="role"><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
              <button className={`inline-flex cursor-pointer items-center gap-1 border ${c.border} px-2 py-2 font-bold`} type="submit"><IconPlus /> INVITE</button>
            </form>
          ) : null}

          <div className="space-y-2">
            {members.map((member) => (
              <div className="flex items-center justify-between" key={member.id}>
                <span><strong>{member.displayName}</strong> <span className="opacity-60">{member.role}</span></span>
                {manageable ? <button className="inline-flex cursor-pointer items-center gap-1 hover:opacity-70" type="button" onClick={() => void removeMember(member.id)}><IconX /> REMOVE</button> : null}
              </div>
            ))}
            {!members.length ? <p className="opacity-60">No invited users.</p> : null}
          </div>
          {manageable ? (
            <button
              className={`mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-1 border ${c.border} px-2 py-2 text-xs font-bold`}
              type="button"
              onClick={() => {
                if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
                void deleteDocument(doc.id).then(() => {
                  dialogRef.current?.close();
                  navigate("/");
                });
              }}
            >
              <IconX /> DELETE DOCUMENT
            </button>
          ) : null}
          <p className={`mt-4 border-t ${c.border} pt-3 text-[10px] opacity-60`}>Your id: {auth.userId}</p>
        </div>
      </dialog>
    </>
  );
}

function DocumentPage({ theme, toggleTheme }: ThemeProps) {
  const auth = useAuth();
  const { id = "" } = useParams<{ id: string }>();
  const workspace = useQuery<Workspace>("workspace");
  const updateDocument = useMutation<[id: string, title: string, content: string], void>("updateDocument");
  const updateCursor = useMutation<[documentId: string, x: string, y: string, selection: string], void>("updateCursor");
  const deleteCursor = useMutation<[documentId: string], void>("deleteCursor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedDocId = useRef("");
  const lastServerVersion = useRef("");
  const dirtyRef = useRef(false);
  const pendingSaveRef = useRef<{ title: string; content: string } | null>(null);
  const latestTitleRef = useRef("");
  const latestContentRef = useRef("");
  const lastCursorAt = useRef(0);

  const workspaceDocuments = workspace?.documents ?? [];
  const workspaceMembers = workspace?.members ?? [];
  const workspaceCursors = workspace?.cursors ?? [];
  const doc = workspaceDocuments.find((item) => item.id === id);
  const members = workspaceMembers.filter((member) => member.documentId === id);
  const cursors = workspaceCursors.filter((cursor) => cursor.documentId === id);
  const editable = doc ? canEdit(doc, members, auth.userId) : false;
  const manageable = doc ? canManage(doc, auth.userId) : false;
  const readable = doc ? canRead(doc, members, auth.userId) : false;
  const c = classes(theme);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("saved");
  const [widthMode, setWidthMode] = useState<WidthMode>(() => {
    try { return (localStorage.getItem("widthMode") as WidthMode) || "slim"; } catch { return "slim"; }
  });

  useEffect(() => { latestTitleRef.current = title; }, [title]);
  useEffect(() => { latestContentRef.current = content; }, [content]);
  useEffect(() => { try { localStorage.setItem("widthMode", widthMode); } catch {} }, [widthMode]);

  function resizeTextarea() {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
  }

  useEffect(() => {
    requestAnimationFrame(resizeTextarea);
  }, [content, widthMode]);

  function textDiff(before: string, after: string) {
    if (before === after) return null;
    let start = 0;
    const prefixLimit = Math.min(before.length, after.length);
    for (let i = 0; i < prefixLimit; i++) {
      if (before[i] !== after[i]) break;
      start = i + 1;
    }
    let suffix = 0;
    const suffixLimit = Math.min(before.length - start, after.length - start);
    for (let i = 0; i < suffixLimit; i++) {
      if (before[before.length - 1 - i] !== after[after.length - 1 - i]) break;
      suffix = i + 1;
    }
    return { at: start, removed: before.length - suffix - start, inserted: after.length - suffix - start };
  }

  function shiftOffset(offset: number, diff: { at: number; removed: number; inserted: number }) {
    if (offset <= diff.at) return offset;
    if (offset >= diff.at + diff.removed) return offset + diff.inserted - diff.removed;
    return diff.at + diff.inserted;
  }

  function applyServerDoc(next: Document) {
    const textarea = textareaRef.current;
    const active = textarea && document.activeElement === textarea;
    const diff = active ? textDiff(latestContentRef.current, next.content) : null;
    const start = active ? textarea.selectionStart : 0;
    const end = active ? textarea.selectionEnd : 0;
    const shiftedStart = diff ? shiftOffset(start, diff) : start;
    const shiftedEnd = diff ? shiftOffset(end, diff) : end;
    latestTitleRef.current = next.title;
    latestContentRef.current = next.content;
    setTitle(next.title);
    setContent(next.content);
    if (active) {
      requestAnimationFrame(() => {
        const t = textareaRef.current;
        if (!t) return;
        resizeTextarea();
        t.setSelectionRange(Math.min(shiftedStart, t.value.length), Math.min(shiftedEnd, t.value.length));
      });
    }
  }

  useEffect(() => {
    if (!doc) return;
    if (loadedDocId.current !== doc.id) {
      loadedDocId.current = doc.id;
      lastServerVersion.current = doc.updatedAt;
      dirtyRef.current = false;
      pendingSaveRef.current = null;
      applyServerDoc(doc);
      setSaved("saved");
      return;
    }
    if (doc.updatedAt === lastServerVersion.current) return;
    lastServerVersion.current = doc.updatedAt;

    const pending = pendingSaveRef.current;
    if (pending && doc.title === pending.title && doc.content === pending.content) {
      pendingSaveRef.current = null;
      if (cleanTitle(latestTitleRef.current) === doc.title && cleanContent(latestContentRef.current) === doc.content) {
        dirtyRef.current = false;
        setSaved("saved");
      }
      return;
    }

    if (!dirtyRef.current) {
      applyServerDoc(doc);
      setSaved("saved");
    }
  }, [doc?.id, doc?.updatedAt]);

  useEffect(() => {
    if (!doc || !editable) return;
    const cleanT = cleanTitle(title);
    const cleanC = cleanContent(content);
    if (!dirtyRef.current && cleanT === doc.title && cleanC === doc.content) {
      setSaved("saved");
      return;
    }
    setSaved("saving…");
    const timer = window.setTimeout(() => {
      const sent = { title: cleanTitle(latestTitleRef.current), content: cleanContent(latestContentRef.current) };
      pendingSaveRef.current = sent;
      void updateDocument(doc.id, sent.title, sent.content).then(() => {
        if (cleanTitle(latestTitleRef.current) === sent.title && cleanContent(latestContentRef.current) === sent.content) {
          dirtyRef.current = false;
          setSaved("saved");
        }
      });
    }, cursors.length > 0 ? 80 : 450);
    return () => window.clearTimeout(timer);
  }, [title, content, doc?.id, editable, cursors.length]);

  useEffect(() => {
    if (!doc || !editable) return;
    void updateCursor(doc.id, "0", "0", "");
    return () => { void deleteCursor(doc.id); };
  }, [doc?.id, editable, auth.userId]);

  useEffect(() => {
    if (!doc || !editable || cursors.length === 0) return;
    const interval = setInterval(() => publishCaret(true), 2500);
    return () => clearInterval(interval);
  }, [doc?.id, editable, auth.userId, cursors.length]);

  function publishCaret(force = false) {
    const now = Date.now();
    if (!force && now - lastCursorAt.current < 120) return;
    if (!doc || !editable || cursors.length === 0) return;
    lastCursorAt.current = now;
    const t = textareaRef.current;
    if (!t) return;
    const offset = t.selectionStart;
    const beforeCaret = t.value.slice(0, offset);
    const lines = beforeCaret.split("\n");
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length ?? 0;
    const selected = Math.abs(t.selectionEnd - t.selectionStart);
    void updateCursor(doc.id, String(offset), "0", selected ? `${selected} selected` : `line ${line + 1}, col ${column + 1}`);
  }

  const wordCount = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content]);

  if (!workspace) return <BasicPage theme={theme} toggleTheme={toggleTheme} title="Loading…" />;
  if (!doc) return <BasicPage theme={theme} toggleTheme={toggleTheme} title="Document not found or not shared with you." />;

  return (
    <div className={`min-h-screen ${c.bg} ${c.text} font-mono`}>
      <header className={`sticky top-0 z-30 border-b ${c.border} ${c.bg}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4"><Link className="inline-flex items-center gap-1 text-sm font-bold" to="/"><IconArrowLeft /> DOCUMENTS</Link><span className="hidden text-xs opacity-60 sm:inline">{saved} · {wordCount} words</span></div>
          <div className="flex items-center gap-3">
            <IconButton className={c.border} onClick={() => setWidthMode((w) => (w === "slim" ? "wide" : "slim"))}><IconWidth /> {widthMode === "slim" ? "WIDE" : "SLIM"}</IconButton>
            <AccessDialog doc={doc} members={members} manageable={manageable} theme={theme} />
            {cursors.length > 0 ? <div className="flex items-center gap-1">{cursors.map((cursor) => <Avatar key={cursor.userId} label={cursor.displayName} picture={cursor.picture} className="h-5 w-5" />)}</div> : null}
            <IconButton className={c.border} onClick={toggleTheme}>{theme === "dark" ? <IconSun /> : <IconMoon />} {theme === "dark" ? "LIGHT" : "DARK"}</IconButton>
            <AuthControls theme={theme} />
          </div>
        </div>
      </header>

      <main className={`mx-auto ${widthMode === "slim" ? "max-w-[80ch]" : ""} px-4 py-6`}>
        <input className={`w-full border-b ${c.border} ${c.bg} ${c.text} px-0 py-3 text-2xl font-bold outline-none`} disabled={!editable} spellCheck={false} value={title} onInput={(event) => { dirtyRef.current = true; setTitle((event.currentTarget as HTMLInputElement).value); }} />
        <div className="relative mt-2">
          <div className="pointer-events-none absolute inset-0 z-10 font-mono text-base" style={{ lineHeight: "1.6" }}>
            {cursors.map((cursor) => {
              const color = userColor(cursor.userId);
              const offset = Math.max(0, Math.min(content.length, Number(cursor.x) || 0));
              return (
                <div key={cursor.id} className="absolute inset-0 whitespace-pre-wrap break-words text-transparent" style={{ lineHeight: "1.6" }}>
                  <span>{content.slice(0, offset)}</span>
                  <span className="relative inline-block h-[1.1em] w-0.5 align-text-top" style={{ backgroundColor: color }}>
                    <span className="absolute left-1 top-[-0.95em] whitespace-nowrap text-[9px]" style={{ color }}>{cursor.displayName}</span>
                  </span>
                  <span>{content.slice(offset)}</span>
                </div>
              );
            })}
          </div>
          <textarea ref={textareaRef} className={`min-h-[70vh] w-full resize-none overflow-hidden whitespace-pre-wrap break-words ${c.bg} ${c.text} px-0 py-0 text-base outline-none`} disabled={!editable} placeholder={editable ? "Start writing…" : "Read-only"} spellCheck={false} style={{ lineHeight: "1.6" }} value={content} onClick={() => publishCaret()} onInput={(event) => { const next = (event.currentTarget as HTMLTextAreaElement).value; dirtyRef.current = true; latestContentRef.current = next; setContent(next); requestAnimationFrame(resizeTextarea); publishCaret(); }} onKeyUp={() => publishCaret()} onSelect={() => publishCaret()} />
        </div>
      </main>
    </div>
  );
}

function decodeBase64UrlJson(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function completeGoogleCallbackIfNeeded() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code) return;

  const rawPkce = window.sessionStorage.getItem("lakebed_google_pkce");
  const pkce = rawPkce ? JSON.parse(rawPkce) : null;
  if (!pkce?.verifier) return;

  const redirectUri = `${window.location.origin}${url.pathname}`;
  const body = new URLSearchParams({
    client_id: `origin:${window.location.origin}`,
    code,
    code_verifier: pkce.verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://shoo.dev/token", {
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!response.ok) return;

  const token = await response.json();
  const idToken = token.id_token;
  const claims = typeof idToken === "string" ? decodeBase64UrlJson(idToken.split(".")[1] ?? "") : null;
  const userId = token.pairwise_sub ?? claims?.pairwise_sub ?? claims?.sub;
  if (!idToken || !userId) return;

  window.localStorage.setItem("lakebed_identity", JSON.stringify({
    expiresIn: token.expires_in,
    receivedAt: Date.now(),
    token: idToken,
    userId,
  }));
  window.sessionStorage.removeItem("lakebed_google_pkce");

  const returnTo = window.sessionStorage.getItem("lakebed_google_return_to") || "/";
  window.sessionStorage.removeItem("lakebed_google_return_to");
  window.location.replace(returnTo);
}

function BasicPage({ theme, toggleTheme, title }: ThemeProps & { title: string }) {
  const c = classes(theme);
  return <div className={`min-h-screen ${c.bg} ${c.text} font-mono`}><header className={`border-b ${c.border} ${c.bg}`}><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"><Link className="inline-flex items-center gap-1 text-sm font-bold" to="/"><IconArrowLeft /> DOCUMENTS</Link><IconButton className={c.border} onClick={toggleTheme}>{theme === "dark" ? <IconSun /> : <IconMoon />} {theme === "dark" ? "LIGHT" : "DARK"}</IconButton></div></header><main className="mx-auto max-w-7xl px-4 py-10"><h1 className="text-lg font-bold">{title}</h1></main></div>;
}

export function App() {
  const [theme, setTheme] = useState<Theme>(() => { try { return (localStorage.getItem("theme") as Theme) || "dark"; } catch { return "dark"; } });
  useEffect(() => { try { localStorage.setItem("theme", theme); } catch {} }, [theme]);
  useEffect(() => { void completeGoogleCallbackIfNeeded(); }, []);
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return <Router><Routes><Route path="/" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} /><Route path="/documents/:id" element={<DocumentPage theme={theme} toggleTheme={toggleTheme} />} /><Route path="/auth/callback" element={<BasicPage theme={theme} toggleTheme={toggleTheme} title="Signing in…" />} /><Route path="*" element={<BasicPage theme={theme} toggleTheme={toggleTheme} title="Not found" />} /></Routes></Router>;
}
