import { capsule, endpoint, mutation, query, string, table, text } from "lakebed/server";
import { COLLAB_FEATURES_ENABLED, CURSOR_TIMEOUT_MS, cleanAccess, cleanContent, cleanCoordinate, cleanReadAccess, cleanRole, cleanTitle, cleanUserId } from "../shared/writing";

function canRead(doc: { ownerId: string; access: string }, members: Array<{ userId: string }>, userId: string) {
  return doc.ownerId === userId || doc.access === "view" || doc.access === "edit" || members.some((member) => member.userId === userId);
}

function canEdit(doc: { ownerId: string; access: string }, members: Array<{ userId: string; role: string }>, userId: string) {
  if (!COLLAB_FEATURES_ENABLED) return doc.ownerId === userId;
  return doc.ownerId === userId || doc.access === "edit" || members.some((member) => member.userId === userId && member.role === "editor");
}

export default capsule({
  name: "shared-writing",

  schema: {
    documents: table({
      title: string(),
      content: string(),
      access: string().default("private"),
      ownerId: string(),
      ownerName: string()
    }),
    documentMembers: table({
      documentId: string(),
      userId: string(),
      displayName: string(),
      role: string().default("editor")
    }),
    cursors: table({
      documentId: string(),
      userId: string(),
      displayName: string(),
      picture: string(),
      x: string().default("0"),
      y: string().default("0"),
      selection: string().default(""),
      lastSeenAt: string().default("0")
    })
  },

  queries: {
    workspace: query((ctx) => {
      const userId = ctx.auth.userId;
      const documents = ctx.db.documents.orderBy("updatedAt", "desc").all();
      const members = ctx.db.documentMembers.all();
      const readableDocuments = documents.filter((doc) => canRead(doc, members.filter((member) => member.documentId === doc.id), userId));
      const readableIds = readableDocuments.map((doc) => doc.id);

      const now = Date.now();
      const cutoff = now - CURSOR_TIMEOUT_MS;

      return {
        documents: readableDocuments,
        members: members.filter((member) => readableIds.includes(member.documentId)),
        cursors: COLLAB_FEATURES_ENABLED
          ? ctx.db.cursors
            .orderBy("updatedAt", "desc")
            .all()
            .filter((cursor) => readableIds.includes(cursor.documentId) && cursor.userId !== userId && Number(cursor.lastSeenAt) > cutoff)
          : []
      };
    })
  },

  mutations: {
    createDocument: mutation((ctx, title: string) => {
      return ctx.db.documents.insert({
        title: cleanTitle(title),
        content: "",
        access: "private",
        ownerId: ctx.auth.userId,
        ownerName: ctx.auth.displayName
      });
    }),

    updateDocument: mutation((ctx, id: string, title: string, content: string) => {
      const doc = ctx.db.documents.get(id);
      if (!doc) return;
      const members = ctx.db.documentMembers.where("documentId", id).all();
      if (!canEdit(doc, members, ctx.auth.userId)) return;

      ctx.db.documents.update(id, { title: cleanTitle(title), content: cleanContent(content) });
    }),

    ...(COLLAB_FEATURES_ENABLED ? {
      setDocumentAccess: mutation((ctx, id: string, access: string) => {
        const doc = ctx.db.documents.get(id);
        if (!doc || doc.ownerId !== ctx.auth.userId) return;
        ctx.db.documents.update(id, { access: cleanAccess(access) });
      }),

      inviteMember: mutation((ctx, documentId: string, userId: string, role: string) => {
        const doc = ctx.db.documents.get(documentId);
        if (!doc || doc.ownerId !== ctx.auth.userId) return;
        const cleanId = cleanUserId(userId);
        if (!cleanId || cleanId === doc.ownerId) return;

        const existing = ctx.db.documentMembers
          .where("documentId", documentId)
          .all()
          .find((member) => member.userId === cleanId);

        const nextRole = cleanRole(role);
        if (existing) {
          ctx.db.documentMembers.update(existing.id, { role: nextRole, displayName: cleanId });
        } else {
          ctx.db.documentMembers.insert({ documentId, userId: cleanId, displayName: cleanId, role: nextRole });
        }
      })
    } : {
      setDocumentReadAccess: mutation((ctx, id: string, access: string) => {
        const doc = ctx.db.documents.get(id);
        if (!doc || doc.ownerId !== ctx.auth.userId) return;
        ctx.db.documents.update(id, { access: cleanReadAccess(access) });
      }),

      inviteViewer: mutation((ctx, documentId: string, userId: string) => {
        const doc = ctx.db.documents.get(documentId);
        if (!doc || doc.ownerId !== ctx.auth.userId) return;
        const cleanId = cleanUserId(userId);
        if (!cleanId || cleanId === doc.ownerId) return;

        const existing = ctx.db.documentMembers
          .where("documentId", documentId)
          .all()
          .find((member) => member.userId === cleanId);

        if (existing) {
          ctx.db.documentMembers.update(existing.id, { role: "viewer", displayName: cleanId });
        } else {
          ctx.db.documentMembers.insert({ documentId, userId: cleanId, displayName: cleanId, role: "viewer" });
        }
      })
    }),

    removeMember: mutation((ctx, memberId: string) => {
      const member = ctx.db.documentMembers.get(memberId);
      if (!member) return;
      const doc = ctx.db.documents.get(member.documentId);
      if (!doc || doc.ownerId !== ctx.auth.userId) return;
      ctx.db.documentMembers.delete(memberId);
    }),

    deleteDocument: mutation((ctx, documentId: string) => {
      const doc = ctx.db.documents.get(documentId);
      if (!doc || doc.ownerId !== ctx.auth.userId) return;

      ctx.db.documentMembers
        .where("documentId", documentId)
        .all()
        .forEach((member) => ctx.db.documentMembers.delete(member.id));
      ctx.db.cursors
        .where("documentId", documentId)
        .all()
        .forEach((cursor) => ctx.db.cursors.delete(cursor.id));
      ctx.db.documents.delete(documentId);
    }),

    ...(COLLAB_FEATURES_ENABLED ? {
      updateCursor: mutation((ctx, documentId: string, x: string, y: string, selection: string) => {
        const doc = ctx.db.documents.get(documentId);
        if (!doc) return;
        const members = ctx.db.documentMembers.where("documentId", documentId).all();
        if (!canEdit(doc, members, ctx.auth.userId)) return;

        const existing = ctx.db.cursors
          .where("documentId", documentId)
          .all()
          .find((cursor) => cursor.userId === ctx.auth.userId);
        const patch = {
          displayName: ctx.auth.displayName,
          picture: ctx.auth.picture ?? "",
          x: cleanCoordinate(x),
          y: cleanCoordinate(y),
          selection: selection.slice(0, 80),
          lastSeenAt: String(Date.now())
        };

        if (existing) {
          ctx.db.cursors.update(existing.id, patch);
        } else {
          ctx.db.cursors.insert({ documentId, userId: ctx.auth.userId, ...patch });
        }
      }),

      deleteCursor: mutation((ctx, documentId: string) => {
        const existing = ctx.db.cursors
          .where("documentId", documentId)
          .all()
          .find((cursor) => cursor.userId === ctx.auth.userId);
        if (existing) {
          ctx.db.cursors.delete(existing.id);
        }
      })
    } : {})
  },

  endpoints: {
    status: endpoint({ method: "GET", path: "/api/status" }, () => text("ok"))
  }
});
