# How to Add Santa Hat and Beard Images

## Steps:

1. **Save your images** in the project folder:
   - Save the Santa hat image as: `santa-hat.png`
   - Save the Santa beard image as: `santa-beard.png`

2. **Location**: Both images should be in the same folder as `index.html`:
   ```
   christmas santa/
   ├── index.html
   ├── server.js
   ├── santa-hat.png    ← Place hat image here
   ├── santa-beard.png  ← Place beard image here
   └── ...
   ```

3. **Image Requirements**:
   - Format: PNG with transparent background (recommended)
   - Hat image: Should be oriented to sit on top of a head
   - Beard image: Should be oriented to sit below the face

4. **Test**:
   - Refresh your browser at http://localhost:3000
   - Login as a user and reveal your Secret Santa
   - The hat and beard should overlay on the person's photo

## Current Setup:
- Font changed to 'Patrick Hand' which supports Lithuanian characters (ė, ū, ą, etc.)
- Images will automatically scale to fit the circular photo
- Hat appears at the top, beard at the bottom
