# shared-writing

A Lakebed shared writing capsule with:

- multiple stored documents
- autosaving collaborative editing
- live session pins
- shared cursor presence
- owner/invite/public-view/public-edit access controls
- Google sign-in or local guest identities

Run locally:

```sh
npx lakebed dev
```

Open separate identities to test collaboration:

```txt
http://localhost:3000/?lakebed_guest=alice
http://localhost:3000/?lakebed_guest=bob
```

In the app, copy a user's id from the header/sidebar and invite it to a private document, or switch a document to public view/public edit.

Inspect local state while dev is running:

```sh
npx lakebed db list --port 3000
npx lakebed db dump --port 3000
npx lakebed logs --port 3000
```
