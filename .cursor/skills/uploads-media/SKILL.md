---
name: uploads-media
description: >-
  Handles file uploads, /uploads static serving, photoUrl paths, avatar and
  background images. Use when editing uploads route, ImageUploader, multer,
  or UPLOAD_DIR configuration.
---

# Uploads & Media

## Backend

- `backend/src/routes/uploads.ts`
- Static: `app.ts` mounts `/uploads`
- Env: `UPLOAD_DIR` (default `./uploads`)
- Tests: `backend/test/upload.integration.test.ts`, `storage.more.integration.test.ts`

## Frontend

- `frontend/src/components/ImageUploader.tsx`
- `photo` blocks: `/uploads/...` or http(s) URL per SPEC

## Rules

- Validate MIME/size like existing handlers
- Do not commit uploaded binaries
- `npm test` in backend after route changes; frontend build if uploader UI changed
