# Sage Multimodal Input - OCR & Speech-to-Text

## Status

✅ **Backend**: Fully implemented
⏳ **UI Integration**: Pending (can be added later)

---

## Overview

Sage now supports multimodal input through two Gemini-powered APIs:

1. **OCR (Optical Character Recognition)** - Extract text and math from images
2. **Speech-to-Text** - Transcribe audio recordings to text

Both features use **Gemini 1.5 Flash** for processing, eliminating the need for separate Google Cloud Vision/Speech APIs.

---

## OCR API

### Endpoint

```
POST /api/sage/ocr
```

### Request

- **Content-Type**: `multipart/form-data`
- **Auth**: Required (authenticated user session)

**Form Data**:
- `image` (File): Image file (JPEG, PNG, WebP)
  - Max size: 5MB
  - Supported: Handwritten notes, textbook pages, whiteboard photos
- `detectMath` (string, optional): `'true'` to extract LaTeX math expressions

### Response

```json
{
  "success": true,
  "text": "Extracted plain text content",
  "math": ["\\frac{x^2}{2}", "y = mx + b"],  // Only if detectMath=true
  "confidence": 0.9,
  "method": "gemini-vision",
  "detectedLanguage": "en"
}
```

### Example Usage

```javascript
// Client-side upload
const formData = new FormData();
formData.append('image', imageFile);
formData.append('detectMath', 'true');

const response = await fetch('/api/sage/ocr', {
  method: 'POST',
  body: formData,
});

const { text, math } = await response.json();
// Use extracted text in Sage chat
```

### Use Cases

- **Handwritten Math**: Student photos homework problem, Sage extracts and solves it
- **Textbook Pages**: Scan textbook pages for quick reference
- **Whiteboard Notes**: Capture classroom whiteboard content
- **Equation Recognition**: LaTeX-formatted math expressions for rendering

---

## Speech-to-Text API

### Endpoint

```
POST /api/sage/transcribe
```

### Request

- **Content-Type**: `multipart/form-data`
- **Auth**: Required (authenticated user session)

**Form Data**:
- `audio` (File): Audio recording
  - Max size: 10MB
  - Formats: WebM, MP3, M4A, WAV
- `language` (string, optional): Language code (default: `'en-GB'`)

### Response

```json
{
  "success": true,
  "text": "Transcribed speech content",
  "confidence": 0.9,
  "method": "gemini-audio",
  "language": "en-GB",
  "duration": 12.5  // Estimated duration in seconds
}
```

### Example Usage

```javascript
// Client-side audio recording
const recorder = new MediaRecorder(stream);
const audioBlob = await recordAudio(); // Get blob from MediaRecorder

const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
formData.append('language', 'en-GB');

const response = await fetch('/api/sage/transcribe', {
  method: 'POST',
  body: formData,
});

const { text } = await response.json();
// Use transcribed text in Sage chat
```

### Use Cases

- **Voice Input**: Students speak their questions instead of typing
- **Accessibility**: Support for users with typing difficulties
- **Language Practice**: Transcribe spoken language for review
- **Hands-Free Learning**: Ask questions while writing or working

---

## Future UI Integration

To add UI components for multimodal input to Sage chat:

### 1. Image Upload Button

Add to `apps/web/src/components/feature/sage/SageChat.tsx` input form:

```tsx
<input
  type="file"
  ref={imageInputRef}
  accept="image/*"
  style={{ display: 'none' }}
  onChange={handleImageUpload}
/>
<button
  type="button"
  onClick={() => imageInputRef.current?.click()}
  aria-label="Upload image"
>
  📸 Image
</button>
```

### 2. Voice Recording Button

```tsx
<button
  type="button"
  onClick={isRecording ? stopRecording : startRecording}
  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
>
  {isRecording ? '⏹️ Stop' : '🎤 Record'}
</button>
```

### 3. Integration Handler

```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);
  formData.append('detectMath', 'true');

  const response = await fetch('/api/sage/ocr', {
    method: 'POST',
    body: formData,
  });

  const { text, math } = await response.json();

  // Send extracted text to Sage
  const message = math?.length
    ? `I have a math problem: ${text}\\n\\nEquations: ${math.join(', ')}`
    : `From image: ${text}`;

  await sendMessage(message);
};
```

---

## Error Handling

### Common Errors

**401 Unauthorized**:
```json
{ "error": "Unauthorized", "code": "UNAUTHORIZED" }
```
→ User must be authenticated

**400 Missing File**:
```json
{ "error": "Image file is required", "code": "MISSING_IMAGE" }
```
→ No file uploaded

**400 File Too Large**:
```json
{ "error": "Image too large (max 5MB)", "code": "FILE_TOO_LARGE" }
```
→ Compress or resize image

**500 Internal Error**:
```json
{ "error": "Internal server error", "code": "INTERNAL_ERROR" }
```
→ Check Gemini API key configuration

---

## Configuration

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

No additional Google Cloud setup required - Gemini handles both vision and audio!

---

## Performance

- **OCR**: ~2-4 seconds per image
- **Transcription**: ~1-3 seconds per 10s of audio
- **Concurrent Requests**: Gemini API supports parallel requests

---

## Limitations

1. **OCR**:
   - Best with clear, well-lit images
   - Handwriting recognition quality varies
   - Complex mathematical diagrams may need manual correction

2. **Speech-to-Text**:
   - Background noise reduces accuracy
   - Accents and dialects may affect transcription
   - Technical terminology may be misrecognized

---

## Next Steps

1. ✅ Backend APIs implemented
2. ⏳ Add UI components to SageChat
3. ⏳ Add file upload indicators and loading states
4. ⏳ Implement client-side audio recording
5. ⏳ Add preview modals for images and audio
6. ⏳ Track usage analytics for multimodal interactions

---

**Status**: Backend ready for production use
**Last Updated**: 2026-02-21
**Version**: 1.0
