# FaceLive AI Web — iPhone starter

This is a **working camera prototype**, not a working face-swap engine. It can open the front camera, select a local photo, and attempt experimental face detection only if the browser exposes `FaceDetector`. Safari support is not guaranteed. No image processing model is bundled.

## Publish using GitHub Pages
1. Create a **public** GitHub repository named `FaceLive-AI-Web`.
2. Upload `index.html`, `app.js`, `manifest.webmanifest`, and `.nojekyll` to the repository root (include this README if desired).
3. Go to **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
4. Choose `main` and `/(root)`, then **Save**.
5. Open `https://YOUR-USERNAME.github.io/FaceLive-AI-Web/` in Safari on the iPhone.
6. Grant camera access, then use Safari's Share → Add to Home Screen.

## What works
- Camera preview with `getUserMedia`
- Start/stop controls
- Local photo picker
- Experimental FaceDetector API detection if supported

## What is not implemented
- Realistic photo-based face swapping, Core ML, MediaPipe, recording, RTMP, TikTok or Instagram camera replacement.

GitHub Pages is static hosting. Full neural face swapping in Safari requires a separately licensed browser-compatible model, preprocessing, compositing, and performance validation on device. A website cannot replace the TikTok or Instagram app camera.

Only use facial images with permission, and disclose synthetic appearance in live broadcasts.
